import { NextRequest } from 'next/server';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { ok, serverError, parseJson } from '@/lib/http';
import { getDb } from '@/db/client';
import { contentRequests } from '@/db/schema';

export const runtime = 'nodejs';

const RequestSchema = z.object({
  query: z.string().max(120).optional(),
  contentType: z.enum(['movie', 'tv']).optional(),
  tmdbId: z.number().int().optional(),
  title: z.string().optional(),
  reason: z.enum(['not_found', 'missing_links']).optional().default('not_found'),
});

/**
 * POST /api/content-requests
 * 
 * Manually requested by user when search yields no results
 * OR when links are missing on a content page.
 */
export async function POST(req: NextRequest) {
  const parsed = await parseJson(req, RequestSchema);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  const query = data.query?.trim().toLowerCase() || null;

  try {
    const db = await getDb();

    // 1. Try to upsert by TMDB ID if present
    if (data.tmdbId && data.contentType) {
      await db
        .insert(contentRequests)
        .values({
          tmdbId: data.tmdbId,
          contentType: data.contentType,
          title: data.title ?? null,
          reason: data.reason,
          count: 1,
          status: 'pending',
        })
        .onConflictDoUpdate({
          target: [contentRequests.tmdbId, contentRequests.contentType],
          set: {
            count: sql`${contentRequests.count} + 1`,
            lastRequestedAt: sql`(unixepoch())`,
            reason: data.reason, // Update reason to most recent signal
          },
        });
    } 
    // 2. Otherwise fallback to query-based upsert (for "not found" search signals)
    else if (query) {
      await db
        .insert(contentRequests)
        .values({
          query,
          title: data.title || query,
          reason: data.reason,
          count: 1,
          status: 'pending',
        })
        .onConflictDoUpdate({
          target: contentRequests.query,
          set: {
            count: sql`${contentRequests.count} + 1`,
            lastRequestedAt: sql`(unixepoch())`,
            reason: data.reason,
          },
        });
    }

    return ok({ message: 'Request submitted' });
  } catch (err) {
    return serverError(err);
  }
}
