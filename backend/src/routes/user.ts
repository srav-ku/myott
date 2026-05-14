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

app.get('/me', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Not Found' }, 404);
  
  return c.json({
    isAdmin: !!user.isAdmin,
    adminMode: 'restricted',
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      photoUrl: user.photoUrl,
      stealthMode: false
    }
  });
});

/* -------------------------------------------------------------------------- */
/*                                  WATCHLIST                                 */
/* -------------------------------------------------------------------------- */

app.get('/watchlist', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB, { schema });

  const rows = await db
    .select()
    .from(schema.watchlist)
    .where(eq(schema.watchlist.userId, user.id))
    .orderBy(desc(schema.watchlist.createdAt));

  const results = await Promise.all(rows.map(async (row) => {
    let media: any = null;
    if (row.contentType === 'movie') {
      const [m] = await db.select().from(schema.movies).where(eq(schema.movies.id, row.contentId)).limit(1);
      if (m) {
        media = {
          id: m.id,
          tmdb_id: m.tmdbId,
          title: m.title,
          overview: m.overview,
          poster_url: tmdbImg(m.posterPath, 'w500'),
          backdrop_url: tmdbImg(m.backdropPath, 'original'),
          rating: m.rating,
          release_date: m.releaseDate,
        };
      }
    } else {
      const [t] = await db.select().from(schema.tv).where(eq(schema.tv.id, row.contentId)).limit(1);
      if (t) {
        media = {
          id: t.id,
          tmdb_id: t.tmdbId,
          name: t.name,
          overview: t.overview,
          poster_url: tmdbImg(t.posterPath, 'w500'),
          backdrop_url: tmdbImg(t.backdropPath, 'original'),
          rating: t.rating,
          first_air_date: t.firstAirDate,
        };
      }
    }

    return {
      id: row.id,
      type: row.contentType,
      media: media
    };
  }));

  return c.json(results.filter(r => r.media !== null));
});

app.post('/watchlist', async (c) => {
  const user = c.get('user');
  const { id, type } = await c.req.json();
  const db = drizzle(c.env.DB, { schema });

  await db.insert(schema.watchlist).values({
    userId: user.id,
    contentType: type,
    contentId: id,
  }).onConflictDoNothing();

  return c.json({ success: true });
});

app.delete('/watchlist', async (c) => {
  const user = c.get('user');
  const { id, type } = await c.req.json();
  const db = drizzle(c.env.DB, { schema });

  await db.delete(schema.watchlist).where(
    and(
      eq(schema.watchlist.userId, user.id),
      eq(schema.watchlist.contentType, type),
      eq(schema.watchlist.contentId, id)
    )
  );

  return c.json({ success: true });
});

// Fallback for DELETE /watchlist/:id
app.delete('/watchlist/:id', async (c) => {
  const user = c.get('user');
  const id = Number(c.req.param('id'));
  const type = c.req.query('type') as 'movie' | 'tv';
  const db = drizzle(c.env.DB, { schema });

  await db.delete(schema.watchlist).where(
    and(
      eq(schema.watchlist.userId, user.id),
      eq(schema.watchlist.contentType, type),
      eq(schema.watchlist.contentId, id)
    )
  );

  return c.json({ success: true });
});

/* -------------------------------------------------------------------------- */
/*                                   WATCHED                                  */
/* -------------------------------------------------------------------------- */

app.get('/watched', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB, { schema });

  const rows = await db
    .select()
    .from(schema.watched)
    .where(eq(schema.watched.userId, user.id))
    .orderBy(desc(schema.watched.createdAt));

  const results = await Promise.all(rows.map(async (row) => {
    let media: any = null;
    let type = 'movie';
    let mediaId = 0;
    
    if (row.movieId) {
      const [m] = await db.select().from(schema.movies).where(eq(schema.movies.id, row.movieId)).limit(1);
      if (m) {
        media = m;
        type = 'movie';
        mediaId = m.id;
      }
    } else if (row.episodeId) {
      const [ep] = await db.select().from(schema.episodes).where(eq(schema.episodes.id, row.episodeId)).limit(1);
      if (ep) {
        const [t] = await db.select().from(schema.tv).where(eq(schema.tv.id, ep.tvId)).limit(1);
        media = t;
        type = 'tv';
        mediaId = t.id;
      }
    }

    if (!media) return null;

    return {
      id: row.id,
      mediaId: mediaId,
      episodeId: row.episodeId,
      type: type,
      status: 'watched',
      updatedAt: Math.floor(row.createdAt.getTime() / 1000),
      movie: type === 'movie' ? {
        id: media.id,
        tmdb_id: media.tmdbId,
        title: media.title,
        poster_url: tmdbImg(media.posterPath, 'w500'),
        backdrop_url: tmdbImg(media.backdropPath, 'original'),
        rating: media.rating,
      } : null,
      tvShow: type === 'tv' ? {
        id: media.id,
        tmdb_id: media.tmdbId,
        name: media.name,
        poster_url: tmdbImg(media.posterPath, 'w500'),
        backdrop_url: tmdbImg(media.backdropPath, 'original'),
        rating: media.rating,
      } : null,
      season_number: row.seasonNumber,
      episode_number: row.episodeNumber,
    };
  }));

  return c.json(results.filter(r => r !== null));
});

