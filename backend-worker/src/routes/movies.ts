import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc } from 'drizzle-orm';
import { schema } from '../db/schema';
import { tmdbImg } from '../lib/tmdb';

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
    })
    .from(schema.movies)
    .innerJoin(schema.links, eq(schema.movies.id, schema.links.movieId))
    .groupBy(schema.movies.id)
    .orderBy(desc(schema.movies.updatedAt))
    .limit(limit)
    .offset((page - 1) * limit);

  return c.json({
    page,
    results: rows.map(m => ({
      id: m.id,
      tmdb_id: m.tmdbId,
      type: 'movie',
      title: m.title,
      overview: m.overview,
      poster_url: tmdbImg(m.posterPath, 'w500'),
      backdrop_url: tmdbImg(m.backdropPath, 'w780'),
      rating: m.rating,
      release_date: m.releaseDate,
    }))
  });
});

app.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const db = drizzle(c.env.DB, { schema });

  const [movie] = await db.select().from(schema.movies).where(eq(schema.movies.id, id)).limit(1);
  if (!movie) return c.json({ error: 'Movie not found in local database' }, 404);

  const links = await db.select().from(schema.links).where(eq(schema.links.movieId, id));

  return c.json({
    ...movie,
    poster_url: tmdbImg(movie.posterPath, 'w500'),
    backdrop_url: tmdbImg(movie.backdropPath, 'original'),
    links,
  });
});

export default app;
