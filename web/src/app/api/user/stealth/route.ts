import { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { ok, serverError, fail } from '@/lib/http';
import { getDb } from '@/db/client';
import { users } from '@/db/schema';
import { requireUser } from '@/lib/user';

export const runtime = 'nodejs';

const BodySchema = z.object({
  enabled: z.boolean(),
});

/**
 * POST /api/user/stealth
 * Toggles stealth mode for the current user.
 */
export async function POST(req: NextRequest) {
  try {
    const guard = await requireUser(req);
    if (!guard.ok) return guard.response;

    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) return fail('Invalid request body', 400);

    const { enabled } = parsed.data;
    const db = await getDb();

    const updated = await db
      .update(users)
      .set({
        stealthMode: enabled,
        stealthEnabledAt: enabled ? new Date() : null,
      })
      .where(eq(users.id, guard.user.id))
      .returning();

    return ok({ 
      success: true, 
      stealthMode: updated[0].stealthMode 
    });
  } catch (err) {
    return serverError(err);
  }
}
