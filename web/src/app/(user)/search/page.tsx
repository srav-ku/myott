'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, tmdbPoster } from '@/lib/api';
import { MediaCard } from '@/components/MediaCard';
import AdRenderer from '@/components/AdRenderer';
import { Check, Loader2, Send, Search } from 'lucide-react';

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
  const lang = sp.get('lang') || '';
  const genre = sp.get('genre') || '';

  const [items, setItems] = useState<SearchItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q && !lang && !genre) {
      setItems([]);
      return;
    }
    setLoading(true);
    setErr(null);
    let active = true;

    (async () => {
      let r: any;

      if (q) {
        // Case 1: Text search (optionally with filters)
        const params = new URLSearchParams();
        params.set('q', q);
        if (lang) params.set('lang', lang);
        if (genre) params.set('genre', genre);
        params.set('limit', '40');
        r = await api<{ results: SearchItem[] }>(`/api/search?${params.toString()}`);
      } else if (lang) {
        // Case 2: Language filter only
        r = await api<{ movies: any[]; tv: any[] }>(`/api/filters/language?code=${encodeURIComponent(lang)}`);
      } else if (genre) {
        // Case 3: Genre filter only
        r = await api<{ movies: any[]; tv: any[] }>(`/api/filters/genre?name=${encodeURIComponent(genre)}`);
      }

      if (!active) return;
      setLoading(false);

      if (r.ok) {
        if (q) {
          setItems(r.data.results);
        } else {
          // Normalize filter API results
          const movies = (r.data.movies || []).map((m: any) => ({
            type: 'movie',
            tmdb_id: m.tmdbId,
            title: m.title,
            poster_url: tmdbPoster(m.posterPath),
            rating: m.rating,
            release_date: m.releaseDate,
            in_db: true,
          }));
          const tv = (r.data.tv || []).map((t: any) => ({
            type: 'tv',
            tmdb_id: t.tmdbId,
            title: t.name,
            poster_url: tmdbPoster(t.posterPath),
            rating: t.rating,
            release_date: t.firstAirDate,
            in_db: true,
          }));
          setItems([...movies, ...tv]);
        }
      } else {
        setErr(r.error);
      }
    })();

    return () => {
      active = false;
    };
  }, [q, lang, genre]);

  const hasAnyFilter = q || lang || genre;

  return (
    <div className="px-4 sm:px-6 space-y-5">
      <h1 className="text-2xl font-semibold">
        {q ? (
          <>
            Search results for <span className="text-[var(--color-brand)]">&ldquo;{q}&rdquo;</span>
          </>
        ) : lang ? (
          <>
            Results in <span className="text-[var(--color-brand)]">{lang}</span>
          </>
        ) : genre ? (
          <>
            <span className="text-[var(--color-brand)]">{genre}</span> titles
          </>
        ) : (
          'Search'
        )}
      </h1>

      {!hasAnyFilter ? (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--color-text-dim)]">
          <Search size={48} className="mb-4 opacity-20" />
          <p>Type a title in the search bar above.</p>
        </div>
      ) : err ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-red-400">
          <div className="font-bold mb-1">Search failed</div>
          <div className="text-sm">{err}</div>
        </div>
      ) : loading ? (
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-dim)]">
            <Loader2 size={16} className="animate-spin" />
            Searching...
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] skeleton rounded-lg" />
            ))}
          </div>
        </div>
      ) : items && items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-[var(--color-border)] rounded-2xl bg-[var(--color-surface)]/30">
          <div className="text-lg font-medium mb-1">No results found</div>
          <p className="text-[var(--color-text-dim)] mb-6 max-w-xs">
            We couldn&apos;t find anything matching your filters. {q && 'Would you like to request it?'}
          </p>
          {q && <RequestContentButton query={q} />}
        </div>
      ) : items ? (
        <div className="space-y-10">
          {(() => {
            const movies = items.filter((it) => it.type === 'movie');
            const tvShows = items.filter((it) => it.type === 'tv');

            return (
              <>
                {movies.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <span className="w-1.5 h-6 bg-[var(--color-brand)] rounded-full" />
                      Movies
                      <span className="text-sm font-normal text-[var(--color-text-dim)]">
                        ({movies.length})
                      </span>
                    </h2>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                      {movies.map((it) => (
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
                  </div>
                )}

                {(movies.length > 0 || tvShows.length > 0) && (
                  <AdRenderer position="search_inline" />
                )}

                {tvShows.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <span className="w-1.5 h-6 bg-blue-500 rounded-full" />
                      TV Shows
                      <span className="text-sm font-normal text-[var(--color-text-dim)]">
                        ({tvShows.length})
                      </span>
                    </h2>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                      {tvShows.map((it) => (
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
                  </div>
                )}
              </>
            );
          })()}
        </div>
      ) : null}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="px-6 py-12 flex items-center gap-2 text-[var(--color-text-dim)]"><Loader2 size={18} className="animate-spin" /> Loading search...</div>}>
      <SearchInner />
    </Suspense>
  );
}