app.post('/watched', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const db = drizzle(c.env.DB, { schema });

  if (body.movie_id) {
    await db.insert(schema.watched).values({
      userId: user.id,
      movieId: body.movie_id,
      seasonNumber: body.season_number || null,
      episodeNumber: body.episode_number || null,
    }).onConflictDoUpdate({
      target: [schema.watched.userId, schema.watched.movieId],
      set: { createdAt: sql`(unixepoch())` }
    });
  } else if (body.episode_id) {
    await db.insert(schema.watched).values({
      userId: user.id,
      episodeId: body.episode_id,
      seasonNumber: body.season_number || null,
      episodeNumber: body.episode_number || null,
    }).onConflictDoUpdate({
      target: [schema.watched.userId, schema.watched.episodeId],
      set: { createdAt: sql`(unixepoch())` }
    });
  }

  return c.json({ success: true });
});

app.delete('/watched', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const db = drizzle(c.env.DB, { schema });

  if (body.movie_id) {
    await db.delete(schema.watched).where(
      and(eq(schema.watched.userId, user.id), eq(schema.watched.movieId, body.movie_id))
    );
  } else if (body.episode_id) {
    await db.delete(schema.watched).where(
      and(eq(schema.watched.userId, user.id), eq(schema.watched.episodeId, body.episode_id))
    );
  }

  return c.json({ success: true });
});

/* -------------------------------------------------------------------------- */
/*                                   HISTORY                                  */
/* -------------------------------------------------------------------------- */

app.get('/history', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB, { schema });

  const rows = await db
    .select()
    .from(schema.history)
    .where(eq(schema.history.userId, user.id))
    .orderBy(desc(schema.history.playedAt));

  const results = await Promise.all(rows.map(async (row) => {
    let media: any = null;
    let type = 'movie';
    let mediaId = 0;
    
    if (row.movieId) {
      const [m] = await db.select().from(schema.movies).where(eq(schema.movies.id, row.movieId)).limit(1);
      if (m) {
        media = m;
        type = 'movie';
        mediaId = m.id;
      }
    } else if (row.episodeId) {
      const [ep] = await db.select().from(schema.episodes).where(eq(schema.episodes.id, row.episodeId)).limit(1);
      if (ep) {
        const [t] = await db.select().from(schema.tv).where(eq(schema.tv.id, ep.tvId)).limit(1);
        media = t;
        type = 'tv';
        mediaId = t.id;
      }
    }

    if (!media) return null;

    return {
      id: row.id,
      mediaId: mediaId,
      episodeId: row.episodeId,
      type: type,
      status: 'watching',
      updatedAt: Math.floor(row.playedAt.getTime() / 1000),
      movie: type === 'movie' ? {
        id: media.id,
        tmdb_id: media.tmdbId,
        title: media.title,
        poster_url: tmdbImg(media.posterPath, 'w500'),
        backdrop_url: tmdbImg(media.backdropPath, 'original'),
        rating: media.rating,
      } : null,
      tvShow: type === 'tv' ? {
        id: media.id,
        tmdb_id: media.tmdbId,
        name: media.name,
        poster_url: tmdbImg(media.posterPath, 'w500'),
        backdrop_url: tmdbImg(media.backdropPath, 'original'),
        rating: media.rating,
      } : null,
    };
  }));

  return c.json(results.filter(r => r !== null));
});

app.post('/history', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const db = drizzle(c.env.DB, { schema });

  if (body.movie_id) {
    await db.insert(schema.history).values({
      userId: user.id,
      movieId: body.movie_id,
    }).onConflictDoUpdate({
      target: [schema.history.userId, schema.history.movieId],
      set: { playedAt: sql`(unixepoch())` }
    });
  } else if (body.episode_id) {
    await db.insert(schema.history).values({
      userId: user.id,
      episodeId: body.episode_id,
    }).onConflictDoUpdate({
      target: [schema.history.userId, schema.history.episodeId],
      set: { playedAt: sql`(unixepoch())` }
    });
  }

  return c.json({ success: true });
});

app.delete('/history/:id', async (c) => {
  const user = c.get('user');
  const id = Number(c.req.param('id'));
  const db = drizzle(c.env.DB, { schema });

  await db.delete(schema.history).where(
    and(eq(schema.history.userId, user.id), eq(schema.history.id, id))
  );

  return c.json({ success: true });
});

export default app;

