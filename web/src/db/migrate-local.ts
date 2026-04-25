/**
 * Apply Drizzle migrations to the local libSQL file used by `next dev`.
 * Run with: pnpm --filter @workspace/web run db:migrate:local
 */
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { createClient } from '@libsql/client';
import { resolve } from 'node:path';

async function main() {
  const dbPath = process.env.LOCAL_DB_PATH ?? './local.db';
  const url = dbPath.startsWith('file:') ? dbPath : `file:${dbPath}`;
  const migrationsFolder = resolve(process.cwd(), 'drizzle/migrations');

  const client = createClient({ url });
  const db = drizzle(client);

  console.log(`[migrate] applying migrations from ${migrationsFolder} -> ${dbPath}`);
  await migrate(db, { migrationsFolder });
  console.log('[migrate] done');
  client.close();
}

main().catch((err) => {
  console.error('[migrate] failed:', err);
  process.exit(1);
});
