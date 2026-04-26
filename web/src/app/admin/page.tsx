'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { AdminGuard } from '@/components/AdminGuard';
import { Film, Tv, Flag, MessageSquare, ArrowRight, Loader2, CheckCircle } from 'lucide-react';

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

function Dashboard() {
  const [tab, setTab] = useState<'overview' | 'reports' | 'requests'>('overview');
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
          onClick={() => setTab('reports')}
          icon={<Flag size={22} />}
          title="User Reports"
          desc="Review broken-stream reports."
        />
        <NavCard
          href="#"
          onClick={() => setTab('requests')}
          icon={<MessageSquare size={22} />}
          title="Content Requests"
          desc="Searches that returned nothing."
        />
      </div>

      <div className="border-b border-[var(--color-border)] flex gap-1">
        {(['overview', 'reports', 'requests'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm border-b-2 ${
              tab === t
                ? 'border-[var(--color-brand)] text-white'
                : 'border-transparent text-[var(--color-text-dim)] hover:text-white'
            }`}
          >
            {t === 'overview' ? 'Overview' : t === 'reports' ? 'Reports' : 'Requests'}
          </button>
        ))}
      </div>

      {tab === 'overview' && <Overview />}
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
  const [filter, setFilter] = useState<'all' | 'pending' | 'added' | 'rejected'>(
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
        {(['all', 'pending', 'added', 'rejected'] as const).map((s) => (
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
                  {['pending', 'added', 'rejected'].map((s) => (
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
