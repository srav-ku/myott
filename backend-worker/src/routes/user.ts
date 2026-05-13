import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc, and, or, isNull, isNotNull } from 'drizzle-orm';
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

export default app;
