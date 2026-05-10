'use client';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MediaRow } from '@/components/MediaRow';
import { CollectionsRow } from '@/components/CollectionsRow';

function HomeInner() {
  const sp = useSearchParams();
  const [tab, setTab] = useState<'all' | 'movies' | 'tv'>(
    (sp.get('tab') as 'movies' | 'tv') || 'all',
  );

  return (
    <div className="space-y-10 pb-20">
      <section className="px-4 sm:px-6">
        <div className="rounded-2xl bg-gradient-to-br from-[var(--color-brand)]/30 via-[var(--color-surface-2)] to-[var(--color-bg)] p-8 sm:p-12 border border-[var(--color-border)]">
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">
            Your Personal Library
          </h1>
          <p className="mt-3 text-[var(--color-text-dim)] max-w-xl text-lg">
            Manage your collections, track your watched status, and stream your content.
          </p>
        </div>
      </section>

      {/* Continue Watching - Only shows if items exist */}
      <MediaRow
        title="Continue Watching"
        endpoint="/api/user/history"
        kind="movie" // Mix of both, kind is fallback
      />

      <CollectionsRow />

      <div className="px-4 sm:px-6">
        <div className="inline-flex rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] p-1 text-sm">
          {(['all', 'movies', 'tv'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded transition-colors ${
                tab === t
                  ? 'bg-[var(--color-brand)] text-white'
                  : 'text-[var(--color-text-dim)] hover:text-white'
              }`}
            >
              {t === 'all' ? 'All' : t === 'movies' ? 'Movies' : 'TV Shows'}
            </button>
          ))}
        </div>
      </div>

      {(tab === 'all' || tab === 'movies') && (
        <MediaRow
          title="Latest Movies"
          endpoint="/api/movies?source=local&limit=18"
          kind="movie"
        />
      )}
      {(tab === 'all' || tab === 'tv') && (
        <MediaRow
          title="Latest TV Shows"
          endpoint="/api/tv?source=local&limit=18"
          kind="tv"
        />
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="px-6 py-20 text-[var(--color-text-dim)]">Loading library...</div>}>
      <HomeInner />
    </Suspense>
  );
}
