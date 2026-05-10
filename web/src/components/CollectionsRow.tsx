'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';
import { FolderHeart, ChevronRight, Loader2 } from 'lucide-react';

type Collection = {
  id: number;
  name: string;
  createdAt: string;
};

export function CollectionsRow() {
  const [collections, setCollections] = useState<Collection[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await api<{ collections: Collection[] }>('/api/collections');
        if (r.ok) setCollections(r.data.collections);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return null;
  if (!collections || collections.length === 0) return null;

  return (
    <section className="space-y-4 px-4 sm:px-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <FolderHeart className="text-[var(--color-brand)]" size={20} />
          Your Collections
        </h2>
        <Link href="/collections" className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-dim)] hover:text-white flex items-center gap-1 transition-colors">
          View All <ChevronRight size={14} />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {collections.slice(0, 5).map((c) => (
          <Link
            key={c.id}
            href={`/collections/${c.id}`}
            className="group relative aspect-[16/9] rounded-2xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-brand)] transition-all shadow-lg"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-brand)]/10 to-transparent group-hover:from-[var(--color-brand)]/20 transition-colors" />
            <div className="absolute inset-0 p-6 flex flex-col justify-end">
              <h3 className="font-bold text-lg text-white group-hover:text-[var(--color-brand)] transition-colors truncate">
                {c.name}
              </h3>
              <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-text-dim)] mt-1">
                Manual Collection
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
