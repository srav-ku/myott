import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc } from 'drizzle-orm';
import { schema } from '../db/schema';

const app = new Hono<{ Bindings: any; Variables: { user: any } }>();

// Public listing (or User's own collections if authenticated)
app.get('/', async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const user = c.get('user');

  let query = db.select().from(schema.collections);
  
  if (user) {
    // If logged in, show user's collections
    const rows = await query.where(eq(schema.collections.userId, user.id))
      .orderBy(desc(schema.collections.createdAt))
      .limit(50);
    return c.json({ results: rows });
  } else {
    // If not logged in, maybe show some public/featured collections?
    // For now just return empty or recent.
    const rows = await query.orderBy(desc(schema.collections.createdAt)).limit(20);
    return c.json({ results: rows });
  }
});

// Single collection
app.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const db = drizzle(c.env.DB, { schema });
  const [collection] = await db.select().from(schema.collections).where(eq(schema.collections.id, id)).limit(1);
  if (!collection) return c.json({ error: 'Collection not found' }, 404);
  
  const items = await db.select().from(schema.collectionItems).where(eq(schema.collectionItems.collectionId, id));
  return c.json({ ...collection, items });
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
