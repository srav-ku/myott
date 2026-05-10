/**
 * POST /api/user/watched
 *   Body: { movie_id?: number, episode_id?: number, season_number?: number, episode_number?: number }
 *   Toggles watched status.
 * GET /api/user/watched?movie_id=&episode_id=
 *   Checks if an item is watched.
 */
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { ok, fail, parseJson, parseQuery, serverError } from '@/lib/http';
import { requireUser } from '@/lib/user';
import { getDb } from '@/db/client';
import { watched } from '@/db/schema';
import { isUniqueViolation } from '@/lib/db-errors';

export const runtime = 'nodejs';

const PostSchema = z.object({
  movie_id: z.number().int().positive().optional(),
  episode_id: z.number().int().positive().optional(),
  season_number: z.number().int().nonnegative().optional(),
  episode_number: z.number().int().positive().optional(),
}).refine(d => d.movie_id !== undefined || d.episode_id !== undefined, {
  message: 'Provide movie_id or episode_id',
});

const QuerySchema = z.object({
  movie_id: z.coerce.number().int().positive().optional(),
  episode_id: z.coerce.number().int().positive().optional(),
});

export async function GET(req: NextRequest) {
  const g = await requireUser(req);
  if (!g.ok) return g.response;

  const url = new URL(req.url);
  const parsed = parseQuery(url, QuerySchema);
  if (!parsed.ok) return parsed.response;

  try {
    const db = await getDb();
    const row = await db.query.watched.findFirst({
      where: and(
        eq(watched.userId, g.user.id),
        parsed.data.movie_id 
          ? eq(watched.movieId, parsed.data.movie_id)
          : eq(watched.episodeId, parsed.data.episode_id!)
      )
    });

    return ok({ watched: !!row });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: NextRequest) {
  const g = await requireUser(req);
  if (!g.ok) return g.response;

  const parsed = await parseJson(req, PostSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const db = await getDb();
    
    // Check if exists (for toggle)
    const existing = await db.query.watched.findFirst({
      where: and(
        eq(watched.userId, g.user.id),
        parsed.data.movie_id 
          ? eq(watched.movieId, parsed.data.movie_id)
          : eq(watched.episodeId, parsed.data.episode_id!)
      )
    });

    if (existing) {
      await db
        .delete(watched)
        .where(eq(watched.id, existing.id));
      return ok({ watched: false });
    }

    const row = await db
      .insert(watched)
      .values({
        userId: g.user.id,
        movieId: parsed.data.movie_id || null,
        episodeId: parsed.data.episode_id || null,
        seasonNumber: parsed.data.season_number || null,
        episodeNumber: parsed.data.episode_number || null,
      })
      .returning();

    return ok({ watched: true, row: row[0] });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return ok({ watched: true }); // Should have been caught by existing check but for safety
    }
    return serverError(err);
  }
}
