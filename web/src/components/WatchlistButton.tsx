'use client';
import { useEffect, useState } from 'react';
import { Bookmark, BookmarkCheck, Loader2 } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { api } from '@/lib/api';

type Props = {
  kind: 'movie' | 'tv';
  contentId: number;
};

export function WatchlistButton({ kind, contentId }: Props) {
  const { user } = useAuth();
  const [inList, setInList] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) {
      setInList(null);
      return;
    }
    let active = true;
    (async () => {
      const r = await api<{
        items: { content_type: string; content_id: number }[];
      }>('/api/user/watchlist');
      if (!active) return;
      if (r.ok) {
        const has = r.data.items.some(
          (x) => x.content_type === kind && x.content_id === contentId,
        );
        setInList(has);
      } else {
        setInList(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user, kind, contentId]);

  async function toggle() {
    if (!user || busy) return;
    setBusy(true);
    if (inList) {
      const r = await api(`/api/user/watchlist/${kind}:${contentId}`, {
        method: 'DELETE',
      });
      if (r.ok) setInList(false);
    } else {
      const r = await api('/api/user/watchlist', {
        method: 'POST',
        body: JSON.stringify({ content_type: kind, content_id: contentId }),
      });
      if (r.ok || r.status === 409) setInList(true);
    }
    setBusy(false);
  }

  if (!user) {
    return (
      <button
        disabled
        title="Sign in to add to watchlist"
        className="flex items-center gap-2 rounded-md border border-[var(--color-border)] px-4 py-2 text-sm opacity-50 cursor-not-allowed"
      >
        <Bookmark size={16} /> Watchlist
      </button>
    );
  }
  return (
    <button
      onClick={toggle}
      disabled={busy || inList === null}
      className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors border ${
        inList
          ? 'bg-[var(--color-surface)] border-[var(--color-brand)] text-[var(--color-brand)]'
          : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-white'
      }`}
    >
      {busy ? (
        <Loader2 size={16} className="animate-spin" />
      ) : inList ? (
        <BookmarkCheck size={16} />
      ) : (
        <Bookmark size={16} />
      )}
      {inList ? 'In Watchlist' : 'Add to Watchlist'}
    </button>
  );
}
