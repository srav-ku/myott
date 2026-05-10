/**
 * GET /api/user/me — returns the current user (auto-creates on first call).
 */
import { NextRequest } from 'next/server';
import { ok } from '@/lib/http';
import { requireUser } from '@/lib/user';
import { getAdminEmails } from '@/lib/admin';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const guard = await requireUser(req);
  if (!guard.ok) return guard.response;
  const allowed = getAdminEmails();
  const isAdmin =
    allowed.size === 0 || allowed.has(guard.user.email?.toLowerCase() ?? '');
  return ok({
    user: {
      id: guard.user.id,
      email: guard.user.email,
      displayName: guard.user.displayName,
      authProvider: guard.user.authProvider,
      stealthMode: guard.user.stealthMode,
      createdAt: guard.user.createdAt,
    },
    isAdmin,
    adminMode: allowed.size === 0 ? 'open' : 'restricted',
  });
}
