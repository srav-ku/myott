'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Megaphone, Info, Zap, AlertTriangle, ChevronRight } from 'lucide-react';
import Link from 'next/link';

type Update = {
  id: number;
  message: string;
  type: 'info' | 'release' | 'alert';
  createdAt: string;
};

function parseDate(val: any) {
  if (!val) return new Date();
  const n = Number(val);
  if (isNaN(n)) return new Date(val);
  return n < 10000000000 ? new Date(n * 1000) : new Date(n);
}

export function UpdatesSection() {
  const [updates, setUpdates] = useState<Update[] | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const r = await api<{ updates: Update[] }>('/api/updates');
        if (r.ok) {
          setUpdates(r.data.updates?.slice(0, 5) || []);
        } else {
          setUpdates([]);
        }
      } catch (err) {
        console.error('Failed to fetch updates:', err);
        setUpdates([]);
      }
    })();
  }, []);

  if (updates === null) return null;

  return (
    <div className="px-4 sm:px-6">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Megaphone size={20} className="text-[var(--color-brand)]" />
            Latest Updates
          </h2>
          {updates.length > 0 && (
            <Link
              href="/updates"
              className="text-sm text-[var(--color-text-dim)] hover:text-white flex items-center gap-1 group transition-colors"
            >
              View All
              <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}
        </div>

        {updates.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-[var(--color-border)] rounded-xl text-[var(--color-text-dim)] text-sm">
            No updates available at the moment.
          </div>
        ) : (
          <div className="grid gap-3">
            {updates.map((u) => (
              <div
                key={u.id}
                className="flex items-start gap-4 p-4 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-white/20 transition-all"
              >
                <div className="mt-0.5">
                  {u.type === 'release' ? (
                    <Zap size={18} className="text-green-400" />
                  ) : u.type === 'alert' ? (
                    <AlertTriangle size={18} className="text-red-400" />
                  ) : (
                    <Info size={18} className="text-blue-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white/90 leading-relaxed">
                    {u.message}
                  </div>
                  <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-dim)]">
                    {parseDate(u.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
