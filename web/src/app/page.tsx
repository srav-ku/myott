'use client';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MediaRow } from '@/components/MediaRow';

function HomeInner() {
  const sp = useSearchParams();
  const [tab, setTab] = useState<'all' | 'movies' | 'tv'>(
    (sp.get('tab') as 'movies' | 'tv') || 'all',
  );

  return (
    <div className="space-y-10">
      <section className="px-4 sm:px-6">
        <div className="rounded-2xl bg-gradient-to-br from-[var(--color-brand)]/30 via-[var(--color-surface-2)] to-[var(--color-bg)] p-8 sm:p-12 border border-[var(--color-border)]">
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">
            Endless movies, TV, and more.
          </h1>
          <p className="mt-3 text-[var(--color-text-dim)] max-w-xl">
            Browse trending titles, build your watchlist, and pick up where you
            left off.
          </p>
        </div>
      </section>

      <div className="px-4 sm:px-6">
        <div className="inline-flex rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] p-1 text-sm">
          {(['all', 'movies', 'tv'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded ${
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
        <>
          <MediaRow
            title="Trending Movies"
            endpoint="/api/movies?category=trending&limit=18"
            kind="movie"
          />
          <MediaRow
            title="Popular Movies"
            endpoint="/api/movies?category=popular&limit=18"
            kind="movie"
          />
        </>
      )}
      {(tab === 'all' || tab === 'tv') && (
        <>
          <MediaRow
            title="Trending TV"
            endpoint="/api/tv?category=trending&limit=18"
            kind="tv"
          />
          <MediaRow
            title="Popular TV"
            endpoint="/api/tv?category=popular&limit=18"
            kind="tv"
          />
        </>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="px-6">Loading…</div>}>
      <HomeInner />
    </Suspense>
  );
}
