import { drizzle } from 'drizzle-orm/d1';
import { eq, and, sql } from 'drizzle-orm';
import { schema } from '../db/schema';
import { verifyFirebaseToken } from '../lib/auth';

export const authMiddleware = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized (Missing Header)' }, 401);
  }

  const token = authHeader.substring(7);
  const firebaseUser = await verifyFirebaseToken(token, c.env.FIREBASE_PROJECT_ID);

  if (!firebaseUser) {
    return c.json({ error: 'Unauthorized (Invalid Token)' }, 401);
  }

  // Admin status is always determined by the ADMIN_EMAILS env var — never the DB.
  const adminEmails = (c.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean);
  const isAdmin = firebaseUser.email
    ? adminEmails.includes(firebaseUser.email.toLowerCase())
    : false;

  const db = drizzle(c.env.DB, { schema });

  // Remove any stale row that has the same email but a different id (e.g. the
  // manually-inserted "admin_init" seed row). If we don't do this first, the
  // INSERT below will crash on the email unique constraint.
  if (firebaseUser.email) {
    await db
      .delete(schema.users)
      .where(
        and(
          eq(schema.users.email, firebaseUser.email),
          sql`${schema.users.id} != ${firebaseUser.uid}`
        )
      );
  }

  // Upsert keyed on the real Firebase UID.
  await db
    .insert(schema.users)
    .values({
      id: firebaseUser.uid,
      email: firebaseUser.email || null,
      displayName: firebaseUser.name || null,
      photoUrl: firebaseUser.picture || null,
      authProvider: 'google',
      isAdmin,
    })
    .onConflictDoUpdate({
      target: schema.users.id,
      set: {
        email: firebaseUser.email || null,
        displayName: firebaseUser.name || null,
        photoUrl: firebaseUser.picture || null,
        isAdmin,
      },
    });

  // Re-read so downstream handlers get the real DB object.
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, firebaseUser.uid))
    .limit(1);

  if (!user) {
    return c.json({ error: 'User provisioning failed' }, 500);
  }

  c.set('user', user);
  await next();
};
