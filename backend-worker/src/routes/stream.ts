import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { schema } from '../db/schema';
import { callExtractor } from '../lib/extractor';

const app = new Hono<{ Bindings: any }>();

/**
 * GET /api/stream/movie/:id
 * Returns all links for a specific movie.
 */
app.get('/movie/:id', async (c: any) => {
  const movieId = Number(c.req.param('id'));
  const db = drizzle(c.env.DB, { schema });

  const links = await db.select().from(schema.links)
    .where(eq(schema.links.movieId, movieId));

  if (links.length === 0) return c.json({ error: 'NO_LINKS_FOUND' }, 404);
  return c.json(links);
});

/**
 * GET /api/stream/episode/:id
 * Returns all links for a specific episode.
 */
app.get('/episode/:id', async (c: any) => {
  const episodeId = Number(c.req.param('id'));
  const db = drizzle(c.env.DB, { schema });

  const links = await db.select().from(schema.links)
    .where(eq(schema.links.episodeId, episodeId));

  if (links.length === 0) return c.json({ error: 'NO_LINKS_FOUND' }, 404);
  return c.json(links);
});

/**
 * GET /api/stream/:linkId
 * Resolves a specific link (handles extraction).
 */
app.get('/:linkId', async (c: any) => {
  const user = c.get('user');

  const linkId = Number(c.req.param('linkId'));
  if (isNaN(linkId)) return c.json({ error: 'INVALID_LINK_ID' }, 400);

  const db = drizzle(c.env.DB, { schema });

  const [link] = await db.select().from(schema.links).where(eq(schema.links.id, linkId)).limit(1);
  if (!link) return c.json({ error: 'LINK_NOT_FOUND' }, 404);

  // 1. Direct links return immediately
  if (link.type === 'direct') {
    return c.json({ url: link.url, type: 'file', error: null });
  }

  // 2. Check Cache (Extracted URL + Not Expired)
  if (link.extractedUrl && link.expiresAt) {
    const expiry = new Date(link.expiresAt).getTime();
    if (expiry > Date.now()) {
      return c.json({ 
        url: link.extractedUrl, 
        type: link.extractedUrl.includes('embed') ? 'embed' : 'file', 
        error: null 
      });
    }
  }

  // 3. Cache Miss - Call Extractor
  const result = await callExtractor(link.url, c.env.EXTRACTOR_URL, c.env.EXTRACTOR_API_KEY);
  
  if (result?.stream_url) {
    // Default TTL: 6 hours if extractor doesn't provide one
    const expiresAt = result.expires_at 
      ? new Date(result.expires_at * 1000) 
      : new Date(Date.now() + 6 * 3600 * 1000);
    
    // Update DB (Non-blocking update can be used but here we wait for consistency)
    await db.update(schema.links).set({
      extractedUrl: result.stream_url,
      expiresAt,
      updatedAt: new Date(),
    }).where(eq(schema.links.id, linkId));

    return c.json({ 
      url: result.stream_url, 
      type: result.type === 'embed' ? 'embed' : 'file', 
      error: null 
    });
  }

  return c.json({ url: null, type: null, error: 'EXTRACTION_FAILED' }, 500);
});

export default app;
