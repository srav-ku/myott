import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { sql } from 'drizzle-orm';
import { schema } from '../db/schema';
import { tmdbFetch } from '../lib/tmdb';

const app = new Hono<{ Bindings: any }>();

/**
 * GET /api/admin/stats
 */
app.get('/stats', async (c: any) => {
  const user = c.get('user');
  if (!user.isAdmin) return c.json({ error: 'Forbidden' }, 403);

  const db = drizzle(c.env.DB, { schema });
  
  // Use simple queries for stats
  const [movieCount] = await db.select({ count: sql`count(*)` }).from(schema.movies);
  const [tvCount] = await db.select({ count: sql`count(*)` }).from(schema.tv);
  const [userCount] = await db.select({ count: sql`count(*)` }).from(schema.users);

  return c.json({
    stats: {
      movies: Number(movieCount?.count || 0),
      tv: Number(tvCount?.count || 0),
      users: Number(userCount?.count || 0),
    }
  });
});

/**
 * POST /api/admin/ingest
 * ONLY place where TMDB calls are allowed.
 */
app.post('/ingest', async (c: any) => {
  const user = c.get('user');
  if (!user.isAdmin) return c.json({ error: 'Forbidden' }, 403);

  const { tmdbId, type } = await c.req.json();
  const db = drizzle(c.env.DB, { schema });

  if (type === 'movie') {
    const detail = await tmdbFetch<any>(`/movie/${tmdbId}`, c.env.TMDB_API_KEY);
    
    await db.insert(schema.movies).values({
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
    }).onConflictDoUpdate({
      target: schema.movies.tmdbId,
      set: { 
        rating: detail.vote_average, 
        updatedAt: sql`(unixepoch())` 
      },
    });

    return c.json({ success: true, message: `Ingested movie: ${detail.title}` });
  }

  // Add TV ingestion here...
  return c.json({ error: 'Type not supported yet' }, 400);
});

export default app;
