'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { AdminGuard } from '@/components/AdminGuard';
import { Film, Tv, Flag, MessageSquare, ArrowRight, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

type Report = {
  id: number;
  contentType: string;
  contentId: number;
  issueType: string;
  message: string | null;
  status: string;
  reportedBy: string | null;
  createdAt: number;
};
type CR = {
  id: number;
  query: string;
  count: number;
  status: string;
  lastRequestedAt: number;
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
  const [tab, setTab] = useState<'overview' | 'reports' | 'requests' | 'attention'>('overview');
  return (
    <div className="px-4 sm:px-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin Panel</h1>
        <p className="text-sm text-[var(--color-text-dim)]">
          Manage streams, episodes, reports, and content requests.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <NavCard
          href="/admin/manage"
          icon={<Film size={22} />}
          title="Manage Movies"
          desc="Pick any movie and add/remove streaming links."
        />
        <NavCard
          href="/admin/manage?tab=tv"
          icon={<Tv size={22} />}
          title="Manage TV Shows"
          desc="Edit seasons & episodes. Bulk import via CSV."
        />
        <NavCard
          href="#"
          onClick={() => setTab('attention')}
          icon={<AlertCircle size={22} />}
          title="Needs Attention"
          desc="Movies & TV missing streaming links."
        />
        <NavCard
          href="#"
          onClick={() => setTab('reports')}
          icon={<Flag size={22} />}
          title="User Reports"
          desc="Review broken-stream reports."
        />
      </div>

      <div className="border-b border-[var(--color-border)] flex gap-1 overflow-x-auto no-scrollbar">
        {(['overview', 'attention', 'reports', 'requests'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm border-b-2 whitespace-nowrap ${
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
          <div className="text-sm text-[var(--color-text-dim)]">All movies have links!</div>
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
                    <img src={m.poster_url} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{m.title}</div>
                  <div className="text-xs text-[var(--color-text-dim)]">
                    TMDB #{m.tmdbId} {m.releaseDate && `· ${m.releaseDate.slice(0, 4)}`}
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
                    <img src={s.poster_url} alt="" className="w-full h-full object-cover" />
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
    if (r.ok) setItems(r.data.reports);
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
        <div className="space-y-2">
          {items.map((r) => (
            <div
              key={r.id}
              className="p-3 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="text-xs text-[var(--color-text-dim)]">
                    #{r.id} · {r.contentType} #{r.contentId} ·{' '}
                    {new Date(r.createdAt * 1000).toLocaleString()}
                  </div>
                  <div className="font-medium mt-0.5">{r.issueType.replace('_', ' ')}</div>
                  {r.message && (
                    <div className="text-sm text-[var(--color-text-dim)] mt-1">
                      {r.message}
                    </div>
                  )}
                  {r.reportedBy && (
                    <div className="text-xs text-[var(--color-text-dim)] mt-1">
                      Reported by: {r.reportedBy}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-medium ${
                      r.status === 'open'
                        ? 'bg-yellow-900/40 text-yellow-300'
                        : r.status === 'resolved'
                          ? 'bg-green-900/40 text-green-300'
                          : 'bg-gray-800 text-gray-300'
                    }`}
                  >
                    {r.status}
                  </span>
                  <select
                    value={r.status}
                    onChange={(e) => setStatus(r.id, e.target.value)}
                    className="text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-1 py-0.5"
                  >
                    {['open', 'resolved'].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
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
    if (r.ok) setItems(r.data.requests);
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
        <div className="space-y-2">
          {items.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 p-3 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]"
            >
              <div className="flex-1">
                <div className="font-medium">{r.query}</div>
                <div className="text-xs text-[var(--color-text-dim)]">
                  {r.count} request{r.count !== 1 ? 's' : ''} · last{' '}
                  {new Date(r.lastRequestedAt * 1000).toLocaleString()}
                </div>
              </div>
              {r.status === 'added' ? (
                <span className="inline-flex items-center gap-1 text-xs text-green-400">
                  <CheckCircle size={14} /> Added
                </span>
              ) : (
                <select
                  value={r.status}
                  onChange={(e) => setStatus(r.id, e.target.value)}
                  className="text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1"
                >
                  {['pending', 'added', 'ignored'].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ))}
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
