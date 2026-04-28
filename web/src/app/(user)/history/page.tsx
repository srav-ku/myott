'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { Loader2, Trash2, Play } from 'lucide-react';

type Item =
  | {
      history_id: number;
      kind: 'movie';
      content_id: number;
      tmdb_id: number;
      title: string;
      poster_url: string | null;
      last_watched_at: number;
    }
  | {
      history_id: number;
      kind: 'episode';
      content_id: number;
      tv_tmdb_id?: number;
      tv_title?: string;
      season: number;
      episode: number;
      title: string;
      poster_url: string | null;
      last_watched_at: number;
    };

export default function HistoryPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[] | null>(null);

  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }
    void (async () => {
      const r = await api<{ items: Item[] }>('/api/user/history');
      if (r.ok) setItems(r.data.items);
    })();
  }, [user]);

  async function remove(id: number) {
    await api(`/api/user/history/${id}`, { method: 'DELETE' });
    setItems((p) => (p ? p.filter((i) => i.history_id !== id) : p));
  }

  if (!user)
    return (
      <div className="px-6 py-12 text-center">Sign in to see your history.</div>
    );
  if (!items)
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="animate-spin" />
      </div>
    );

  return (
    <div className="px-4 sm:px-6 space-y-5">
      <h1 className="text-2xl font-semibold">Continue Watching</h1>
      {items.length === 0 ? (
        <p className="text-[var(--color-text-dim)]">
          Watch something to see it here.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((it) => {
            const watchHref =
              it.kind === 'movie'
                ? `/watch/movie/${it.content_id}`
                : `/watch/episode/${it.content_id}`;
            const detailHref =
              it.kind === 'movie'
                ? `/movies/${it.tmdb_id}`
                : it.tv_tmdb_id
                  ? `/tv/${it.tv_tmdb_id}`
                  : null;
            return (
              <div
                key={it.history_id}
                className="flex gap-3 p-3 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]"
              >
                <Link
                  href={detailHref ?? watchHref}
                  className="w-24 sm:w-28 aspect-[2/3] rounded overflow-hidden flex-shrink-0 bg-[var(--color-bg)]"
                >
                  {it.poster_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.poster_url} alt="" className="w-full h-full object-cover" />
                  ) : null}
                </Link>
                <div className="flex-1 min-w-0">
                  {it.kind === 'episode' ? (
                    <>
                      <div className="text-xs text-[var(--color-text-dim)]">
                        S{it.season} · E{it.episode}
                      </div>
                      <div className="font-medium">{it.tv_title}</div>
                      <div className="text-sm text-[var(--color-text-dim)]">
                        {it.title}
                      </div>
                    </>
                  ) : (
                    <div className="font-medium">{it.title}</div>
                  )}
                  <div className="text-xs text-[var(--color-text-dim)] mt-1">
                    Last watched: {new Date(it.last_watched_at * 1000).toLocaleString()}
                  </div>
                </div>
                <div className="self-center flex flex-col gap-1.5">
                  <Link
                    href={watchHref}
                    className="inline-flex items-center gap-1.5 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] rounded-md px-3 py-1.5 text-sm"
                  >
                    <Play size={14} fill="white" /> Resume
                  </Link>
                  <button
                    onClick={() => remove(it.history_id)}
                    className="inline-flex items-center gap-1.5 border border-[var(--color-border)] hover:border-white rounded-md px-3 py-1.5 text-xs text-[var(--color-text-dim)]"
                  >
                    <Trash2 size={12} /> Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
