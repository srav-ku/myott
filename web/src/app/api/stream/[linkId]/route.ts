/**
 * GET /api/stream/[linkId]
 *
 * Resolves a link to a playable URL.
 * Response: { url, type: 'direct' | 'extract', fallback: boolean, expires_at? }
 *
 * Logic:
 *   1. type='direct' → return primary url as-is.
 *   2. type='extract' AND cache valid (extracted_url && expires_at > now) → return cached.
 *   3. else → call extractor worker; on success persist + return.
 *   4. else (worker fail/missing) → return primary url with fallback:true.
 */
import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { ok, fail, notFound, serverError } from '@/lib/http';
import { getDb } from '@/db/client';
import { links } from '@/db/schema';
import { callExtractor } from '@/lib/extractor';

export const runtime = 'nodejs';

const DEFAULT_TTL_SECONDS = 6 * 60 * 60;

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ linkId: string }> },
) {
  const { linkId: raw } = await ctx.params;
  const linkId = Number(raw);
  if (!Number.isFinite(linkId) || linkId <= 0) {
    return fail('Invalid linkId', 400);
  }

  try {
    const db = await getDb();
    const rows = await db
      .select()
      .from(links)
      .where(eq(links.id, linkId))
      .limit(1);
    if (rows.length === 0) return notFound('Link not found');
    const link = rows[0];

    // 1) Direct stream — return as-is
    if (link.type === 'direct') {
      return ok({
        url: link.url,
        type: 'direct' as const,
        fallback: false,
      });
    }

    // 2) Extract type — check cache
    const nowMs = Date.now();
    if (
      link.extractedUrl &&
      link.expiresAt &&
      link.expiresAt.getTime() > nowMs
    ) {
      return ok({
        url: link.extractedUrl,
        type: 'extract' as const,
        fallback: false,
        expires_at: Math.floor(link.expiresAt.getTime() / 1000),
      });
    }

    // 3) Cache miss / expired — call worker
    const result = await callExtractor(link.url);
    if (result?.stream_url) {
      const ttlSeconds = Number(
        process.env.EXTRACT_TTL_SECONDS ?? DEFAULT_TTL_SECONDS,
      );
      const expiresAtSec =
        result.expires_at ?? Math.floor(nowMs / 1000) + ttlSeconds;
      const expiresAt = new Date(expiresAtSec * 1000);
      await db
        .update(links)
        .set({
          extractedUrl: result.stream_url,
          expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(links.id, linkId));
      return ok({
        url: result.stream_url,
        type: 'extract' as const,
        fallback: false,
        expires_at: expiresAtSec,
      });
    }

    // 4) Worker failed / missing → fallback to primary URL
    return ok({
      url: link.url,
      type: 'extract' as const,
      fallback: true,
    });
  } catch (err) {
    return serverError(err);
  }
}
