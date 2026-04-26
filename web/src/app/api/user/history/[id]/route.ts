/**
 * DELETE /api/user/history/[id] — remove a single continue-watching row.
 */
import { NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { ok, fail, notFound, serverError } from '@/lib/http';
import { requireUser } from '@/lib/user';
import { getDb } from '@/db/client';
import { history } from '@/db/schema';

export const runtime = 'nodejs';

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await requireUser(req);
  if (!g.ok) return g.response;
  const { id: raw } = await ctx.params;
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) return fail('Invalid id', 400);
  try {
    const db = await getDb();
    const deleted = await db
      .delete(history)
      .where(and(eq(history.id, id), eq(history.userId, g.user.id)))
      .returning();
    if (deleted.length === 0) return notFound('Not found');
    return ok({ deleted: deleted[0].id });
  } catch (err) {
    return serverError(err);
  }
}
