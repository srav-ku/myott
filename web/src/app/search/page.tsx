'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { MediaCard } from '@/components/MediaCard';
import { Check, Loader2, Send } from 'lucide-react';

type SearchItem = {
  type: 'movie' | 'tv';
  tmdb_id: number;
  title: string;
  poster_url?: string | null;
  rating?: number | null;
  release_date?: string | null;
  in_db: boolean;
};

function RequestContentButton({ query }: { query: string }) {
  const [status, setStatus] = useState<'idle' | 'busy' | 'done'>('idle');

  async function handleRequest() {
    if (query.length < 3) return;
    setStatus('busy');
    const r = await api('/api/content-requests', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
    if (r.ok) {
      setStatus('done');
    } else {
      setStatus('idle');
      alert(r.error || 'Failed to submit request');
    }
  }

  if (query.length < 3) return null;

  return (
    <button
      onClick={handleRequest}
      disabled={status !== 'idle'}
      className="flex items-center gap-2 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] disabled:bg-green-600 disabled:opacity-90 transition-colors rounded-full px-6 py-2.5 font-medium text-white shadow-lg shadow-brand/20"
    >
      {status === 'busy' ? (
        <>
          <Loader2 size={18} className="animate-spin" />
          Sending...
        </>
      ) : status === 'done' ? (
        <>
          <Check size={18} />
          Request submitted
        </>
      ) : (
        <>
          <Send size={18} />
          Request this content
        </>
      )}
    </button>
  );
}

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
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-[var(--color-border)] rounded-2xl bg-[var(--color-surface)]/30">
          <div className="text-lg font-medium mb-1">No results found</div>
          <p className="text-[var(--color-text-dim)] mb-6 max-w-xs">
            We couldn&apos;t find anything matching &ldquo;{q}&rdquo;. Would you like to request it?
          </p>
          <RequestContentButton query={q} />
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {items.map((it) => (
            <MediaCard
              key={`${it.type}-${it.tmdb_id}`}
              kind={it.type}
              tmdb_id={it.tmdb_id}
              title={it.title}
              poster_url={it.poster_url}
              rating={it.rating}
              release_year={it.release_date ? parseInt(it.release_date) : undefined}
            />
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
