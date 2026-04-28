'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { AdminGuard } from '@/components/AdminGuard';
import {
  Film,
  Tv,
  Flag,
  MessageSquare,
  ArrowRight,
  Loader2,
  CheckCircle,
  AlertCircle,
  Zap,
  TrendingUp,
  Clock,
} from 'lucide-react';

type Report = {
  id: number;
  contentType: 'movie' | 'episode';
  contentId: number;
  issueType: string;
  message: string | null;
  status: string;
  createdAt: number;
  reportCount: number;
  movieTitle?: string;
  movieTmdbId?: number;
  tvName?: string;
  tvTmdbId?: number;
  epTitle?: string;
  epSeason?: number;
  epNumber?: number;
  epTvName?: string;
};
type CR = {
  id: number;
  query: string | null;
  tmdbId: number | null;
  contentType: 'movie' | 'tv' | null;
  title: string | null;
  reason: 'not_found' | 'missing_links';
  count: number;
  status: string;
  lastRequestedAt: number;
};

type Stats = {
  moviesWithoutLinks: number;
  tvMissingEpisodes: number;
  pendingReports: number;
  pendingRequests: number;
};

type StatsData = {
  stats: Stats;
  topReported: Report[];
  topRequested: CR[];
};

type AttentionData = {
  movies: {
    id: number;
    tmdbId: number;
    title: string;
    poster_url: string;
    releaseDate: string | null;
  }[];
  tv: {
    id: number;
    tmdbId: number;
    name: string;
    poster_url: string;
    numberOfSeasons: number | null;
  }[];
};

