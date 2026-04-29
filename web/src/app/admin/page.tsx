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
  pendingReports: number;
  pendingRequests: number;
};

function ContentDashboard() {
  const sp = useSearchParams();
  const [tab, setTab] = useState<'movie' | 'tv'>(
    (sp.get('tab') as 'tv') === 'tv' ? 'tv' : 'movie',
  );
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
        ? '/api/movies?source=trending&limit=24'
        : '/api/tv?source=trending&limit=24';
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
    const r = await api<{ results: Result[] }>(
      `/api/search?q=${encodeURIComponent(q)}&type=${tab}&limit=40`,
    );
    setLoading(false);
    if (r.ok) setResults(r.data.results);
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
  }, [tab]);

  return (
    <div className="space-y-6">
      {/* Minimal Stats */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-dim)] border-b border-[var(--color-border)] pb-4">
        <div className="flex gap-1.5 items-center">
          <span className="text-white bg-white/10 px-1.5 py-0.5 rounded">{stats?.moviesWithoutLinks ?? '..'}</span> 
          Movies Missing Links
        </div>
        <div className="flex gap-1.5 items-center">
          <span className="text-white bg-white/10 px-1.5 py-0.5 rounded">{stats?.tvMissingEpisodes ?? '..'}</span> 
          TV Missing Links
        </div>
        <div className="flex gap-1.5 items-center">
          <span className="text-white bg-white/10 px-1.5 py-0.5 rounded">{stats?.pendingReports ?? '..'}</span> 
          Reports
        </div>
        <div className="flex gap-1.5 items-center">
          <span className="text-white bg-white/10 px-1.5 py-0.5 rounded">{stats?.pendingRequests ?? '..'}</span> 
          Requests
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="inline-flex rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] p-1">
          {(['movie', 'tv'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${
                tab === t
                  ? 'bg-[var(--color-brand)] text-white'
                  : 'text-[var(--color-text-dim)] hover:text-white'
              }`}
            >
              {t === 'movie' ? <Film size={14} /> : <Tv size={14} />}
              {t === 'movie' ? 'Movies' : 'TV'}
            </button>
          ))}
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
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)]"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${tab === 'movie' ? 'movies' : 'TV shows'}…`}
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-[var(--color-brand)] transition-all"
          />
        </form>
      </div>

      <BulkImport />

      {loading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="animate-spin text-[var(--color-brand)]" />
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
              <Link
                key={`${k}-${r.tmdb_id}`}
                href={href}
                className="flex items-center gap-3 p-2 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] hover:border-white group transition-all"
              >
                <div className="w-10 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-[var(--color-bg)]">
                  {r.poster_url && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={r.poster_url}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{title}</div>
                  <div className="text-xs text-[var(--color-text-dim)]">
                    {k === 'movie' ? 'Movie' : 'TV'} · TMDB #{r.tmdb_id}
                    {year && ` · ${year}`}
                  </div>
                </div>
                <div className="text-[var(--color-text-dim)] group-hover:text-white px-2">
                  <ArrowRight size={18} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="flex items-center gap-2 text-[var(--color-text-dim)]"><Loader2 className="animate-spin" size={16} /> Loading content...</div>}>
      <ContentDashboard />
    </Suspense>
  );
}
