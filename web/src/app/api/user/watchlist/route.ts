/**
 * GET  /api/user/watchlist
 *   Returns watchlist rows, each with the joined movie or tv summary.
 * POST /api/user/watchlist
 *   Body: { content_type: 'movie'|'tv', content_id: number }
 */
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, desc, inArray } from 'drizzle-orm';
import { ok, fail, parseJson, serverError } from '@/lib/http';
import { requireUser } from '@/lib/user';
import { getDb } from '@/db/client';
import { watchlist, movies, tv, CONTENT_TYPES } from '@/db/schema';
import { isUniqueViolation } from '@/lib/db-errors';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const g = await requireUser(req);
  if (!g.ok) return g.response;
  try {
    const db = await getDb();
    const rows = await db
      .select()
      .from(watchlist)
      .where(eq(watchlist.userId, g.user.id))
      .orderBy(desc(watchlist.createdAt));

    const movieIds = rows
      .filter((r) => r.contentType === 'movie')
      .map((r) => r.contentId);
    const tvIds = rows
      .filter((r) => r.contentType === 'tv')
      .map((r) => r.contentId);

    const [movieRows, tvRows] = await Promise.all([
      movieIds.length
        ? db.select().from(movies).where(inArray(movies.id, movieIds))
        : Promise.resolve([] as (typeof movies.$inferSelect)[]),
      tvIds.length
        ? db.select().from(tv).where(inArray(tv.id, tvIds))
        : Promise.resolve([] as (typeof tv.$inferSelect)[]),
    ]);
    const movieMap = new Map(movieRows.map((m) => [m.id, m]));
    const tvMap = new Map(tvRows.map((t) => [t.id, t]));

    const items = rows
      .map((r) => {
        if (r.contentType === 'movie') {
          const m = movieMap.get(r.contentId);
          if (!m) return null;
          return {
            watchlist_id: r.id,
            content_type: 'movie' as const,
            content_id: r.contentId,
            tmdb_id: m.tmdbId,
            title: m.title,
            poster_url: m.posterPath
              ? `https://image.tmdb.org/t/p/w500${m.posterPath}`
              : null,
            added_at: r.createdAt,
          };
        }
        const t = tvMap.get(r.contentId);
        if (!t) return null;
        return {
          watchlist_id: r.id,
          content_type: 'tv' as const,
          content_id: r.contentId,
          tmdb_id: t.tmdbId,
          title: t.name,
          poster_url: t.posterPath
            ? `https://image.tmdb.org/t/p/w500${t.posterPath}`
            : null,
          added_at: r.createdAt,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    return ok({ items });
  } catch (err) {
    return serverError(err);
  }
}

const PostSchema = z.object({
  content_type: z.enum(CONTENT_TYPES),
  content_id: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  const g = await requireUser(req);
  if (!g.ok) return g.response;
  const parsed = await parseJson(req, PostSchema);
  if (!parsed.ok) return parsed.response;
  try {
    const db = await getDb();
    const row = await db
      .insert(watchlist)
      .values({
        userId: g.user.id,
        contentType: parsed.data.content_type,
        contentId: parsed.data.content_id,
      })
      .returning();
    return ok({ watchlist: row[0] }, { status: 201 });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return fail('Already in watchlist', 409);
    }
    return serverError(err);
  }
}
