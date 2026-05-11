import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc } from 'drizzle-orm';
import { schema } from '../db/schema';

const app = new Hono<{ Bindings: any }>();

// Public listing
app.get('/', async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const rows = await db.select().from(schema.collections).orderBy(desc(schema.collections.createdAt)).limit(50);
  return c.json({ results: rows });
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

export default app;
