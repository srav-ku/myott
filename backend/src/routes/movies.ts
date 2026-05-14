import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc } from 'drizzle-orm';
import { schema } from '../db/schema';
import { tmdbFetch, tmdbImg } from '../lib/tmdb';

const app = new Hono<{ Bindings: any }>();

/**
 * GET /api/movies
 * STACK RULE: Runtime NEVER uses TMDB.
 * This route only lists movies that have streaming links available in our DB.
 */
app.get('/', async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const q = c.req.query();
  const page = Math.max(1, Number(q.page) || 1);
  const limit = Math.min(100, Number(q.limit) || 20);

  const rows = await db
    .select({
      id: schema.movies.id,
      tmdbId: schema.movies.tmdbId,
      title: schema.movies.title,
      overview: schema.movies.overview,
      posterPath: schema.movies.posterPath,
      backdropPath: schema.movies.backdropPath,
      rating: schema.movies.rating,
      releaseDate: schema.movies.releaseDate,
      updatedAt: schema.movies.updatedAt,
    })
    .from(schema.movies)
    .orderBy(desc(schema.movies.updatedAt))
    .limit(limit)
    .offset((page - 1) * limit);

  return c.json({
    page,
    results: rows.map(m => ({
      id: m.id,
      tmdb_id: m.tmdbId,
      media_type: 'movie',
      title: m.title,
      overview: m.overview,
      poster_url: tmdbImg(m.posterPath, 'w500'),
      backdrop_url: tmdbImg(m.backdropPath, 'original'),
      vote_average: m.rating,
      release_date: m.releaseDate,
      in_db: true,
    }))
  });
});

app.get('/:tmdbId', async (c) => {
  const tmdbId = Number(c.req.param('tmdbId'));
  const db = drizzle(c.env.DB, { schema });

  let [movie] = await db.select().from(schema.movies).where(eq(schema.movies.tmdbId, tmdbId)).limit(1);
  
  if (!movie) {
    try {
      const detail = await tmdbFetch<any>(`/movie/${tmdbId}`, c.env.TMDB_API_KEY);
      
      const [inserted] = await db.insert(schema.movies).values({
        tmdbId: detail.id,
        imdbId: detail.imdb_id || null,
        title: detail.title,
        overview: detail.overview || null,
        posterPath: detail.poster_path || null,
        backdropPath: detail.backdrop_path || null,
        rating: detail.vote_average || null,
        releaseDate: detail.release_date || null,
        releaseYear: detail.release_date ? Number(detail.release_date.slice(0, 4)) : null,
        runtime: detail.runtime || null,
        genres: (detail.genres || []).map((g: any) => g.name),
      }).returning();
      movie = inserted;
    } catch (err: any) {
      console.error(`[movies] Failed to process TMDB ID ${tmdbId}:`, err);
      return c.json({ 
        error: `Backend Error: ${err.message || 'Unknown error during ingest'}`,
        tmdbId 
      }, 500);
    }
  }

  const links = await db.select().from(schema.links).where(eq(schema.links.movieId, movie.id));

  return c.json({
    id: movie.id,
    tmdb_id: movie.tmdbId,
    title: movie.title,
    overview: movie.overview,
    poster_url: tmdbImg(movie.posterPath, 'w500'),
    backdrop_url: tmdbImg(movie.backdropPath, 'original'),
    release_year: movie.releaseYear,
    links,
  });
});

export default app;
