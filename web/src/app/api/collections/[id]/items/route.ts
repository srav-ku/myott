/**
 * POST /api/collections/[id]/items
 *   Body: { movie_id?: number, tv_id?: number }
 *   Adds an item to a collection.
 * DELETE /api/collections/[id]/items
 *   Body: { movie_id?: number, tv_id?: number }
 *   Removes an item from a collection.
 */
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { ok, fail, parseJson, serverError, notFound } from '@/lib/http';
import { requireUser } from '@/lib/user';
import { getDb } from '@/db/client';
import { collections, collectionItems } from '@/db/schema';

export const runtime = 'nodejs';

const ItemSchema = z.object({
  movie_id: z.number().int().positive().optional(),
  tv_id: z.number().int().positive().optional(),
}).refine(d => d.movie_id !== undefined || d.tv_id !== undefined, {
  message: 'Provide movie_id or tv_id',
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const g = await requireUser(req);
  if (!g.ok) return g.response;

  const { id: rawId } = await ctx.params;
  const id = Number(rawId);
  if (!Number.isFinite(id)) return fail('Invalid ID', 400);

  const parsed = await parseJson(req, ItemSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const db = await getDb();
    
    // Verify collection ownership
    const coll = await db.query.collections.findFirst({
      where: and(eq(collections.id, id), eq(collections.userId, g.user.id))
    });
    if (!coll) return notFound('Collection not found');

    // Get current max order index
    const maxOrder = await db
      .select({ value: sql<number>`MAX(${collectionItems.orderIndex})` })
      .from(collectionItems)
      .where(eq(collectionItems.collectionId, id));
    
    const nextOrder = (maxOrder[0]?.value ?? -1) + 1;

    const row = await db
      .insert(collectionItems)
      .values({
        collectionId: id,
        movieId: parsed.data.movie_id || null,
        tvId: parsed.data.tv_id || null,
        orderIndex: nextOrder,
      })
      .returning();

    return ok({ item: row[0] }, { status: 201 });
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

  const parsed = await parseJson(req, ItemSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const db = await getDb();
    
    // Verify collection ownership
    const coll = await db.query.collections.findFirst({
      where: and(eq(collections.id, id), eq(collections.userId, g.user.id))
    });
    if (!coll) return notFound('Collection not found');

    const deleted = await db
      .delete(collectionItems)
      .where(
        and(
          eq(collectionItems.collectionId, id),
          parsed.data.movie_id 
            ? eq(collectionItems.movieId, parsed.data.movie_id)
            : eq(collectionItems.tvId, parsed.data.tv_id!)
        )
      )
      .returning();

    if (deleted.length === 0) return notFound('Item not found in collection');
    return ok({ success: true });
  } catch (err) {
    return serverError(err);
  }
}
