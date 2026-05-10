'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, tmdbPoster } from '@/lib/api';
import { MediaCard } from '@/components/MediaCard';
import { Loader2, Search } from 'lucide-react';

type SearchItem = {
  type: 'movie' | 'tv';
  tmdb_id: number;
  title: string;
  poster_url?: string | null;
  rating?: number | null;
  release_date?: string | null;
  in_db: boolean;
};

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
    <div className="px-4 sm:px-6 space-y-5 pb-20">
      <h1 className="text-2xl font-semibold">
        {q ? (
          <>
            Search results for <span className="text-brand">&ldquo;{q}&rdquo;</span>
          </>
        ) : lang ? (
          <>
            Results in <span className="text-brand">{lang}</span>
          </>
        ) : genre ? (
          <>
            <span className="text-brand">{genre}</span> titles
          </>
        ) : (
          'Search'
        )}
      </h1>

      {!hasAnyFilter ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-dim">
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
          <div className="flex items-center gap-2 text-sm text-text-dim">
            <Loader2 size={16} className="animate-spin" />
            Searching library...
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-2/3 skeleton rounded-lg" />
            ))}
          </div>
        </div>
      ) : items && items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center border border-dashed border-border rounded-3xl bg-surface/30">
          <div className="text-2xl font-bold mb-2">No results found</div>
          <p className="text-text-dim max-w-sm">
            We couldn&apos;t find anything matching your filters in the library.
          </p>
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
                      <span className="w-1.5 h-6 bg-brand rounded-full" />
                      Movies
                      <span className="text-sm font-normal text-text-dim">
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

                {tvShows.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <span className="w-1.5 h-6 bg-blue-500 rounded-full" />
                      TV Shows
                      <span className="text-sm font-normal text-text-dim">
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
    <Suspense fallback={<div className="px-6 py-12 flex items-center gap-2 text-text-dim"><Loader2 size={18} className="animate-spin" /> Loading search...</div>}>
      <SearchInner />
    </Suspense>
  );
}
