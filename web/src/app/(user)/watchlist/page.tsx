'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { Loader2, Trash2 } from 'lucide-react';

type Item = {
  watchlist_id: number;
  content_type: 'movie' | 'tv';
  content_id: number;
  tmdb_id: number;
  title: string;
  poster_url: string | null;
};

export default function WatchlistPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const r = await api<{ items: Item[] }>('/api/user/watchlist');
    if (r.ok) setItems(r.data.items);
    else setErr(r.error);
  }

  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }
    void load();
  }, [user]);

  async function remove(id: number) {
    await api(`/api/user/watchlist/${id}`, { method: 'DELETE' });
    setItems((p) => (p ? p.filter((i) => i.watchlist_id !== id) : p));
  }

  if (!user) {
    return (
      <div className="px-6 py-12 text-center">
        <p>Sign in to view your watchlist.</p>
      </div>
    );
  }
  if (err) return <div className="px-6 text-[var(--color-brand)]">{err}</div>;
  if (!items)
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="animate-spin" />
      </div>
    );

  return (
    <div className="px-4 sm:px-6 space-y-5">
      <h1 className="text-2xl font-semibold">My Watchlist</h1>
      {items.length === 0 ? (
        <p className="text-[var(--color-text-dim)]">
          Nothing here yet. Tap the bookmark on any movie or show.
        </p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {items.map((it) => (
            <div key={it.watchlist_id} className="relative group">
              <Link
                href={
                  it.content_type === 'movie'
                    ? `/movies/${it.tmdb_id}`
                    : `/tv/${it.tmdb_id}`
                }
                className="block"
              >
                <div className="aspect-[2/3] rounded-lg overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)]">
                  {it.poster_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={it.poster_url}
                      alt={it.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="grid place-items-center h-full text-sm p-2 text-center">
                      {it.title}
                    </div>
                  )}
                </div>
                <div className="text-sm font-medium mt-1.5 line-clamp-2">{it.title}</div>
              </Link>
              <button
                onClick={() => remove(it.watchlist_id)}
                title="Remove"
                className="absolute top-2 right-2 grid place-items-center w-7 h-7 rounded-full bg-black/70 hover:bg-[var(--color-brand)] opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
