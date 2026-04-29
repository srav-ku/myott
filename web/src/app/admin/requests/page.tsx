'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Loader2 } from 'lucide-react';

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

export default function RequestsPage() {
  const [items, setItems] = useState<CR[] | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'added' | 'ignored'>('pending');

  async function load() {
    const q = filter === 'all' ? '' : `?status=${filter}`;
    const r = await api<{ requests: CR[] }>(`/api/admin/content-requests${q}`);
    if (r.ok) {
      const sorted = [...r.data.requests].sort((a, b) => b.count - a.count);
      setItems(sorted);
    }
  }

  useEffect(() => {
    setItems(null);
    void load();
  }, [filter]);

  async function setStatus(id: number, status: string) {
    await api(`/api/admin/content-requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    void load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Content Requests</h1>
        <p className="text-sm text-[var(--color-text-dim)]">Monitor what users are searching for and can&apos;t find.</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(['all', 'pending', 'added', 'ignored'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === s
                ? 'bg-[var(--color-brand)] text-white'
                : 'bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-white'
            }`}
          >
            {s.toUpperCase()}
          </button>
        ))}
      </div>

      {!items ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="animate-spin text-[var(--color-brand)]" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-[var(--color-text-dim)] text-sm py-12 text-center border border-dashed border-[var(--color-border)] rounded-xl">
          No requests found.
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
                    className="text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-2 py-1.5 font-bold outline-none"
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
