import { getDb } from '@/db/client';
import { ads, AdPosition } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const db = await getDb();
    
    const results = await db
      .select()
      .from(ads)
      .where(eq(ads.isActive, true))
      .orderBy(desc(ads.priority), desc(ads.createdAt));

    // Group by position
    const groupedAds: Partial<Record<AdPosition, typeof results>> = {};
    
    for (const ad of results) {
      if (!groupedAds[ad.position]) {
        groupedAds[ad.position] = [];
      }
      groupedAds[ad.position]!.push(ad);
    }

    return NextResponse.json({ ok: true, ads: groupedAds });
  } catch (error) {
    console.error('[ADS API ERROR]', error);
    // Return safe empty object
    return NextResponse.json({ ok: false, ads: {} }, { status: 200 });
  }
}
