'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Megaphone, Info, Zap, AlertTriangle, ArrowLeft } from 'lucide-react';
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

export default function UpdatesPage() {
  const [updates, setUpdates] = useState<Update[] | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const r = await api<{ updates: Update[] }>('/api/updates');
        if (r.ok) {
          setUpdates(r.data.updates || []);
        } else {
          setUpdates([]);
        }
      } catch (err) {
        console.error('Failed to fetch updates:', err);
        setUpdates([]);
      }
    })();
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-[var(--color-text-dim)] hover:text-white mb-8 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Home
      </Link>

      <div className="flex items-center gap-3 mb-10">
        <div className="p-3 bg-[var(--color-brand)]/20 rounded-xl text-[var(--color-brand)]">
          <Megaphone size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Updates & Announcements</h1>
          <p className="text-[var(--color-text-dim)]">
            Stay tuned for the latest movies, series, and site updates.
          </p>
        </div>
      </div>

      {!updates ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : updates.length === 0 ? (
        <div className="text-center py-20 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl border-dashed">
          <p className="text-[var(--color-text-dim)]">No updates yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {updates.map((u) => (
            <div
              key={u.id}
              className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]"
            >
              <div className="flex items-center gap-2 mb-3">
                {u.type === 'release' ? (
                  <span className="flex items-center gap-1.5 text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    <Zap size={10} />
                    Release
                  </span>
                ) : u.type === 'alert' ? (
                  <span className="flex items-center gap-1.5 text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    <AlertTriangle size={10} />
                    Alert
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    <Info size={10} />
                    Info
                  </span>
                )}
                <span className="text-[10px] text-[var(--color-text-dim)] font-bold">
                  {parseDate(u.createdAt).toLocaleString(undefined, {
                    dateStyle: 'long',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
              <div className="text-white/90 whitespace-pre-wrap leading-relaxed">
                {u.message}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
