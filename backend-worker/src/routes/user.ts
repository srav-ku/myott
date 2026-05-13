import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc, and, or, isNull, isNotNull, inArray } from 'drizzle-orm';
import { schema } from '../db/schema';

const app = new Hono<{ Bindings: any; Variables: { user: any } }>();

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

  // Filter history items that are NOT in the watched table
  const rawRows = await db.select({
      id: schema.history.id,
      movieId: schema.history.movieId,
      episodeId: schema.history.episodeId,
      playedAt: schema.history.playedAt,
      movie: schema.movies,
      episode: schema.episodes,
      tvShow: schema.tv,
    })
    .from(schema.history)
    .leftJoin(schema.movies, eq(schema.history.movieId, schema.movies.id))
    .leftJoin(schema.episodes, eq(schema.history.episodeId, schema.episodes.id))
    .leftJoin(schema.tv, eq(schema.episodes.tvId, schema.tv.id))
    .leftJoin(schema.watched, 
      and(
        eq(schema.history.userId, schema.watched.userId),
        or(
          and(isNotNull(schema.history.movieId), eq(schema.history.movieId, schema.watched.movieId)),
          and(isNotNull(schema.history.episodeId), eq(schema.history.episodeId, schema.watched.episodeId))
        )
      )
    )
    .where(
      and(
        eq(schema.history.userId, user.id),
        isNull(schema.watched.id)
      )
    )
    .orderBy(desc(schema.history.playedAt))
    .limit(20);

  const rows = rawRows.map(r => ({
    id: r.id,
    mediaId: r.movieId || (r.tvShow ? r.tvShow.id : 0),
    movieId: r.movieId,
    episodeId: r.episodeId,
    type: r.movieId ? 'movie' : 'tv',
    status: 'watching',
    updatedAt: r.playedAt,
    movie: r.movie,
    tvShow: r.tvShow,
    episode: r.episode,
    seasonNumber: r.episode?.seasonNumber,
    episodeNumber: r.episode?.episodeNumber,
  }));

  return c.json(rows);
});

app.get('/watched', async (c: any) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB, { schema });

  const rawRows = await db.select({
      id: schema.watched.id,
      movieId: schema.watched.movieId,
      episodeId: schema.watched.episodeId,
      createdAt: schema.watched.createdAt,
      movie: schema.movies,
      episode: schema.episodes,
      tvShow: schema.tv,
    })
    .from(schema.watched)
    .leftJoin(schema.movies, eq(schema.watched.movieId, schema.movies.id))
    .leftJoin(schema.episodes, eq(schema.watched.episodeId, schema.episodes.id))
    .leftJoin(schema.tv, eq(schema.episodes.tvId, schema.tv.id))
    .where(eq(schema.watched.userId, user.id))
    .orderBy(desc(schema.watched.createdAt))
    .limit(50);

  const rows = rawRows.map(r => ({
    id: r.id,
    mediaId: r.movieId || (r.tvShow ? r.tvShow.id : 0),
    movieId: r.movieId,
    episodeId: r.episodeId,
    type: r.movieId ? 'movie' : 'tv',
    status: 'watched',
    updatedAt: r.createdAt,
    movie: r.movie,
    tvShow: r.tvShow,
    episode: r.episode,
    seasonNumber: r.episode?.seasonNumber,
    episodeNumber: r.episode?.episodeNumber,
  }));

  return c.json(rows);
});

/**
 * POST /api/user/history
 * Logs a playback event for a movie or episode.
 * Body: { movie_id?: number, episode_id?: number }
 */