function Dashboard() {
  const [tab, setTab] = useState<
    'overview' | 'reports' | 'requests' | 'attention'
  >('overview');
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    void (async () => {
      const r = await api<StatsData>('/api/admin/stats');
      if (r.ok) setStats(r.data);
    })();
  }, []);

  return (
    <div className="px-4 sm:px-6 space-y-8 pb-12">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Admin Panel</h1>
          <p className="text-sm text-[var(--color-text-dim)]">
            Manage streams, episodes, reports, and content requests.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/manage"
            className="bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
          >
            Manage Content
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Pending Reports"
          value={stats?.stats.pendingReports ?? '..'}
          icon={<Flag size={20} />}
          color="text-red-400"
          onClick={() => setTab('reports')}
        />
        <StatsCard
          label="Content Requests"
          value={stats?.stats.pendingRequests ?? '..'}
          icon={<MessageSquare size={20} />}
          color="text-blue-400"
          onClick={() => setTab('requests')}
        />
        <StatsCard
          label="Movies Missing Links"
          value={stats?.stats.moviesWithoutLinks ?? '..'}
          icon={<Film size={20} />}
          color="text-orange-400"
          onClick={() => setTab('attention')}
        />
        <StatsCard
          label="TV Missing Links"
          value={stats?.stats.tvMissingEpisodes ?? '..'}
          icon={<Tv size={20} />}
          color="text-purple-400"
          onClick={() => setTab('attention')}
        />
      </div>

      {tab === 'overview' && stats && (
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Fix Now Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 font-bold text-lg text-red-400">
              <Zap size={20} fill="currentColor" />
              FIX NOW (Top Reported)
            </div>
            <div className="space-y-3">
              {stats.topReported.length === 0 ? (
                <div className="p-8 text-center bg-[var(--color-surface)] rounded-xl border border-dashed border-[var(--color-border)] text-[var(--color-text-dim)]">
                  No pending reports!
                </div>
              ) : (
                stats.topReported.map((r) => {
                  const title =
                    r.contentType === 'movie'
                      ? r.movieTitle
                      : `${r.epTvName} S${r.epSeason}E${r.epNumber}`;
                  const manageHref =
                    r.contentType === 'movie'
                      ? `/admin/manage/movie/${r.movieTmdbId}`
                      : `/admin/manage/tv/${r.tvTmdbId}`;

                  return (
                    <div
                      key={`${r.contentType}-${r.contentId}`}
                      className="p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <div className="font-bold truncate">{title}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <SeverityBadge count={r.count} />
                          <span className="text-[10px] uppercase font-bold text-[var(--color-text-dim)]">
                            {r.issueType.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                      <Link
                        href={manageHref}
                        className="flex-shrink-0 bg-white text-black px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors"
                      >
                        FIX
                      </Link>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Add Next Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 font-bold text-lg text-blue-400">
              <TrendingUp size={20} />
              ADD NEXT (Top Requested)
            </div>
            <div className="space-y-3">
              {stats.topRequested.length === 0 ? (
                <div className="p-8 text-center bg-[var(--color-surface)] rounded-xl border border-dashed border-[var(--color-border)] text-[var(--color-text-dim)]">
                  No active requests.
                </div>
              ) : (
                stats.topRequested.map((r) => {
                  const manageHref =
                    r.tmdbId && r.contentType
                      ? `/admin/manage/${r.contentType}/${r.tmdbId}`
                      : null;

                  return (
                    <div
                      key={r.id}
                      className="p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <div className="font-bold truncate">
                          {r.title || r.query}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-bold">
                            {r.count} REQUESTS
                          </span>
                          <span className="text-[10px] uppercase font-bold text-[var(--color-text-dim)]">
                            {r.contentType || 'Unknown'}
                          </span>
                        </div>
                      </div>
                      {manageHref && (
                        <Link
                          href={manageHref}
                          className="flex-shrink-0 border border-[var(--color-border)] hover:border-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                        >
                          MANAGE
                        </Link>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      <div className="border-b border-[var(--color-border)] flex gap-1 overflow-x-auto no-scrollbar">
        {(['overview', 'attention', 'reports', 'requests'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm border-b-2 whitespace-nowrap transition-all ${
              tab === t
                ? 'border-[var(--color-brand)] text-white'
                : 'border-transparent text-[var(--color-text-dim)] hover:text-white'
            }`}
          >
            {t === 'overview'
              ? 'Overview'
              : t === 'attention'
                ? 'Needs Attention'
                : t === 'reports'
                  ? 'Reports'
                  : 'Requests'}
          </button>
        ))}
      </div>

      {tab === 'overview' && <Overview />}
      {tab === 'attention' && <AttentionTab />}
      {tab === 'reports' && <ReportsTab />}
      {tab === 'requests' && <RequestsTab />}
    </div>
  );
}

function StatsCard({
  label,
  value,
  icon,
  color,
  onClick,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-left hover:border-white transition-all group"
    >
      <div className={`${color} mb-2 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-[10px] uppercase font-bold text-[var(--color-text-dim)] tracking-wider mt-0.5">
        {label}
      </div>
    </button>
  );
}

function SeverityBadge({ count }: { count: number }) {
  if (count >= 5) {
    return (
      <span className="flex items-center gap-1 text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        CRITICAL ({count})
      </span>
    );
  }
  if (count >= 2) {
    return (
      <span className="flex items-center gap-1 text-[10px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded font-bold">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
        MODERATE ({count})
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-bold">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
      LOW ({count})
    </span>
  );
}

function NavCard({
  href,
  onClick,
  icon,
  title,
  desc,
}: {
  href: string;
  onClick?: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  const inner = (
    <div className="flex items-start gap-3">
      <div className="text-[var(--color-brand)]">{icon}</div>
      <div className="flex-1">
        <div className="font-medium">{title}</div>
        <div className="text-xs text-[var(--color-text-dim)] mt-0.5">{desc}</div>
      </div>
      <ArrowRight size={16} className="text-[var(--color-text-dim)] mt-1" />
    </div>
  );
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="text-left p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-white"
      >
        {inner}
      </button>
    );
  }
  return (
    <Link
      href={href}
      className="block p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-white"
    >
      {inner}
    </Link>
  );
}

function Overview() {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-sm space-y-3">
      <h3 className="font-semibold text-base">How to use the admin panel</h3>
      <ol className="list-decimal pl-5 space-y-1.5 text-[var(--color-text-dim)]">
        <li>
          <strong className="text-white">Manage movies/TV:</strong> search the
          catalogue → open the title → add stream links (direct .mp4/.m3u8 URLs or
          extract URLs).
        </li>
        <li>
          <strong className="text-white">TV episodes:</strong> add one-by-one or
          paste a CSV (season, episode, title, primary_stream_url, quality,
          languages).
        </li>
        <li>
          <strong className="text-white">Reports:</strong> users can flag broken
          streams from any title page — review and mark resolved here.
        </li>
        <li>
          <strong className="text-white">Requests:</strong> when users search for
          something we don&apos;t have, it&apos;s logged here. Mark as added /
          rejected.
        </li>
      </ol>
    </div>
  );
}

function AttentionTab() {
  const [data, setData] = useState<AttentionData | null>(null);
  useEffect(() => {
    void (async () => {
      const r = await api<AttentionData>('/api/admin/needs-attention');
      if (r.ok) setData(r.data);
    })();
  }, []);

  if (!data) return <Loader2 className="animate-spin" />;

  return (
    <div className="space-y-8 pb-12">
      <section>
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          <Film size={20} className="text-[var(--color-brand)]" />
          Movies without links ({data.movies.length})
        </h3>
        {data.movies.length === 0 ? (
          <div className="text-sm text-[var(--color-text-dim)]">
            All movies have links!
          </div>
        ) : (
          <div className="grid gap-2">
            {data.movies.map((m) => (
              <Link
                key={m.id}
                href={`/admin/manage/movie/${m.tmdbId}`}
                className="flex items-center gap-3 p-2 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] hover:border-white group"
              >
                <div className="w-10 h-14 bg-[var(--color-bg)] rounded overflow-hidden flex-shrink-0">
                  {m.poster_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.poster_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{m.title}</div>
                  <div className="text-xs text-[var(--color-text-dim)]">
                    TMDB #{m.tmdbId}{' '}
                    {m.releaseDate && `· ${m.releaseDate.slice(0, 4)}`}
                  </div>
                </div>
                <div className="text-xs font-medium text-[var(--color-brand)] opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity px-2">
                  Add Links <ArrowRight size={14} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          <Tv size={20} className="text-[var(--color-brand)]" />
          TV Shows with missing links ({data.tv.length})
        </h3>
        {data.tv.length === 0 ? (
          <div className="text-sm text-[var(--color-text-dim)]">
            All episodes have links!
          </div>
        ) : (
          <div className="grid gap-2">
            {data.tv.map((s) => (
              <Link
                key={s.id}
                href={`/admin/manage/tv/${s.tmdbId}`}
                className="flex items-center gap-3 p-2 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] hover:border-white group"
              >
                <div className="w-10 h-14 bg-[var(--color-bg)] rounded overflow-hidden flex-shrink-0">
                  {s.poster_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.poster_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{s.name}</div>
                  <div className="text-xs text-[var(--color-text-dim)]">
                    TMDB #{s.tmdbId} · {s.numberOfSeasons} Season
                    {s.numberOfSeasons !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="text-xs font-medium text-[var(--color-brand)] opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity px-2">
                  Add Links <ArrowRight size={14} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ReportsTab() {
  const [items, setItems] = useState<Report[] | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('open');
  async function load() {
    const q = filter === 'all' ? '' : `?status=${filter}`;
    const r = await api<{ reports: Report[] }>(`/api/admin/reports${q}`);
    if (r.ok) {
      // Deduplicate by content + issue since we have partitioned count
      const seen = new Set<string>();
      const deduped = r.data.reports.filter((row) => {
        const key = `${row.contentType}-${row.contentId}-${row.issueType}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      // Sort by count desc
      deduped.sort((a, b) => b.reportCount - a.reportCount);
      setItems(deduped);
    }
  }
  useEffect(() => {
    setItems(null);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);
  async function setStatus(id: number, status: string) {
    await api(`/api/admin/reports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    void load();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {(['all', 'open', 'resolved'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded text-xs ${
              filter === s
                ? 'bg-[var(--color-brand)] text-white'
                : 'bg-[var(--color-surface)] border border-[var(--color-border)]'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      {!items ? (
        <Loader2 className="animate-spin" />
      ) : items.length === 0 ? (
        <div className="text-[var(--color-text-dim)] text-sm py-6">
          No reports.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((r) => {
            const title =
              r.contentType === 'movie'
                ? r.movieTitle
                : `${r.epTvName} S${r.epSeason}E${r.epNumber}`;
            const manageHref =
              r.contentType === 'movie'
                ? `/admin/manage/movie/${r.movieTmdbId}`
                : `/admin/manage/tv/${r.tvTmdbId}`;

            return (
              <div
                key={r.id}
                className="p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] group"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-dim)] mb-1">
                      <span
                        className={
                          r.contentType === 'movie'
                            ? 'text-blue-400'
                            : 'text-purple-400'
                        }
                      >
                        {r.contentType}
                      </span>
                      <span>·</span>
                      <span>
                        {new Date(r.createdAt * 1000).toLocaleString()}
                      </span>
                    </div>
                    <div className="font-bold text-lg truncate">
                      {title || 'Unknown Title'}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <SeverityBadge count={r.reportCount} />
                      <span className="text-xs bg-white/5 text-white px-2 py-0.5 rounded border border-white/10 uppercase font-bold text-[10px]">
                        {r.issueType.replace('_', ' ')}
                      </span>
                    </div>
                    {r.message && (
                      <div className="text-sm text-[var(--color-text-dim)] mt-2 bg-black/20 p-2 rounded border border-white/5 italic">
                        &ldquo;{r.message}&rdquo;
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <select
                      value={r.status}
                      onChange={(e) => setStatus(r.id, e.target.value)}
                      className={`text-xs border rounded-lg px-2 py-1.5 outline-none font-bold ${
                        r.status === 'open'
                          ? 'bg-yellow-900/40 text-yellow-200 border-yellow-500/30'
                          : 'bg-green-900/40 text-green-200 border-green-500/30'
                      }`}
                    >
                      {['open', 'resolved'].map((s) => (
                        <option key={s} value={s}>
                          {s.toUpperCase()}
                        </option>
                      ))}
                    </select>
                    {manageHref && (
                      <Link
                        href={manageHref}
                        className="flex items-center gap-1.5 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-lg shadow-brand/20"
                      >
                        FIX LINK <ArrowRight size={14} />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RequestsTab() {
  const [items, setItems] = useState<CR[] | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'added' | 'ignored'>(
    'pending',
  );
  async function load() {
    const q = filter === 'all' ? '' : `?status=${filter}`;
    const r = await api<{ requests: CR[] }>(`/api/admin/content-requests${q}`);
    if (r.ok) {
      // Sort by count desc
      const sorted = [...r.data.requests].sort((a, b) => b.count - a.count);
      setItems(sorted);
    }
  }
  useEffect(() => {
    setItems(null);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);
  async function setStatus(id: number, status: string) {
    await api(`/api/admin/content-requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    void load();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {(['all', 'pending', 'added', 'ignored'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded text-xs ${
              filter === s
                ? 'bg-[var(--color-brand)] text-white'
                : 'bg-[var(--color-surface)] border border-[var(--color-border)]'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      {!items ? (
        <Loader2 className="animate-spin" />
      ) : items.length === 0 ? (
        <div className="text-[var(--color-text-dim)] text-sm py-6">
          No requests.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((r) => {
            const manageHref =
              r.tmdbId && r.contentType
                ? `/admin/manage/${r.contentType}/${r.tmdbId}`
                : null;

            return (
              <div
                key={r.id}
                className="flex items-center gap-4 p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="font-bold text-lg truncate">
                      {r.title || r.query}
                    </div>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border ${
                        r.reason === 'missing_links'
                          ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }`}
                    >
                      {r.reason === 'missing_links'
                        ? 'Missing Links'
                        : 'Not Found'}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--color-text-dim)] flex items-center gap-2">
                    <span className="bg-white/5 px-1.5 py-0.5 rounded text-white font-bold">
                      {r.count}x
                    </span>
                    <span>·</span>
                    <span>TMDB #{r.tmdbId || 'N/A'}</span>
                    <span>·</span>
                    <span className="capitalize">
                      {r.contentType || 'unknown'}
                    </span>
                    <span>·</span>
                    <span>
                      {new Date(r.lastRequestedAt * 1000).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={r.status}
                    onChange={(e) => setStatus(r.id, e.target.value)}
                    className="text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-2 py-1.5 font-bold"
                  >
                    {['pending', 'added', 'ignored'].map((s) => (
                      <option key={s} value={s}>
                        {s.toUpperCase()}
                      </option>
                    ))}
                  </select>
                  {manageHref && (
                    <Link
                      href={manageHref}
                      className="flex items-center gap-1.5 border border-[var(--color-border)] hover:border-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                    >
                      MANAGE
                    </Link>
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
    <AdminGuard>
      <Dashboard />
    </AdminGuard>
  );
}
