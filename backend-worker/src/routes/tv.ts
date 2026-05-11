import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc } from 'drizzle-orm';
import { schema } from '../db/schema';
import { tmdbImg } from '../lib/tmdb';

const app = new Hono<{ Bindings: any }>();

app.get('/', async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const q = c.req.query();
  const page = Math.max(1, Number(q.page) || 1);
  const limit = Math.min(100, Number(q.limit) || 20);

  // Runtime rule: Local DB only
  const rows = await db
    .select({
      id: schema.tv.id,
      tmdbId: schema.tv.tmdbId,
      name: schema.tv.name,
      overview: schema.tv.overview,
      posterPath: schema.tv.posterPath,
      backdropPath: schema.tv.backdropPath,
      rating: schema.tv.rating,
      firstAirDate: schema.tv.firstAirDate,
    })
    .from(schema.tv)
    .orderBy(desc(schema.tv.updatedAt))
    .limit(limit)
    .offset((page - 1) * limit);

  return c.json({
    page,
    results: rows.map(t => ({
      id: t.id,
      tmdb_id: t.tmdbId,
      type: 'tv',
      name: t.name,
      overview: t.overview,
      poster_url: tmdbImg(t.posterPath, 'w500'),
      backdrop_url: tmdbImg(t.backdropPath, 'w780'),
      rating: t.rating,
      release_date: t.firstAirDate,
    }))
  });
});

app.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const db = drizzle(c.env.DB, { schema });

  const [series] = await db.select().from(schema.tv).where(eq(schema.tv.id, id)).limit(1);
  if (!series) return c.json({ error: 'TV Show not found' }, 404);

  const episodes = await db.select().from(schema.episodes).where(eq(schema.episodes.tvId, id));

  return c.json({
    ...series,
    poster_url: tmdbImg(series.posterPath, 'w500'),
    backdrop_url: tmdbImg(series.backdropPath, 'original'),
    episodes,
  });
});

export default app;
