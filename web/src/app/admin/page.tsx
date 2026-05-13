'use client';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Search, Loader2, ArrowRight, Tv, Film } from 'lucide-react';
import BulkImport from '@/components/BulkImport';

type Result = {
  kind?: 'movie' | 'tv';
  type?: 'movie' | 'tv';
  tmdb_id: number;
  title?: string | null;
  name?: string | null;
  poster_url: string | null;
  release_date?: string | null;
  first_air_date?: string | null;
};

type Stats = {
  moviesWithoutLinks: number;
  tvMissingEpisodes: number;
};

function ContentDashboard() {
  const sp = useSearchParams();
  const [tab, setTab] = useState<'movie' | 'tv'>(
    (sp.get('tab') as 'tv') === 'tv' ? 'tv' : 'movie',
  );
  const source = sp.get('source') === 'tmdb' ? 'tmdb' : 'local';
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  async function loadStats() {
    const r = await api<{ stats: Stats }>('/api/admin/stats');
    if (r.ok) setStats(r.data.stats);
  }

  async function loadDefault() {
    setLoading(true);
    const ep =
      tab === 'movie'
        ? `/api/movies?source=${source}&limit=24`
        : `/api/tv?source=${source}&limit=24`;
    const r = await api<{ results: Result[] }>(ep);
    setLoading(false);
    if (r.ok) {
      setResults(r.data.results.map((x) => ({ ...x, kind: tab })));
    }
  }

  async function search() {
    if (!q.trim()) {
      void loadDefault();
      return;
    }
    setLoading(true);
    const r = await api<{ results: (Result & { in_db?: boolean })[] }>(
      `/api/search?q=${encodeURIComponent(q)}&type=${tab}&limit=40`,
    );
    setLoading(false);
    if (r.ok) {
      if (source === 'local') {
        setResults(r.data.results.filter((x) => x.in_db));
      } else {
        setResults(r.data.results);
      }
    }
  }

  async function addToLibrary(tmdbId: number, kind: 'movie' | 'tv') {
    const r = await api(`/api/${kind === 'movie' ? 'movies' : 'tv'}/${tmdbId}`);
    if (r.ok) {
      alert(`Successfully added to Library!`);
      // Update UI to show it's in DB now
      setResults(prev => prev.map(item => item.tmdb_id === tmdbId ? { ...item, in_db: true } : item));
    } else {
      alert(r.error || 'Failed to add to library');
    }
  }

  useEffect(() => {
    void loadStats();
  }, []);

  useEffect(() => {
    if (q.trim()) {
      void search();
    } else {
      void loadDefault();
    }
  }, [tab, source]);

  return (
    <div className="space-y-12">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-4">
          <div className="inline-flex rounded-lg bg-surface border border-border p-1">
            {(['movie', 'tv'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${
                  tab === t
                    ? 'bg-brand text-white'
                    : 'text-text-dim hover:text-white'
                }`}
              >
                {t === 'movie' ? <Film size={14} /> : <Tv size={14} />}
                {t === 'movie' ? 'Movies' : 'TV'}
              </button>
            ))}
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void search();
          }}
          className="flex-1 max-w-md relative"
        >
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${tab === 'movie' ? 'movies' : 'TV shows'}…`}
            className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-brand transition-all"
          />
        </form>
      </div>

      <BulkImport />

      {loading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="animate-spin text-brand" />
        </div>
      ) : (
        <div className="grid gap-2">
          {results.map((r) => {
            const k = r.kind ?? r.type ?? tab;
            const title = r.title ?? r.name ?? '(untitled)';
            const href =
              k === 'movie'
                ? `/admin/manage/movie/${r.tmdb_id}`
                : `/admin/manage/tv/${r.tmdb_id}`;
            const year =
              (r.release_date ?? r.first_air_date)?.slice(0, 4) ?? null;
            return (
              <div
                key={`${k}-${r.tmdb_id}`}
                className="flex items-center gap-3 p-2 bg-surface rounded-xl border border-border group transition-all relative"
              >
                {/* Image */}
                <div className="w-10 h-14 shrink-0 rounded-lg overflow-hidden bg-bg">
                  {r.poster_url && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={r.poster_url}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-bold truncate">{title}</div>
                    {source === 'tmdb' && (r as any).in_db && (
                      <span className="text-[8px] bg-green-500/20 text-green-400 px-1 py-0.5 rounded border border-green-500/30 uppercase font-black">
                        In Library
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-text-dim">
                    {k === 'movie' ? 'Movie' : 'TV'} · TMDB #{r.tmdb_id}
                    {year && ` · ${year}`}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 px-2 relative z-10">
                  {(r as any).in_db || source === 'local' ? (
                    <Link
                      href={href}
                      className="text-xs bg-brand hover:bg-brand-hover text-white px-4 py-1.5 rounded-md font-medium transition-colors"
                    >
                      Edit
                    </Link>
                  ) : (
                    <button
                      onClick={() => addToLibrary(r.tmdb_id, k as any)}
                      className="text-xs border border-brand text-brand hover:bg-brand hover:text-white px-4 py-1.5 rounded-md font-medium transition-colors"
                    >
                      Add to Library
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="flex items-center gap-2 text-text-dim"><Loader2 className="animate-spin" size={16} /> Loading content...</div>}>
      <ContentDashboard />
    </Suspense>
  );
}
