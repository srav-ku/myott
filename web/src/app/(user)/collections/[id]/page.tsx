'use client';

import { useEffect, useState, use } from 'react';
import { api } from '@/lib/api';
import { MediaCard } from '@/components/MediaCard';
import { Loader2, FolderHeart, ChevronLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Item = {
  tmdb_id: number;
  type: 'movie' | 'tv';
  title: string;
  poster_url: string | null;
  rating: number | null;
};

type Collection = {
  id: number;
  name: string;
  createdAt: string;
};

export default function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<{ collection: Collection; results: Item[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const r = await api<{ collection: Collection; results: Item[] }>(`/api/collections/${id}`);
      if (r.ok) setData(r.data);
      else setErr(r.error);
      setLoading(false);
    })();
  }, [id]);

  async function deleteCollection() {
    if (!confirm('Are you sure you want to delete this collection?')) return;
    const r = await api(`/api/collections/${id}`, { method: 'DELETE' });
    if (r.ok) router.push('/');
  }

  if (loading) return <div className="px-6 py-20 flex justify-center"><Loader2 className="animate-spin" /></div>;
  if (err || !data) return <div className="px-6 py-20 text-center text-red-500">{err || 'Not found'}</div>;

  return (
    <div className="space-y-8 pb-20">
      <div className="px-4 sm:px-6 space-y-4">
        <Link href="/" className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-[var(--color-text-dim)] hover:text-white transition-colors">
          <ChevronLeft size={14} /> Back to Library
        </Link>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-[var(--color-brand)]">
            <FolderHeart size={32} />
            <h1 className="text-3xl sm:text-4xl font-bold text-white">{data.collection.name}</h1>
          </div>
          <button 
            onClick={deleteCollection}
            className="p-2 text-[var(--color-text-dim)] hover:text-red-500 transition-colors"
            title="Delete Collection"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      <div className="px-4 sm:px-6">
        {data.results.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-[var(--color-border)] rounded-2xl">
            <p className="text-[var(--color-text-dim)]">This collection is empty.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {data.results.map((it) => (
              <MediaCard
                key={`${it.type}-${it.tmdb_id}`}
                kind={it.type}
                {...it}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