app.post('/history', async (c: any) => {
  const user = c.get('user');
  const { movie_id, episode_id } = await c.req.json();
  const db = drizzle(c.env.DB, { schema });

  if (!movie_id && !episode_id) {
    return c.json({ error: 'Missing movie_id or episode_id' }, 400);
  }

  const now = new Date();

  // Use onConflictDoUpdate to refresh the playedAt timestamp if the record exists
  if (movie_id) {
    await db.insert(schema.history)
      .values({ userId: user.id, movieId: movie_id, playedAt: now })
      .onConflictDoUpdate({
        target: [schema.history.userId, schema.history.movieId],
        set: { playedAt: now }
      });
  } else {
    await db.insert(schema.history)
      .values({ userId: user.id, episodeId: episode_id, playedAt: now })
      .onConflictDoUpdate({
        target: [schema.history.userId, schema.history.episodeId],
        set: { playedAt: now }
      });
  }

  return c.json({ success: true });
});

/**
 * POST /api/user/watched
 * Marks a movie or episode as watched.
 * Body: { movie_id?: number, episode_id?: number, season_number?: number, episode_number?: number }
 */
app.post('/watched', async (c: any) => {
  const user = c.get('user');
  const { movie_id, episode_id, season_number, episode_number } = await c.req.json();
  const db = drizzle(c.env.DB, { schema });

  if (!movie_id && !episode_id) {
    return c.json({ error: 'Missing movie_id or episode_id' }, 400);
  }

  const now = new Date();

  if (movie_id) {
    // 1. Add to watched
    await db.insert(schema.watched)
      .values({ userId: user.id, movieId: movie_id, createdAt: now })
      .onConflictDoUpdate({
        target: [schema.watched.userId, schema.watched.movieId],
        set: { createdAt: now }
      });

    // 2. Remove from history
    await db.delete(schema.history)
      .where(and(
        eq(schema.history.userId, user.id),
        eq(schema.history.movieId, movie_id)
      ));
  } else {
    // 1. Add to watched
    await db.insert(schema.watched)
      .values({ 
        userId: user.id, 
        episodeId: episode_id, 
        seasonNumber: season_number, 
        episodeNumber: episode_number,
        createdAt: now 
      })
      .onConflictDoUpdate({
        target: [schema.watched.userId, schema.watched.episodeId],
        set: { 
          createdAt: now,
          seasonNumber: season_number,
          episodeNumber: episode_number
        }
      });

    // 2. Remove from history
    await db.delete(schema.history)
      .where(and(
        eq(schema.history.userId, user.id),
        eq(schema.history.episodeId, episode_id)
      ));
  }

  return c.json({ success: true });
});

app.delete('/watched', async (c: any) => {
  const user = c.get('user');
  const { movie_id, episode_id, season_number, episode_number, tv_id } = await c.req.json();
  const db = drizzle(c.env.DB, { schema });
  const now = Math.floor(Date.now() / 1000);

  if (movie_id) {
    // 1. Delete from watched
    await db.delete(schema.watched)
      .where(and(
        eq(schema.watched.userId, user.id),
        eq(schema.watched.movieId, movie_id)
      ));
    
    // 2. Add back to history
    await db.insert(schema.history)
      .values({ userId: user.id, movieId: movie_id, playedAt: new Date() })
      .onConflictDoUpdate({
        target: [schema.history.userId, schema.history.movieId],
        set: { playedAt: new Date() }
      });

  } else if (episode_id) {
    // 1. Delete from watched
    await db.delete(schema.watched)
      .where(and(
        eq(schema.watched.userId, user.id),
        eq(schema.watched.episodeId, episode_id)
      ));
    
    // 2. Add back to history
    await db.insert(schema.history)
      .values({ 
        userId: user.id, 
        episodeId: episode_id, 
        playedAt: new Date() 
      })
      .onConflictDoUpdate({
        target: [schema.history.userId, schema.history.episodeId],
        set: { playedAt: new Date() }
      });
  } else {
    return c.json({ error: 'Missing movie_id or episode_id' }, 400);
  }

  return c.json({ success: true });
});

