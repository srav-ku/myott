import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { sql, eq, inArray, and } from 'drizzle-orm';
import { schema } from '../db/schema';
import { tmdbFetch } from '../lib/tmdb';

const app = new Hono<{ Bindings: any, Variables: { user: any } }>();

app.use('*', async (c, next) => {
  const user = c.get('user');
  if (!user?.isAdmin) return c.json({ error: 'Forbidden' }, 403);
  await next();
});

app.get('/stats', async (c: any) => {
  const db = drizzle(c.env.DB, { schema });
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

app.post('/ingest', async (c: any) => {
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
      set: { rating: detail.vote_average, updatedAt: sql`(unixepoch())` },
    });
    return c.json({ success: true, message: `Ingested movie: ${detail.title}` });
  }
  return c.json({ error: 'Type not supported yet' }, 400);
});

// BULK IMPORT
app.post('/import/movie', async (c: any) => {
  const db = drizzle(c.env.DB, { schema });
  const csvText = await c.req.text();
  
  if (!csvText.trim()) return c.json({ error: 'Empty CSV' }, 400);

  const lines = csvText.split('\n').map((l: string) => l.trim()).filter(Boolean);
  const headerLine = lines[0].toLowerCase();
  
  // Auto-detect if it's Tab-separated (TSV) or Comma-separated (CSV)
  const separator = headerLine.includes('\t') ? '\t' : ',';
  const headers = headerLine.split(separator).map((h: string) => h.trim());
  
  const tmdbIdx = headers.indexOf('tmdb_id');
  const urlIdx = headers.indexOf('stream_url');
  const qualIdx = headers.indexOf('quality');
  const langIdx = headers.indexOf('languages');
  const typeIdx = headers.indexOf('type');

  if (tmdbIdx === -1 || urlIdx === -1) {
    return c.json({ error: `Missing required columns: tmdb_id, stream_url. (Detected separator: ${separator === '\t' ? 'TAB' : 'COMMA'})` }, 400);
  }

  let added = 0;
  let skipped = 0;
  let failed = 0;
  const errors: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1;
    // Simple CSV/TSV parser
    const row = lines[i].split(separator).map((col: string) => col.trim());
    if (row.length < 2) continue;

    try {
      const tmdbId = Number(row[tmdbIdx]);
      const url = row[urlIdx];
      const quality = qualIdx !== -1 && row[qualIdx] ? row[qualIdx] : '1080p';
      const type = typeIdx !== -1 && row[typeIdx] ? row[typeIdx].toLowerCase() : 'direct';
      const langStr = langIdx !== -1 ? row[langIdx] : '';
      const languages = langStr ? langStr.split('|').map((l: string) => l.trim()).filter(Boolean) : [];

      if (!tmdbId || isNaN(tmdbId)) throw new Error('Invalid TMDB ID');
      if (!url) throw new Error('Missing URL');

      // Check if movie exists
      let [movie] = await db.select().from(schema.movies).where(eq(schema.movies.tmdbId, tmdbId)).limit(1);
      
      if (!movie) {
        // Auto-ingest missing movie
        const detail = await tmdbFetch<any>(`/movie/${tmdbId}`, c.env.TMDB_API_KEY);
        if (!detail.id) throw new Error('Movie not found on TMDB');
        
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
      }

      // Check for duplicate link
      const existing = await db.select().from(schema.links).where(and(
        eq(schema.links.movieId, movie.id),
        eq(schema.links.url, url)
      )).limit(1);

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      // Add new languages
      for (const l of languages) {
        await db.insert(schema.languages).values({ name: l }).onConflictDoNothing();
      }

      // Insert link
      await db.insert(schema.links).values({
        movieId: movie.id,
        url,
        quality: quality as any,
        type: type as any,
        languages,
      });
      
      added++;
    } catch (err: any) {
      failed++;
      errors.push({ row: rowNum, reason: err.message || 'Unknown error' });
    }
  }

  return c.json({ success: true, added, skipped, failed, errors });
});

