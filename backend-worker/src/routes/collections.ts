import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc, and, isNotNull } from 'drizzle-orm';
import { schema } from '../db/schema';

const app = new Hono<{ Bindings: any; Variables: { user: any } }>();

// Public listing (or User's own collections if authenticated)
app.get('/', async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const user = c.get('user');

  let query = db.select().from(schema.collections);
  
  if (user) {
    // If logged in, show user's collections with basic item info
    const rows = await db.select().from(schema.collections)
      .where(eq(schema.collections.userId, user.id))
      .orderBy(desc(schema.collections.createdAt))
      .limit(50);
    
    const results = await Promise.all(rows.map(async (col) => {
      const items = await db.select({
        id: schema.collectionItems.id,
        movieId: schema.collectionItems.movieId,
        tvId: schema.collectionItems.tvId
      })
      .from(schema.collectionItems)
      .where(eq(schema.collectionItems.collectionId, col.id));
      
      // Map to frontend expected format (just IDs are enough for checkbox)
      return { 
        ...col, 
        items: items.map(i => ({
          id: i.id,
          type: i.movieId ? 'movie' : 'tv',
          media: { id: i.movieId || i.tvId } // Minimum media object for ID check
        }))
      };
    }));

    return c.json({ results });
  } else {
    // If not logged in, maybe show some public/featured collections?
    // For now just return empty or recent.
    const rows = await query.orderBy(desc(schema.collections.createdAt)).limit(20);
    return c.json({ results: rows });
  }
});

// Single collection with full media details
app.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const db = drizzle(c.env.DB, { schema });
  const [collection] = await db.select().from(schema.collections).where(eq(schema.collections.id, id)).limit(1);
  if (!collection) return c.json({ error: 'Collection not found' }, 404);
  
  // Fetch items with media details, sorted by recently added
  const movieItems = await db.select({
    id: schema.collectionItems.id,
    movieId: schema.collectionItems.movieId,
    movie: schema.movies,
    addedAt: schema.collectionItems.createdAt
  })
  .from(schema.collectionItems)
  .leftJoin(schema.movies, eq(schema.collectionItems.movieId, schema.movies.id))
  .where(and(
    eq(schema.collectionItems.collectionId, id),
    isNotNull(schema.collectionItems.movieId)
  ))
  .orderBy(desc(schema.collectionItems.createdAt));

  const tvItems = await db.select({
    id: schema.collectionItems.id,
    tvId: schema.collectionItems.tvId,
    tvShow: schema.tv,
    addedAt: schema.collectionItems.createdAt
  })
  .from(schema.collectionItems)
  .leftJoin(schema.tv, eq(schema.collectionItems.tvId, schema.tv.id))
  .where(and(
    eq(schema.collectionItems.collectionId, id),
    isNotNull(schema.collectionItems.tvId)
  ))
  .orderBy(desc(schema.collectionItems.createdAt));

  const items = [...movieItems, ...tvItems]
    .sort((a, b) => {
      const dateA = a.addedAt ? new Date(a.addedAt).getTime() : 0;
      const dateB = b.addedAt ? new Date(b.addedAt).getTime() : 0;
      return dateB - dateA;
    })
    .map(item => ({
      id: item.id,
      type: (item as any).movieId ? 'movie' : 'tv',
      media: (item as any).movie || (item as any).tvShow
    }));

  return c.json({ ...collection, items });
});

// Remove item from collection (Protected)
app.delete('/:id/items/:itemId', async (c: any) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const collId = Number(c.req.param('id'));
  const itemId = Number(c.req.param('itemId'));
  const db = drizzle(c.env.DB, { schema });

  const [coll] = await db.select().from(schema.collections).where(eq(schema.collections.id, collId)).limit(1);
  if (!coll) return c.json({ error: 'Collection not found' }, 404);
  if (coll.userId !== user.id) return c.json({ error: 'Forbidden' }, 403);

  await db.delete(schema.collectionItems)
    .where(and(
      eq(schema.collectionItems.id, itemId),
      eq(schema.collectionItems.collectionId, collId)
    ));

  return c.json({ success: true });
});

// Create collection (Protected)
app.post('/', async (c: any) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const { name } = await c.req.json();
  const db = drizzle(c.env.DB, { schema });

  const [newColl] = await db.insert(schema.collections)
    .values({ userId: user.id, name })
    .returning();

  return c.json(newColl);
});

// Delete collection (Protected)
app.delete('/:id', async (c: any) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = Number(c.req.param('id'));
  const db = drizzle(c.env.DB, { schema });

  const [coll] = await db.select().from(schema.collections).where(eq(schema.collections.id, id)).limit(1);
  if (!coll) return c.json({ error: 'Not found' }, 404);
  if (coll.userId !== user.id) return c.json({ error: 'Forbidden' }, 403);

  await db.delete(schema.collections).where(eq(schema.collections.id, id));
  return c.json({ success: true });
});

// Add item to collection (Protected)
app.post('/:id/items', async (c: any) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const collId = Number(c.req.param('id'));
  const { movie_id, tv_id } = await c.req.json();
  const db = drizzle(c.env.DB, { schema });

  const [coll] = await db.select().from(schema.collections).where(eq(schema.collections.id, collId)).limit(1);
  if (!coll) return c.json({ error: 'Collection not found' }, 404);
  if (coll.userId !== user.id) return c.json({ error: 'Forbidden' }, 403);

  // Prevent duplicates
  const existing = await db.select()
    .from(schema.collectionItems)
    .where(and(
      eq(schema.collectionItems.collectionId, collId),
      movie_id ? eq(schema.collectionItems.movieId, movie_id) : eq(schema.collectionItems.tvId, tv_id)
    ))
    .limit(1);

  if (existing.length > 0) {
    return c.json(existing[0]); // Already exists, return existing
  }

  const [newItem] = await db.insert(schema.collectionItems)
    .values({ 
      collectionId: collId, 
      movieId: movie_id || null, 
      tvId: tv_id || null 
    })
    .returning();

  return c.json(newItem);
});

export default app;
