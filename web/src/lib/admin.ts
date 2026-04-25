/**
 * Admin guard.
 *
 * Behavior:
 *  - If `ADMIN_EMAILS` env is empty/unset → open mode (allow all). This matches
 *    the agreed plan ("no auth in backend now"). Useful for local dev.
 *  - If `ADMIN_EMAILS` is set → request must carry `x-admin-email` matching one
 *    of the allowlisted emails. Later Firebase Auth on the frontend will verify
 *    the user's Google email server-side and forward it as that header.
 */
import 'server-only';
import type { NextResponse } from 'next/server';
import { fail } from './http';

export function getAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? '';
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export type AdminGuard =
  | { ok: true; email: string; openMode: boolean }
  | { ok: false; response: NextResponse };

export function requireAdmin(req: Request): AdminGuard {
  const allowed = getAdminEmails();
  if (allowed.size === 0) {
    return { ok: true, email: 'dev', openMode: true };
  }
  const header = req.headers.get('x-admin-email')?.trim().toLowerCase();
  if (!header || !allowed.has(header)) {
    return { ok: false, response: fail('Forbidden — admin only', 403) };
  }
  return { ok: true, email: header, openMode: false };
}