app.post('/watched/batch', async (c: any) => {
  const user = c.get('user');
  const { tv_id, season_number, episode_ids } = await c.req.json();
  const db = drizzle(c.env.DB, { schema });
  const now = new Date();

  if (!episode_ids || !Array.isArray(episode_ids)) {
    return c.json({ error: 'Missing episode_ids array' }, 400);
  }

  // Batch insert watched episodes
  for (const ep of episode_ids) {
    await db.insert(schema.watched)
      .values({ 
        userId: user.id, 
        episodeId: ep.id, 
        seasonNumber: ep.seasonNumber, 
        episodeNumber: ep.episodeNumber,
        createdAt: now 
      })
      .onConflictDoUpdate({
        target: [schema.watched.userId, schema.watched.episodeId],
        set: { createdAt: now }
      });
    
    // Remove from history
    await db.delete(schema.history)
      .where(and(
        eq(schema.history.userId, user.id),
        eq(schema.history.episodeId, ep.id)
      ));
  }

  return c.json({ success: true });
});

app.delete('/watched/batch', async (c: any) => {
  const user = c.get('user');
  const { episode_ids } = await c.req.json();
  const db = drizzle(c.env.DB, { schema });

  if (!episode_ids || !Array.isArray(episode_ids)) {
    return c.json({ error: 'Missing episode_ids array' }, 400);
  }

  const ids = episode_ids.map((e: any) => e.id);
  
  await db.delete(schema.watched)
    .where(and(
      eq(schema.watched.userId, user.id),
      inArray(schema.watched.episodeId, ids)
    ));

  return c.json({ success: true });
});

/**
 * DELETE /api/user/history/:id
 * Manually removes an item from history.
 */
app.delete('/history/:id', async (c: any) => {
  const user = c.get('user');
  const id = parseInt(c.req.param('id'));
  const db = drizzle(c.env.DB, { schema });

  if (isNaN(id)) {
    return c.json({ error: 'Invalid ID' }, 400);
  }

  await db.delete(schema.history)
    .where(and(
      eq(schema.history.id, id),
      eq(schema.history.userId, user.id)
    ));

  return c.json({ success: true });
});

/**
 * GET /api/user/watchlist
 */
app.get('/watchlist', async (c: any) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB, { schema });

  const rawRows = await db.select({
      id: schema.watchlist.id,
      contentType: schema.watchlist.contentType,
      contentId: schema.watchlist.contentId,
      createdAt: schema.watchlist.createdAt,
      movie: schema.movies,
      tvShow: schema.tv,
    })
    .from(schema.watchlist)
    .leftJoin(schema.movies, and(eq(schema.watchlist.contentType, 'movie'), eq(schema.watchlist.contentId, schema.movies.id)))
    .leftJoin(schema.tv, and(eq(schema.watchlist.contentType, 'tv'), eq(schema.watchlist.contentId, schema.tv.id)))
    .where(eq(schema.watchlist.userId, user.id))
    .orderBy(desc(schema.watchlist.createdAt));

  const rows = rawRows.map(r => ({
    id: r.id,
    type: r.contentType,
    media: r.movie || r.tvShow,
    createdAt: r.createdAt
  }));

  return c.json(rows);
});

/**
 * POST /api/user/watchlist
 */
app.post('/watchlist', async (c: any) => {
  const user = c.get('user');
  const { type, id } = await c.req.json();
  const db = drizzle(c.env.DB, { schema });

  if (!type || !id) {
    return c.json({ error: 'Missing type or id' }, 400);
  }

  await db.insert(schema.watchlist)
    .values({ userId: user.id, contentType: type, contentId: id })
    .onConflictDoNothing();

  return c.json({ success: true });
});

/**
 * DELETE /api/user/watchlist
 */
app.delete('/watchlist', async (c: any) => {
  const user = c.get('user');
  const { type, id } = await c.req.json();
  const db = drizzle(c.env.DB, { schema });

  await db.delete(schema.watchlist)
    .where(and(
      eq(schema.watchlist.userId, user.id),
      eq(schema.watchlist.contentType, type),
      eq(schema.watchlist.contentId, id)
    ));

  return c.json({ success: true });
});

export default app;
