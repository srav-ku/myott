import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, desc, sql } from 'drizzle-orm';
import { schema } from '../db/schema';
import { tmdbImg } from '../lib/tmdb';

const app = new Hono<{ 
  Bindings: any;
  Variables: {
    user: any;
  };
}>();

// All routes here require authentication (handled by index.ts middleware)

app.get('/', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB, { schema });

  const colls = await db
    .select()
    .from(schema.collections)
    .where(eq(schema.collections.userId, user.id))
    .orderBy(desc(schema.collections.updatedAt));

  const results = await Promise.all(colls.map(async (col) => {
    const items = await db
      .select()
      .from(schema.collectionItems)
      .where(eq(schema.collectionItems.collectionId, col.id))
      .orderBy(schema.collectionItems.orderIndex);

    const fullItems = await Promise.all(items.map(async (item) => {
      let media: any = null;
      let type = 'movie';
      if (item.movieId) {
        const [m] = await db.select().from(schema.movies).where(eq(schema.movies.id, item.movieId)).limit(1);
        media = m;
        type = 'movie';
      } else if (item.tvId) {
        const [t] = await db.select().from(schema.tv).where(eq(schema.tv.id, item.tvId)).limit(1);
        media = t;
        type = 'tv';
      }

      if (!media) return null;

      return {
        id: item.id,
        type: type,
        media: {
          id: media.id,
          tmdb_id: media.tmdbId,
          title: media.title || media.name,
          poster_url: tmdbImg(media.posterPath, 'w500'),
          backdrop_url: tmdbImg(media.backdropPath, 'original'),
          rating: media.rating,
        }
      };
    }));

    return {
      id: col.id,
      name: col.name,
      items: fullItems.filter(i => i !== null),
    };
  }));

  return c.json(results);
});

app.post('/', async (c) => {
  const user = c.get('user');
  const { name } = await c.req.json();
  const db = drizzle(c.env.DB, { schema });

  const [inserted] = await db.insert(schema.collections).values({
    userId: user.id,
    name: name,
  }).returning();

  return c.json({
    id: inserted.id,
    name: inserted.name,
    items: [],
  });
});

app.get('/:id', async (c) => {
  const user = c.get('user');
  const id = Number(c.req.param('id'));
  const db = drizzle(c.env.DB, { schema });

  const [col] = await db
    .select()
    .from(schema.collections)
    .where(and(eq(schema.collections.id, id), eq(schema.collections.userId, user.id)))
    .limit(1);

  if (!col) return c.json({ error: 'Not Found' }, 404);

  const items = await db
    .select()
    .from(schema.collectionItems)
    .where(eq(schema.collectionItems.collectionId, col.id))
    .orderBy(schema.collectionItems.orderIndex);

  const fullItems = await Promise.all(items.map(async (item) => {
    let media: any = null;
    let type = 'movie';
    if (item.movieId) {
      const [m] = await db.select().from(schema.movies).where(eq(schema.movies.id, item.movieId)).limit(1);
      media = m;
      type = 'movie';
    } else if (item.tvId) {
      const [t] = await db.select().from(schema.tv).where(eq(schema.tv.id, item.tvId)).limit(1);
      media = t;
      type = 'tv';
    }

    if (!media) return null;

    return {
      id: item.id,
      type: type,
      media: {
        id: media.id,
        tmdb_id: media.tmdbId,
        title: media.title || media.name,
        poster_url: tmdbImg(media.posterPath, 'w500'),
        backdrop_url: tmdbImg(media.backdropPath, 'original'),
        rating: media.rating,
      }
    };
  }));

  return c.json({
    id: col.id,
    name: col.name,
    items: fullItems.filter(i => i !== null),
  });
});


app.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = Number(c.req.param('id'));
  const db = drizzle(c.env.DB, { schema });

  await db.delete(schema.collections).where(
    and(eq(schema.collections.id, id), eq(schema.collections.userId, user.id))
  );

  return c.json({ success: true });
});

app.post('/:id/items', async (c) => {
  const user = c.get('user');
  const id = Number(c.req.param('id'));
  const { movie_id, tv_id } = await c.req.json();
  const db = drizzle(c.env.DB, { schema });

  // Verify ownership
  const [col] = await db
    .select()
    .from(schema.collections)
    .where(and(eq(schema.collections.id, id), eq(schema.collections.userId, user.id)))
    .limit(1);

  if (!col) return c.json({ error: 'Forbidden' }, 403);

  await db.insert(schema.collectionItems).values({
    collectionId: id,
    movieId: movie_id || null,
    tvId: tv_id || null,
  });

  return c.json({ success: true });
});

app.delete('/:id/items/:itemId', async (c) => {
  const user = c.get('user');
  const id = Number(c.req.param('id'));
  const itemId = Number(c.req.param('itemId'));
  const db = drizzle(c.env.DB, { schema });

  // Verify ownership
  const [col] = await db
    .select()
    .from(schema.collections)
    .where(and(eq(schema.collections.id, id), eq(schema.collections.userId, user.id)))
    .limit(1);

  if (!col) return c.json({ error: 'Forbidden' }, 403);

  await db.delete(schema.collectionItems).where(
    and(eq(schema.collectionItems.id, itemId), eq(schema.collectionItems.collectionId, id))
  );

  return c.json({ success: true });
});

export default app;
