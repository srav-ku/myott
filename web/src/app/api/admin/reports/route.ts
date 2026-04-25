/**
 * GET /api/admin/reports?status=open&limit=50
 */
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { desc, eq } from 'drizzle-orm';
import { ok, serverError, parseQuery } from '@/lib/http';
import { requireAdmin } from '@/lib/admin';
import { getDb } from '@/db/client';
import { reports, REPORT_STATUS } from '@/db/schema';

export const runtime = 'nodejs';

const QuerySchema = z.object({
  status: z.enum(REPORT_STATUS).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  const url = new URL(req.url);
  const parsed = parseQuery(url, QuerySchema);
  if (!parsed.ok) return parsed.response;

  try {
    const db = await getDb();
    const baseQuery = db.select().from(reports);
    const filtered = parsed.data.status
      ? baseQuery.where(eq(reports.status, parsed.data.status))
      : baseQuery;
    const rows = await filtered
      .orderBy(desc(reports.createdAt))
      .limit(parsed.data.limit ?? 50);
    return ok({ reports: rows });
  } catch (err) {
    return serverError(err);
  }
}
