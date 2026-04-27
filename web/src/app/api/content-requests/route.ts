import { NextRequest } from 'next/server';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { ok, badRequest, serverError, parseJson } from '@/lib/http';
import { getDb } from '@/db/client';
import { contentRequests } from '@/db/schema';

export const runtime = 'nodejs';

const RequestSchema = z.object({
  query: z.string().min(3).max(120),
});

/**
 * POST /api/content-requests
 * 
 * Manually requested by user when search yields no results.
 */
export async function POST(req: NextRequest) {
  const parsed = await parseJson(req, RequestSchema);
  if (!parsed.ok) return parsed.response;
  const { query: rawQuery } = parsed.data;

  const query = rawQuery.trim().toLowerCase();

  try {
    const db = await getDb();

    await db
      .insert(contentRequests)
      .values({
        query,
        count: 1,
        status: 'pending',
      })
      .onConflictDoUpdate({
        target: contentRequests.query,
        set: {
          count: sql`${contentRequests.count} + 1`,
          lastRequestedAt: sql`(unixepoch())`,
        },
      });

    return ok({ message: 'Request submitted' });
  } catch (err) {
    return serverError(err);
  }
}
