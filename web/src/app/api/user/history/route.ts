/**
 * GET  /api/user/history — Continue-watching list, joined with content/episode metadata.
 *   Filters out items already marked as watched.
 * POST /api/user/history
 *   Body: { movie_id?: number, episode_id?: number }
 *   (XOR — exactly one). Upserts on (user_id, movie_id) or (user_id, episode_id).
 */
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, desc, inArray, sql, and, notExists, or, isNotNull } from 'drizzle-orm';
import { ok, fail, parseJson, serverError } from '@/lib/http';
import { requireUser } from '@/lib/user';
import { getDb } from '@/db/client';
import { history, movies, tv, episodes, watched } from '@/db/schema';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const g = await requireUser(req);
  if (!g.ok) return g.response;
  try {
    const db = await getDb();
    
    // Continue watching: played but NOT marked as watched
    const rows = await db
      .select()
      .from(history)
      .where(and(
        eq(history.userId, g.user.id),
        notExists(
          db.select()
            .from(watched)
            .where(and(
              eq(watched.userId, g.user.id),
              or(
                and(eq(history.movieId, watched.movieId), isNotNull(history.movieId)),
                and(eq(history.episodeId, watched.episodeId), isNotNull(history.episodeId))
              )
            ))
        )
      ))
      .orderBy(desc(history.playedAt))
      .limit(30);

    const movieIds = rows
      .map((r) => r.movieId)
      .filter((id): id is number => id !== null);
    const episodeIds = rows
      .map((r) => r.episodeId)
      .filter((id): id is number => id !== null);

    const [movieRows, episodeRows] = await Promise.all([
      movieIds.length
        ? db.select().from(movies).where(inArray(movies.id, movieIds))
        : Promise.resolve([] as (typeof movies.$inferSelect)[]),
      episodeIds.length
        ? db.select().from(episodes).where(inArray(episodes.id, episodeIds))
        : Promise.resolve([] as (typeof episodes.$inferSelect)[]),
    ]);
    const tvIds = Array.from(new Set(episodeRows.map((e) => e.tvId)));
    const tvRows = tvIds.length
      ? await db.select().from(tv).where(inArray(tv.id, tvIds))
      : [];

    const movieMap = new Map(movieRows.map((m) => [m.id, m]));
    const epMap = new Map(episodeRows.map((e) => [e.id, e]));
    const tvMap = new Map(tvRows.map((t) => [t.id, t]));

    const items = rows
      .map((r) => {
        if (r.movieId !== null) {
          const m = movieMap.get(r.movieId);
          if (!m) return null;
          return {
            history_id: r.id,
            kind: 'movie' as const,
            content_id: m.id,
            tmdb_id: m.tmdbId,
            title: m.title,
            poster_url: m.posterPath
              ? `https://image.tmdb.org/t/p/w500${m.posterPath}`
              : null,
            last_watched_at: r.playedAt,
          };
        }
        if (r.episodeId !== null) {
          const e = epMap.get(r.episodeId);
          if (!e) return null;
          const show = tvMap.get(e.tvId);
          return {
            history_id: r.id,
            kind: 'episode' as const,
            content_id: e.id,
            tv_id: e.tvId,
            tv_tmdb_id: show?.tmdbId,
            tv_title: show?.name,
            season: e.seasonNumber,
            episode: e.episodeNumber,
            title: e.title,
            poster_url: show?.posterPath
              ? `https://image.tmdb.org/t/p/w500${show.posterPath}`
              : null,
            last_watched_at: r.playedAt,
          };
        }
        return null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    return ok({ items });
  } catch (err) {
    return serverError(err);
  }
}

const PostSchema = z
  .object({
    movie_id: z.number().int().positive().optional(),
    episode_id: z.number().int().positive().optional(),
  })
  .refine(
    (d) =>
      (d.movie_id !== undefined ? 1 : 0) + (d.episode_id !== undefined ? 1 : 0) ===
      1,
    { message: 'Provide exactly one of movie_id or episode_id' },
  );

export async function POST(req: NextRequest) {
  const g = await requireUser(req);
  if (!g.ok) return g.response;
  const parsed = await parseJson(req, PostSchema);
  if (!parsed.ok) return parsed.response;
  const { movie_id, episode_id } = parsed.data;

  try {
    const db = await getDb();
    const target = movie_id !== undefined ? history.movieId : history.episodeId;
    const cid = movie_id ?? episode_id!;
    const row = await db
      .insert(history)
      .values({
        userId: g.user.id,
        movieId: movie_id ?? null,
        episodeId: episode_id ?? null,
      })
      .onConflictDoUpdate({
        target: [history.userId, target],
        set: { 
          playedAt: sql`(unixepoch())`,
        },
      })
      .returning();
    return ok({ history: row[0], content_id: cid });
  } catch (err) {
    return fail((err as Error).message, 500);
  }
}
