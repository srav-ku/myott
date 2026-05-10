/**
 * GET /api/collections
 *   Returns a list of all collections for the current user.
 * POST /api/collections
 *   Body: { name: string }
 *   Creates a new collection.
 */
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import { ok, fail, parseJson, serverError } from '@/lib/http';
import { requireUser } from '@/lib/user';
import { getDb } from '@/db/client';
import { collections } from '@/db/schema';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const g = await requireUser(req);
  if (!g.ok) return g.response;
  try {
    const db = await getDb();
    const rows = await db
      .select()
      .from(collections)
      .where(eq(collections.userId, g.user.id))
      .orderBy(desc(collections.updatedAt));

    return ok({ collections: rows });
  } catch (err) {
    return serverError(err);
  }
}

const PostSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function POST(req: NextRequest) {
  const g = await requireUser(req);
  if (!g.ok) return g.response;
  const parsed = await parseJson(req, PostSchema);
  if (!parsed.ok) return parsed.response;
  try {
    const db = await getDb();
    const row = await db
      .insert(collections)
      .values({
        userId: g.user.id,
        name: parsed.data.name,
      })
      .returning();
    return ok({ collection: row[0] }, { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}
