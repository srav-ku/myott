'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Megaphone, Trash2, Loader2, AlertCircle } from 'lucide-react';

export default function UpdatesPage() {
  const [items, setItems] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info');
  const [expiry, setExpiry] = useState('none');
  const [loading, setLoading] = useState(false);

  async function load() {
    setError(null);
    const r = await api<{ updates: any[] }>('/api/admin/updates');
    if (r.ok) {
      setItems(r.data.updates || []);
    } else {
      setError(r.error || 'Failed to load updates');
      setItems([]);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    let expiresAt = null;
    const now = new Date();
    if (expiry === '24h')
      expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    else if (expiry === '3d')
      expiresAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
    else if (expiry === '7d')
      expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const r = await api('/api/admin/updates', {
      method: 'POST',
      body: JSON.stringify({ message, type, expiresAt }),
    });
    setLoading(false);

    if (r.ok) {
      setMessage('');
      setExpiry('none');
      void load();
    }
  }

  async function deleteUpdate(id: number) {
    if (!confirm('Delete this update?')) return;
    const r = await api(`/api/admin/updates/${id}`, { method: 'DELETE' });
    if (r.ok) void load();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">System Updates</h1>
        <p className="text-sm text-[var(--color-text-dim)]">Manage site-wide announcements and notifications.</p>
      </div>

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Megaphone size={20} className="text-[var(--color-brand)]" />
          Create New Update
        </h3>
        <form onSubmit={createUpdate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-[var(--color-text-dim)] mb-1.5">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter announcement message..."
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-3 text-sm outline-none focus:border-[var(--color-brand)] min-h-[100px]"
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-[var(--color-text-dim)] mb-1.5">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-2.5 text-sm outline-none focus:border-[var(--color-brand)]"
              >
                <option value="info">Info (Neutral)</option>
                <option value="release">Release (Green)</option>
                <option value="alert">Alert (Red)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-[var(--color-text-dim)] mb-1.5">
                Expiry
              </label>
              <select
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-2.5 text-sm outline-none focus:border-[var(--color-brand)]"
              >
                <option value="none">No Expiry</option>
                <option value="24h">24 Hours</option>
                <option value="3d">3 Days</option>
                <option value="7d">7 Days</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-white text-black px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-gray-200 transition-all disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Post Update'}
          </button>
        </form>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold">Recent Updates</h3>
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}
        {!items && !error ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="animate-spin text-[var(--color-brand)]" />
          </div>
        ) : items?.length === 0 ? (
          <div className="text-[var(--color-text-dim)] text-sm py-8 text-center border border-dashed border-[var(--color-border)] rounded-xl">
            No updates found.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((u) => (
              <div
                key={u.id}
                className="p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] flex items-start justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                        u.type === 'release'
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : u.type === 'alert'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}
                    >
                      {u.type}
                    </span>
                    <span className="text-[10px] text-[var(--color-text-dim)] font-bold">
                      {new Date(u.createdAt).toLocaleString()}
                    </span>
                    {u.expiresAt && (
                      <span
                        className={`text-[10px] font-bold ${
                          new Date(u.expiresAt) < new Date()
                            ? 'text-red-400'
                            : 'text-orange-400'
                        }`}
                      >
                        {new Date(u.expiresAt) < new Date()
                          ? 'EXPIRED'
                          : `Expires: ${new Date(u.expiresAt).toLocaleDateString()}`}
                      </span>
                    )}
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{u.message}</div>
                </div>
                <button
                  onClick={() => deleteUpdate(u.id)}
                  className="p-2 text-[var(--color-text-dim)] hover:text-red-400 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
