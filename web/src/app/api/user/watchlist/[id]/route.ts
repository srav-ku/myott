/**
 * DELETE /api/user/watchlist/[id]
 *   The id can be either the watchlist row id (number) OR
 *   "movie:N" / "tv:N" to delete by content ref.
 */
import { NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { ok, fail, notFound, serverError } from '@/lib/http';
import { requireUser } from '@/lib/user';
import { getDb } from '@/db/client';
import { watchlist } from '@/db/schema';

export const runtime = 'nodejs';

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await requireUser(req);
  if (!g.ok) return g.response;
  const { id: raw } = await ctx.params;

  try {
    const db = await getDb();
    if (raw.includes(':')) {
      const [kind, idStr] = raw.split(':');
      const cid = Number(idStr);
      if ((kind !== 'movie' && kind !== 'tv') || !Number.isFinite(cid) || cid <= 0) {
        return fail('Invalid composite id', 400);
      }
      const deleted = await db
        .delete(watchlist)
        .where(
          and(
            eq(watchlist.userId, g.user.id),
            eq(watchlist.contentType, kind),
            eq(watchlist.contentId, cid),
          ),
        )
        .returning();
      if (deleted.length === 0) return notFound('Not in watchlist');
      return ok({ deleted: deleted[0].id });
    }
    const id = Number(raw);
    if (!Number.isFinite(id) || id <= 0) return fail('Invalid id', 400);
    const deleted = await db
      .delete(watchlist)
      .where(and(eq(watchlist.id, id), eq(watchlist.userId, g.user.id)))
      .returning();
    if (deleted.length === 0) return notFound('Not found');
    return ok({ deleted: deleted[0].id });
  } catch (err) {
    return serverError(err);
  }
}
