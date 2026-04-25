/**
 * Seed default reference data into the local libSQL DB.
 * Idempotent — safe to re-run.
 */
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { languages } from './schema';

const DEFAULT_LANGUAGES: { code: string; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'te', name: 'Telugu' },
  { code: 'ta', name: 'Tamil' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'kn', name: 'Kannada' },
  { code: 'ko', name: 'Korean' },
  { code: 'ja', name: 'Japanese' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
];

async function main() {
  const dbPath = process.env.LOCAL_DB_PATH ?? './local.db';
  const url = dbPath.startsWith('file:') ? dbPath : `file:${dbPath}`;
  const client = createClient({ url });
  const db = drizzle(client);

  for (const lang of DEFAULT_LANGUAGES) {
    await db
      .insert(languages)
      .values(lang)
      .onConflictDoNothing({ target: languages.code });
  }

  console.log(`[seed] languages: ${DEFAULT_LANGUAGES.length} ensured`);
  client.close();
}

main().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