// MOVIES
app.delete('/movies/:id', async (c: any) => {
  const db = drizzle(c.env.DB, { schema });
  await db.delete(schema.movies).where(eq(schema.movies.id, Number(c.req.param('id'))));
  return c.json({ ok: true });
});

// TV
app.delete('/tv/:id', async (c: any) => {
  const db = drizzle(c.env.DB, { schema });
  await db.delete(schema.tv).where(eq(schema.tv.id, Number(c.req.param('id'))));
  return c.json({ ok: true });
});

app.get('/tv/:id/episodes', async (c: any) => {
  const db = drizzle(c.env.DB, { schema });
  const tvId = Number(c.req.param('id'));
  const eps = await db.select().from(schema.episodes).where(eq(schema.episodes.tvId, tvId));
  if (eps.length === 0) return c.json({ episodes: [] });
  
  const epIds = eps.map(e => e.id);
  const lns = await db.select().from(schema.links).where(inArray(schema.links.episodeId, epIds));
  
  const grouped = eps.map(ep => ({
    ...ep,
    links: lns.filter(l => l.episodeId === ep.id),
  }));
  return c.json({ episodes: grouped });
});

app.post('/tv/:id/episodes', async (c: any) => {
  const db = drizzle(c.env.DB, { schema });
  const tvId = Number(c.req.param('id'));
  const body = await c.req.json();
  const [inserted] = await db.insert(schema.episodes).values({
    tvId,
    seasonNumber: body.season_number,
    episodeNumber: body.episode_number,
    title: body.title || null,
    overview: body.overview || null,
  }).returning();
  return c.json({ episode: inserted }, 201);
});

app.delete('/tv/:tvId/episodes/:episodeId', async (c: any) => {
  const db = drizzle(c.env.DB, { schema });
  await db.delete(schema.episodes).where(eq(schema.episodes.id, Number(c.req.param('episodeId'))));
  return c.json({ ok: true });
});

// LINKS
app.get('/links', async (c: any) => {
  const db = drizzle(c.env.DB, { schema });
  const movieId = Number(c.req.query('movie_id') || 0);
  const episodeId = Number(c.req.query('episode_id') || 0);
  
  const rows = movieId 
    ? await db.select().from(schema.links).where(eq(schema.links.movieId, movieId))
    : episodeId
    ? await db.select().from(schema.links).where(eq(schema.links.episodeId, episodeId))
    : await db.select().from(schema.links);
  return c.json({ links: rows });
});

app.post('/links', async (c: any) => {
  const db = drizzle(c.env.DB, { schema });
  const data = await c.req.json();
  const [inserted] = await db.insert(schema.links).values({
    movieId: data.movie_id || null,
    episodeId: data.episode_id || null,
    quality: data.quality,
    type: data.type,
    url: data.url,
    languages: data.languages || [],
  }).returning();
  return c.json({ link: inserted }, 201);
});

app.patch('/links/:id', async (c: any) => {
  const db = drizzle(c.env.DB, { schema });
  const data = await c.req.json();
  const [updated] = await db.update(schema.links).set({
    quality: data.quality,
    url: data.url,
    languages: data.languages || [],
    updatedAt: sql`(unixepoch())`
  }).where(eq(schema.links.id, Number(c.req.param('id')))).returning();
  return c.json({ link: updated });
});

app.delete('/links/:id', async (c: any) => {
  const db = drizzle(c.env.DB, { schema });
  await db.delete(schema.links).where(eq(schema.links.id, Number(c.req.param('id'))));
  return c.json({ ok: true });
});

// LANGUAGES
app.get('/languages', async (c: any) => {
  const db = drizzle(c.env.DB, { schema });
  const rows = await db.select().from(schema.languages);
  return c.json({ languages: rows.map(r => r.name) });
});

app.post('/languages', async (c: any) => {
  const db = drizzle(c.env.DB, { schema });
  const { name } = await c.req.json();
  await db.insert(schema.languages).values({ name }).onConflictDoNothing();
  return c.json({ ok: true });
});

export default app;
