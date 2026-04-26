'use client';
import { useEffect, useState } from 'react';
import { MediaCard } from './MediaCard';
import { api } from '@/lib/api';

type Item = {
  type?: 'movie' | 'tv';
  tmdb_id: number;
  title?: string | null;
  name?: string | null;
  poster_url?: string | null;
  rating?: number | null;
  release_date?: string | null;
  first_air_date?: string | null;
};

type Props = {
  title: string;
  endpoint: string;
  /** default kind to use when items don't carry a `type` field */
  kind: 'movie' | 'tv';
};

export function MediaRow({ title, endpoint, kind }: Props) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const r = await api<Record<string, unknown>>(endpoint);
      if (!active) return;
      if (!r.ok) {
        setErr(r.error);
        return;
      }
      // canonical: { results: [...] } from Phase 3 list endpoints
      const arr =
        ((r.data.results as Item[]) ??
          (r.data.movies as Item[]) ??
          (r.data.tv as Item[]) ??
          []) ?? [];
      setItems(arr);
    })();
    return () => {
      active = false;
    };
  }, [endpoint]);

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold px-4 sm:px-6">{title}</h2>
      {err ? (
        <div className="px-4 sm:px-6 text-sm text-[var(--color-brand)]">{err}</div>
      ) : !items ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 px-4 sm:px-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] skeleton" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="px-4 sm:px-6 text-sm text-[var(--color-text-dim)]">
          Nothing here yet.
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 px-4 sm:px-6">
          {items.map((it) => (
            <MediaCard
              key={`${it.type ?? kind}-${it.tmdb_id}`}
              kind={it.type ?? kind}
              {...it}
            />
          ))}
        </div>
      )}
    </section>
  );
}
