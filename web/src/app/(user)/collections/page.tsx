'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { 
  FolderHeart, 
  Plus, 
  Loader2, 
  Trash2, 
  Edit3, 
  ChevronRight,
  Search,
  MoreVertical
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

type Collection = {
  id: number;
  name: string;
  createdAt: string;
};

export default function CollectionsPage() {
  const { user, loading: authLoading } = useAuth();
  const [collections, setCollections] = useState<Collection[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  async function load() {
    setLoading(true);
    try {
      const r = await api<{ collections: Collection[] }>('/api/collections');
      if (r.ok) setCollections(r.data.collections);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading && user) load();
    else if (!authLoading && !user) {
      setCollections([]);
      setLoading(false);
    }
  }, [user, authLoading]);

  async function createCollection(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || creating) return;
    setCreating(true);
    try {
      const r = await api<{ collection: Collection }>('/api/collections', {
        method: 'POST',
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (r.ok) {
        setCollections(prev => prev ? [r.data.collection, ...prev] : [r.data.collection]);
        setNewName('');
      }
    } finally {
      setCreating(false);
    }
  }

  async function deleteCollection(id: number) {
    if (!confirm('Are you sure you want to delete this collection?')) return;
    const r = await api(`/api/collections/${id}`, { method: 'DELETE' });
    if (r.ok) {
      setCollections(prev => prev ? prev.filter(c => c.id !== id) : null);
    }
  }

  async function renameCollection(id: number) {
    if (!editName.trim()) return;
    const r = await api(`/api/collections/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: editName.trim() }),
    });
    if (r.ok) {
      setCollections(prev => prev ? prev.map(c => c.id === id ? { ...c, name: editName.trim() } : c) : null);
      setEditingId(null);
    }
  }

  if (authLoading || (user && loading)) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="animate-spin text-[var(--color-brand)]" size={32} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="px-6 py-16 text-center max-w-md mx-auto">
        <div className="bg-surface border border-border rounded-3xl p-10 shadow-2xl">
          <FolderHeart className="mx-auto mb-6 text-text-dim" size={48} />
          <h2 className="text-2xl font-bold mb-3">Your Collections</h2>
          <p className="text-text-dim text-sm mb-8">
            Sign in to create personal collections and organize your library.
          </p>
          <div className="text-xs text-text-dim italic">
            Click the profile icon in the header to sign in.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-10 pb-20">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FolderHeart className="text-brand" size={32} />
            My Collections
          </h1>
          <p className="text-text-dim">Manage your personal media lists</p>
        </div>

        <form onSubmit={createCollection} className="flex gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="New collection name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 sm:w-64 bg-surface border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand transition-colors shadow-inner"
          />
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="bg-brand hover:bg-brand-hover text-white p-2.5 rounded-xl disabled:opacity-50 transition-all shadow-lg shadow-brand/20"
          >
            {creating ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
          </button>
        </form>
      </header>

      {collections && collections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border rounded-[2.5rem] bg-surface/20">
          <div className="w-20 h-20 rounded-full bg-surface border border-border flex items-center justify-center mb-6">
            <FolderHeart size={32} className="text-text-dim opacity-30" />
          </div>
          <h3 className="text-xl font-bold mb-2">No collections yet</h3>
          <p className="text-text-dim max-w-xs mb-8">
            Create your first collection using the form above to start organizing your library.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {collections?.map((c) => (
            <div 
              key={c.id} 
              className="group relative bg-surface border border-border hover:border-brand rounded-2xl p-5 transition-all shadow-lg hover:shadow-brand/5 flex items-center justify-between"
            >
              <div className="flex-1 min-w-0 pr-4">
                {editingId === c.id ? (
                  <div className="flex gap-2 items-center">
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') renameCollection(c.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="flex-1 bg-black/30 border border-brand rounded-lg px-3 py-1.5 text-sm outline-none"
                    />
                    <button 
                      onClick={() => renameCollection(c.id)}
                      className="text-brand p-1 hover:bg-brand/10 rounded"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <Link href={`/collections/${c.id}`} className="block">
                    <div className="font-bold text-lg group-hover:text-brand transition-colors truncate">
                      {c.name}
                    </div>
                    <div className="text-[10px] uppercase font-bold tracking-widest text-text-dim mt-1">
                      Created {new Date(c.createdAt).toLocaleDateString()}
                    </div>
                  </Link>
                )}
              </div>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setEditingId(c.id);
                    setEditName(c.name);
                  }}
                  className="p-2 text-text-dim hover:text-white hover:bg-white/5 rounded-lg transition-all"
                  title="Rename"
                >
                  <Edit3 size={16} />
                </button>
                <button
                  onClick={() => deleteCollection(c.id)}
                  className="p-2 text-text-dim hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-all"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
                <Link 
                  href={`/collections/${c.id}`}
                  className="p-2 text-text-dim hover:text-brand hover:bg-brand/5 rounded-lg transition-all"
                >
                  <ChevronRight size={20} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
