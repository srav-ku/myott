'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { LayoutDashboard, Trash2, Loader2, AlertCircle, Plus, ToggleLeft, ToggleRight } from 'lucide-react';

const AD_POSITIONS = [
  { value: 'home_banner', label: 'Home Banner' },
  { value: 'search_inline', label: 'Search Inline' },
  { value: 'detail_bottom', label: 'Detail Bottom' },
  { value: 'player_overlay', label: 'Player Overlay' },
];

const AD_TYPES = [
  { value: 'banner', label: 'Banner' },
  { value: 'rewarded', label: 'Rewarded' },
  { value: 'interstitial', label: 'Interstitial' },
];

const AD_PROVIDERS = [
  { value: 'custom', label: 'Custom' },
  { value: 'admob', label: 'AdMob' },
  { value: 'applovin', label: 'AppLovin' },
];

export default function AdsPage() {
  const [items, setItems] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    position: 'home_banner',
    type: 'banner',
    provider: 'custom',
    imageUrl: '',
    redirectUrl: '',
    unitId: '',
    priority: 0,
    isActive: false,
  });

  async function load() {
    setError(null);
    const r = await api<{ ads: any[] }>('/api/admin/ads');
    if (r.ok) {
      setItems(r.data.ads || []);
    } else {
      setError(r.error || 'Failed to load ads');
      setItems([]);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const r = await api('/api/admin/ads', {
      method: 'POST',
      body: JSON.stringify(formData),
    });
    setLoading(false);

    if (r.ok) {
      setFormData({
        position: 'home_banner',
        type: 'banner',
        provider: 'custom',
        imageUrl: '',
        redirectUrl: '',
        unitId: '',
        priority: 0,
        isActive: false,
      });
      void load();
    } else {
      setError(r.error || 'Failed to create ad');
    }
  }

  async function toggleActive(ad: any) {
    const r = await api(`/api/admin/ads/${ad.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: !ad.isActive }),
    });
    if (r.ok) void load();
  }

  async function deleteAd(id: number) {
    if (!confirm('Delete this ad?')) return;
    const r = await api(`/api/admin/ads/${id}`, { method: 'DELETE' });
    if (r.ok) void load();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Ads Management</h1>
        <p className="text-sm text-[var(--color-text-dim)]">Manage backend-driven ads and placements.</p>
      </div>

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
          <Plus size={20} className="text-[var(--color-brand)]" />
          Create New Ad
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-[var(--color-text-dim)] mb-1.5">Position</label>
              <select
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-2.5 text-sm outline-none focus:border-[var(--color-brand)] text-white"
              >
                {AD_POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-[var(--color-text-dim)] mb-1.5">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-2.5 text-sm outline-none focus:border-[var(--color-brand)] text-white"
              >
                {AD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-[var(--color-text-dim)] mb-1.5">Provider</label>
              <select
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-2.5 text-sm outline-none focus:border-[var(--color-brand)] text-white"
              >
                {AD_PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-[var(--color-text-dim)] mb-1.5">Image URL (Custom)</label>
              <input
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="https://..."
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-2.5 text-sm outline-none focus:border-[var(--color-brand)] text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-[var(--color-text-dim)] mb-1.5">Redirect URL (Custom)</label>
              <input
                value={formData.redirectUrl}
                onChange={(e) => setFormData({ ...formData, redirectUrl: e.target.value })}
                placeholder="https://..."
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-2.5 text-sm outline-none focus:border-[var(--color-brand)] text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-[var(--color-text-dim)] mb-1.5">Unit ID (SDK)</label>
              <input
                value={formData.unitId}
                onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
                placeholder="AdMob Unit ID"
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-2.5 text-sm outline-none focus:border-[var(--color-brand)] text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-[var(--color-text-dim)] mb-1.5">Priority</label>
              <input
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-2.5 text-sm outline-none focus:border-[var(--color-brand)] text-white"
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="hidden"
                />
                <div className={`w-10 h-6 rounded-full transition-colors relative ${formData.isActive ? 'bg-[var(--color-brand)]' : 'bg-gray-600'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.isActive ? 'left-5' : 'left-1'}`} />
                </div>
                <span className="text-sm font-bold uppercase text-[var(--color-text-dim)] group-hover:text-white transition-colors">Active</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-white text-black px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-gray-200 transition-all disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Ad'}
          </button>
        </form>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white">Configured Ads</h3>
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
            No ads configured.
          </div>
        ) : (
          <div className="grid gap-3">
            {items?.map((ad) => (
              <div
                key={ad.id}
                className="p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-white/10 text-white border border-white/20">
                      {ad.position.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-[var(--color-brand)]/10 text-[var(--color-brand)] border border-[var(--color-brand)]/20">
                      {ad.type}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {ad.provider}
                    </span>
                  </div>
                  <div className="text-sm font-medium truncate text-white">
                    {ad.imageUrl || ad.unitId || 'No content identifier'}
                  </div>
                  <div className="text-[10px] text-[var(--color-text-dim)] font-bold mt-1 uppercase tracking-tight">
                    Priority: {ad.priority} · Created: {new Date(ad.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActive(ad)}
                    className={`p-2 transition-colors ${ad.isActive ? 'text-[var(--color-brand)]' : 'text-[var(--color-text-dim)] hover:text-white'}`}
                    title={ad.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {ad.isActive ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                  </button>
                  <button
                    onClick={() => deleteAd(ad.id)}
                    className="p-2 text-[var(--color-text-dim)] hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
