import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc } from 'drizzle-orm';
import { schema } from '../db/schema';

const app = new Hono<{ Bindings: any }>();

app.get('/me', async (c: any) => {
  const user = c.get('user');
  return c.json({
    isAdmin: !!user.isAdmin,
    adminMode: 'open',
    user: { stealthMode: !!user.stealthMode }
  });
});

app.get('/history', async (c: any) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB, { schema });

  const rows = await db.select().from(schema.history)
    .where(eq(schema.history.userId, user.id))
    .orderBy(desc(schema.history.playedAt))
    .limit(20);

  return c.json(rows);
});

export default app;
