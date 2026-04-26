'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { MediaCard } from '@/components/MediaCard';

type SearchItem = {
  kind: 'movie' | 'tv';
  tmdb_id: number;
  title: string;
  poster_path?: string | null;
  vote_average?: number | null;
  release_year?: number | null;
  first_air_year?: number | null;
};

function SearchInner() {
  const sp = useSearchParams();
  const q = sp.get('q') || '';
  const [items, setItems] = useState<SearchItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!q) {
      setItems([]);
      return;
    }
    setItems(null);
    setErr(null);
    let active = true;
    (async () => {
      const r = await api<{ results: SearchItem[] }>(
        `/api/search?q=${encodeURIComponent(q)}&limit=40`,
      );
      if (!active) return;
      if (r.ok) setItems(r.data.results);
      else setErr(r.error);
    })();
    return () => {
      active = false;
    };
  }, [q]);

  return (
    <div className="px-4 sm:px-6 space-y-5">
      <h1 className="text-2xl font-semibold">
        {q ? (
          <>
            Search results for{' '}
            <span className="text-[var(--color-brand)]">&ldquo;{q}&rdquo;</span>
          </>
        ) : (
          'Search'
        )}
      </h1>
      {!q ? (
        <p className="text-[var(--color-text-dim)]">Type a title in the search bar.</p>
      ) : err ? (
        <div className="text-[var(--color-brand)]">{err}</div>
      ) : !items ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] skeleton" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-[var(--color-text-dim)]">
          No matches. (Your search has been logged — admins may add it later.)
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {items.map((it) => (
            <MediaCard key={`${it.kind}-${it.tmdb_id}`} {...it} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="px-6">Loading…</div>}>
      <SearchInner />
    </Suspense>
  );
}
