/**
 * POST /api/reports — public endpoint.
 * Anyone (signed in or not) can report a broken link / wrong content.
 *
 * Body: { content_type: 'movie'|'episode'|'link', content_id: number,
 *         issue_type: 'not_playing'|'wrong_content'|'audio'|'subtitle'|'other',
 *         message?: string }
 */
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, parseJson, serverError } from '@/lib/http';
import { getDb } from '@/db/client';
import { reports, REPORT_TARGETS, REPORT_ISSUES } from '@/db/schema';

export const runtime = 'nodejs';

const Schema = z.object({
  content_type: z.enum(REPORT_TARGETS),
  content_id: z.number().int().positive(),
  issue_type: z.enum(REPORT_ISSUES),
  message: z.string().max(2000).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = await parseJson(req, Schema);
  if (!parsed.ok) return parsed.response;
  // reportedBy is optional — if signed-in, capture the email
  const reportedBy = req.headers.get('x-user-email')?.trim().toLowerCase() || null;
  try {
    const db = await getDb();
    const row = await db
      .insert(reports)
      .values({
        contentType: parsed.data.content_type,
        contentId: parsed.data.content_id,
        issueType: parsed.data.issue_type,
        message: parsed.data.message ?? null,
        reportedBy,
      })
      .returning();
    return ok({ report: row[0] }, { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}
