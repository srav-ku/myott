'use client';
import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Search, Loader2, ArrowRight, Tv, Film } from 'lucide-react';

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

function Inner() {
  const sp = useSearchParams();
  const [tab, setTab] = useState<'movie' | 'tv'>(
    (sp.get('tab') as 'tv') === 'tv' ? 'tv' : 'movie',
  );
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

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
    if (q.trim()) {
      void search();
    } else {
      void loadDefault();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Manage Content</h1>
          <p className="text-sm text-[var(--color-text-dim)]">
            Pick a title to add or edit streaming links.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="inline-flex rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] p-1">
          {(['movie', 'tv'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded text-sm flex items-center gap-1.5 ${
                tab === t
                  ? 'bg-[var(--color-brand)] text-white'
                  : 'text-[var(--color-text-dim)]'
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
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md pl-9 pr-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
          />
        </form>
      </div>

      {loading ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="animate-spin" />
        </div>
      ) : results.length === 0 ? (
        <div className="text-[var(--color-text-dim)]">No results.</div>
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
                className="flex items-center gap-3 p-2 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] hover:border-white"
              >
                <div className="w-10 h-14 flex-shrink-0 rounded overflow-hidden bg-[var(--color-bg)]">
                  {r.poster_url && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={r.poster_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{title}</div>
                  <div className="text-xs text-[var(--color-text-dim)]">
                    {k === 'movie' ? 'Movie' : 'TV'} · TMDB #{r.tmdb_id}
                    {year && ` · ${year}`}
                  </div>
                </div>
                <ArrowRight size={16} className="text-[var(--color-text-dim)]" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ManagePage() {
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <Inner />
    </Suspense>
  );
}
