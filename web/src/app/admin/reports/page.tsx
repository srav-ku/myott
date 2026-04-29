'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Loader2, ArrowRight } from 'lucide-react';

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

export default function ReportsPage() {
  const [items, setItems] = useState<Report[] | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('open');

  async function load() {
    const q = filter === 'all' ? '' : `?status=${filter}`;
    const r = await api<{ reports: Report[] }>(`/api/admin/reports${q}`);
    if (r.ok) {
      const seen = new Set<string>();
      const deduped = r.data.reports.filter((row) => {
        const key = `${row.contentType}-${row.contentId}-${row.issueType}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      deduped.sort((a, b) => b.reportCount - a.reportCount);
      setItems(deduped);
    }
  }

  useEffect(() => {
    setItems(null);
    void load();
  }, [filter]);

  async function setStatus(id: number, status: string) {
    await api(`/api/admin/reports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    void load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-sm text-[var(--color-text-dim)]">Review and resolve issues reported by users.</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(['all', 'open', 'resolved'] as const).map((s) => (
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
          No reports found.
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
                      <span className={r.contentType === 'movie' ? 'text-blue-400' : 'text-purple-400'}>
                        {r.contentType}
                      </span>
                      <span>·</span>
                      <span>{new Date(r.createdAt * 1000).toLocaleString()}</span>
                    </div>
                    <div className="font-bold text-lg truncate">
                      {title || 'Unknown Title'}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <SeverityBadge count={r.reportCount} />
                      <span className="text-[10px] bg-white/5 text-white px-2 py-0.5 rounded border border-white/10 uppercase font-bold">
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
                        className="flex items-center gap-1.5 bg-white text-black hover:bg-gray-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                      >
                        FIX <ArrowRight size={14} />
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
