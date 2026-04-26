/**
 * User identity helper.
 *
 * Reads `x-user-email` (and optional `x-user-name`) from the request.
 * Auto-creates a row in `users` on first contact so foreign keys work.
 *
 * - `users.id` is a text PK. We currently use `local:{lowercased-email}` as the
 *   id for the email-shim auth that the frontend uses. When Firebase replaces
 *   the shim, swap to `firebase:{uid}` (or just the uid) without touching any
 *   downstream code — everything keys off the row id, not the email.
 */
import 'server-only';
import { eq } from 'drizzle-orm';
import type { NextResponse } from 'next/server';
import { fail } from './http';
import { getDb } from '@/db/client';
import { users } from '@/db/schema';

export type UserRow = typeof users.$inferSelect;

export type UserGuard =
  | { ok: true; user: UserRow }
  | { ok: false; response: NextResponse };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function requireUser(req: Request): Promise<UserGuard> {
  const emailRaw = req.headers.get('x-user-email')?.trim().toLowerCase();
  if (!emailRaw || !EMAIL_RE.test(emailRaw)) {
    return {
      ok: false,
      response: fail('Sign in required (missing/invalid x-user-email)', 401),
    };
  }
  const name = req.headers.get('x-user-name')?.trim() || null;
  const id = `local:${emailRaw}`;

  const db = await getDb();
  const found = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (found.length > 0) {
    // Soft-update display name if it changed
    if (name && name !== found[0].displayName) {
      const updated = await db
        .update(users)
        .set({ displayName: name })
        .where(eq(users.id, id))
        .returning();
      return { ok: true, user: updated[0] };
    }
    return { ok: true, user: found[0] };
  }

  const inserted = await db
    .insert(users)
    .values({
      id,
      email: emailRaw,
      displayName: name,
      authProvider: 'guest',
    })
    .returning();
  return { ok: true, user: inserted[0] };
}
