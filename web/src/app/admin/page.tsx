'use client';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
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
  const router = useRouter();
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
    } else if (source === 'local') {
      void loadDefault();
    } else {
      setResults([]);
    }
  }, [tab, source]);

  async function addAndManage(tmdbId: number, kind: 'movie' | 'tv') {
    setLoading(true);
    try {
      const r = await api(`/api/${kind === 'movie' ? 'movies' : 'tv'}/${tmdbId}`);
      if (r.ok) {
        // Clear loading before pushing to allow immediate feedback
        setLoading(false);
        router.push(`/admin/manage/${kind}/${tmdbId}`);
      } else {
        alert(r.error || 'Failed to add to library');
        setLoading(false);
      }
    } catch (err) {
      console.error('Quick Add Error:', err);
      alert('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header Row: Tabs & Search */}
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between bg-surface border border-border p-6 rounded-2xl shadow-xl shadow-black/20">
        <div className="inline-flex rounded-xl bg-bg border border-border p-1.5 self-start">
          {(['movie', 'tv'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                tab === t
                  ? 'bg-brand text-white shadow-lg shadow-brand/40'
                  : 'text-text-dim hover:text-white'
              }`}
            >
              {t === 'movie' ? 'Movies' : 'TV Series'}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void search();
          }}
          className="w-full md:max-w-md relative group"
        >
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim group-focus-within:text-brand transition-colors"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Find ${tab === 'movie' ? 'movies' : 'series'} to add...`}
            className="w-full bg-bg border border-border rounded-xl pl-12 pr-4 py-3 text-sm font-medium outline-none focus:border-brand/50 focus:ring-4 focus:ring-brand/5 transition-all"
          />
        </form>
      </div>

      {/* Results Section (Scrollable) */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden flex flex-col min-h-[400px] max-h-[600px]">
        <div className="px-6 py-4 border-b border-border bg-white/2 flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-dim">
            {source === 'local' ? 'Library Content' : 'Search Results'}
          </span>
          {loading && <Loader2 className="animate-spin text-brand" size={16} />}
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {!loading && results.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-text-dim gap-3 opacity-50 py-20">
              <Search size={40} strokeWidth={1} />
              <p className="text-sm font-medium">
                {source === 'local' ? 'Your library is empty' : 'Search for something to discover'}
              </p>
            </div>
          )}

          <div className="grid gap-3">
            {results.map((r) => {
              const k = r.kind ?? r.type ?? tab;
              const title = r.title ?? r.name ?? '(untitled)';
              const inDb = (r as any).in_db || source === 'local';
              
              return (
                <div
                  key={`${k}-${r.tmdb_id}`}
                  className="group flex items-center gap-4 bg-bg/50 border border-border rounded-xl p-3 hover:border-white/20 transition-all duration-300"
                >
                  <div className="w-12 h-16 shrink-0 rounded-lg overflow-hidden bg-bg shadow-lg">
                    {r.poster_url ? (
                      <img src={r.poster_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Film size={20} className="text-text-dim" /></div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-bold text-sm truncate">{title}</div>
                      {inDb && source === 'tmdb' && (
                        <span className="text-[8px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30 uppercase font-black tracking-wider">
                          In Library
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-text-dim uppercase tracking-widest font-bold mt-0.5">
                      {k === 'movie' ? 'Movie' : 'TV Series'} · TMDB #{r.tmdb_id}
                      {(r.release_date || r.first_air_date) && ` · ${(r.release_date || r.first_air_date)?.slice(0, 4)}`}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {inDb ? (
                      <Link
                        href={k === 'movie' ? `/admin/manage/movie/${r.tmdb_id}` : `/admin/manage/tv/${r.tmdb_id}`}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
                      >
                        Manage
                      </Link>
                    ) : (
                      <button
                        onClick={() => void addAndManage(r.tmdb_id, k as any)}
                        className="px-4 py-2 bg-brand text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all shadow-lg shadow-brand/20 hover:scale-[1.05] active:scale-95"
                      >
                        Add & Manage
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bulk Import (Lower Priority) */}
      {source === 'tmdb' && (
        <div className="opacity-80 hover:opacity-100 transition-opacity">
          <BulkImport />
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
