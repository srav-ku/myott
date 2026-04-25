/**
 * Database client. Returns a Drizzle client backed by either:
 *  - Cloudflare D1 (production / Pages dev with binding), or
 *  - libSQL (`next dev` in Replit — file-backed SQLite with prebuilt binaries).
 *
 * Schema is SQLite-dialect, so identical code works in both.
 *
 * Usage in API routes:
 *   const db = await getDb();
 */
import 'server-only';
import { drizzle as drizzleD1, type DrizzleD1Database } from 'drizzle-orm/d1';
import {
  drizzle as drizzleLibsql,
  type LibSQLDatabase,
} from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

export type DbClient =
  | DrizzleD1Database<typeof schema>
  | LibSQLDatabase<typeof schema>;

let _localDb: LibSQLDatabase<typeof schema> | null = null;

function getLocalDb(): LibSQLDatabase<typeof schema> {
  if (_localDb) return _localDb;
  const path = process.env.LOCAL_DB_PATH ?? './local.db';
  const url = path.startsWith('file:') ? path : `file:${path}`;
  const client = createClient({ url });
  _localDb = drizzleLibsql(client, { schema });
  return _localDb;
}

/**
 * Get a Drizzle client. In production (Cloudflare Pages) we read the D1
 * binding from the request context. In local dev we fall back to a local
 * libSQL file.
 */
export async function getDb(): Promise<DbClient> {
  try {
    const { getRequestContext } = await import('@cloudflare/next-on-pages');
    const ctx = getRequestContext();
    const d1 = (ctx.env as { DB?: D1Database }).DB;
    if (d1) {
      return drizzleD1(d1, { schema });
    }
  } catch {
    // Not running under CF Pages — fall through to local libSQL.
  }
  return getLocalDb();
}

export { schema };
