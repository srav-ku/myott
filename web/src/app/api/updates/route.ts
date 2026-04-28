import { getDb } from '@/db/client';
import { updates } from '@/db/schema';
import { desc, or, gt, isNull } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const db = await getDb();
    const now = new Date();
    
    const results = await db
      .select()
      .from(updates)
      .where(
        or(
          isNull(updates.expiresAt),
          gt(updates.expiresAt, now)
        )
      )
      .orderBy(desc(updates.createdAt))
      .limit(20);

    return NextResponse.json({ ok: true, updates: results });
  } catch (error) {
    console.error('[UPDATES API ERROR]', error);
    // NEVER allow 500 crash, return safe empty list
    return NextResponse.json({ ok: false, updates: [] }, { status: 200 });
  }
}
