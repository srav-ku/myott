/**
 * PATCH /api/collections/[id]
 *   Body: { name: string }
 *   Renames a collection.
 * DELETE /api/collections/[id]
 *   Deletes a collection (cascades to items).
 */
import { NextRequest } from 'next/server';
import { eq, and, asc, inArray } from 'drizzle-orm';
import { ok, fail, parseJson, serverError, notFound } from '@/lib/http';
import { requireUser } from '@/lib/user';
import { getDb } from '@/db/client';
import { collections, collectionItems, movies, tv } from '@/db/schema';
import { tmdbImg } from '@/lib/tmdb';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const g = await requireUser(req);
  if (!g.ok) return g.response;

  const { id: rawId } = await ctx.params;
  const id = Number(rawId);
  if (!Number.isFinite(id)) return fail('Invalid ID', 400);

  try {
    const db = await getDb();
    const coll = await db.query.collections.findFirst({
      where: and(eq(collections.id, id), eq(collections.userId, g.user.id))
    });
    if (!coll) return notFound('Collection not found');

    const items = await db
      .select()
      .from(collectionItems)
      .where(eq(collectionItems.collectionId, id))
      .orderBy(asc(collectionItems.orderIndex));

    const movieIds = items.filter(i => i.movieId).map(i => i.movieId!);
    const tvIds = items.filter(i => i.tvId).map(i => i.tvId!);

    const [movieRows, tvRows] = await Promise.all([
      movieIds.length ? db.select().from(movies).where(inArray(movies.id, movieIds)) : [],
      tvIds.length ? db.select().from(tv).where(inArray(tv.id, tvIds)) : []
    ]);

    const movieMap = new Map(movieRows.map(m => [m.id, m]));
    const tvMap = new Map(tvRows.map(t => [t.id, t]));

    const results = items.map(item => {
      if (item.movieId) {
        const m = movieMap.get(item.movieId);
        if (!m) return null;
        return {
          tmdb_id: m.tmdbId,
          type: 'movie' as const,
          title: m.title,
          poster_url: tmdbImg(m.posterPath, 'w500'),
          rating: m.rating,
        };
      } else if (item.tvId) {
        const t = tvMap.get(item.tvId);
        if (!t) return null;
        return {
          tmdb_id: t.tmdbId,
          type: 'tv' as const,
          title: t.name,
          poster_url: tmdbImg(t.posterPath, 'w500'),
          rating: t.rating,
        };
      }
      return null;
    }).filter((x): x is NonNullable<typeof x> => x !== null);

    return ok({ 
      collection: coll,
      results
    });
  } catch (err) {
    return serverError(err);
  }
}

import { z } from 'zod';

const PatchSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const g = await requireUser(req);
  if (!g.ok) return g.response;
  
  const { id: rawId } = await ctx.params;
  const id = Number(rawId);
  if (!Number.isFinite(id)) return fail('Invalid ID', 400);

  const parsed = await parseJson(req, PatchSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const db = await getDb();
    const updated = await db
      .update(collections)
      .set({ 
        name: parsed.data.name,
        updatedAt: new Date()
      })
      .where(and(eq(collections.id, id), eq(collections.userId, g.user.id)))
      .returning();

    if (updated.length === 0) return notFound('Collection not found');
    return ok({ collection: updated[0] });
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const g = await requireUser(req);
  if (!g.ok) return g.response;

  const { id: rawId } = await ctx.params;
  const id = Number(rawId);
  if (!Number.isFinite(id)) return fail('Invalid ID', 400);

  try {
    const db = await getDb();
    const deleted = await db
      .delete(collections)
      .where(and(eq(collections.id, id), eq(collections.userId, g.user.id)))
      .returning();

    if (deleted.length === 0) return notFound('Collection not found');
    return ok({ success: true });
  } catch (err) {
    return serverError(err);
  }
}
