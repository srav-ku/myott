'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Plus, Trash2, Loader2, Save, X, AlertCircle } from 'lucide-react';

type LinkRow = {
  id: number;
  movieId: number | null;
  episodeId: number | null;
  quality: string;
  type: 'direct' | 'extract';
  url: string;
  extractedUrl: string | null;
  expiresAt: number | null;
  languages: string[] | null;
};

const QUALITIES = ['360p', '480p', '720p', '1080p', '2160p'];

export function LinksManager({
  scope,
}: {
  scope: { kind: 'movie'; movieId: number } | { kind: 'episode'; episodeId: number };
}) {
  const [items, setItems] = useState<LinkRow[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryKey =
    scope.kind === 'movie' ? `movie_id=${scope.movieId}` : `episode_id=${scope.episodeId}`;

  async function load() {
    setError(null);
    const r = await api<{ links: LinkRow[] }>(`/api/admin/links?${queryKey}`);
    if (r.ok) setItems(r.data.links);
    else setError(r.error);
  }

  useEffect(() => {
    setItems(null);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  async function add(form: NewLink) {
    setSaving(true);
    setError(null);
    const body =
      scope.kind === 'movie'
        ? { movie_id: scope.movieId, ...form }
        : { episode_id: scope.episodeId, ...form };
    const r = await api('/api/admin/links', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (r.ok) {
      setShowAdd(false);
      void load();
    } else {
      setError(r.error);
    }
  }

  async function remove(id: number) {
    if (!confirm('Delete this link?')) return;
    await api(`/api/admin/links/${id}`, { method: 'DELETE' });
    void load();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Streaming Links</h3>
        <button
          onClick={() => setShowAdd((s) => !s)}
          className="inline-flex items-center gap-1 text-sm bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] rounded px-3 py-1.5"
        >
          {showAdd ? <X size={14} /> : <Plus size={14} />}
          {showAdd ? 'Cancel' : 'Add Link'}
        </button>
      </div>

      {showAdd && (
        <NewLinkForm onSave={add} saving={saving} />
      )}
      {error && (
        <div className="text-sm text-[var(--color-brand)] flex items-center gap-2">
          <AlertCircle size={14} /> {error}
        </div>
      )}
      {!items ? (
        <Loader2 className="animate-spin" />
      ) : items.length === 0 ? (
        <div className="text-sm text-[var(--color-text-dim)] border border-dashed border-[var(--color-border)] rounded p-3">
          No links yet. Click &quot;Add Link&quot; above.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((l) => (
            <LinkItem key={l.id} link={l} onChanged={load} onDelete={() => remove(l.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

type NewLink = {
  quality: string;
  type: 'direct' | 'extract';
  url: string;
  languages: string[];
};
function NewLinkForm({
  onSave,
  saving,
}: {
  onSave: (f: NewLink) => void;
  saving: boolean;
}) {
  const [quality, setQuality] = useState('1080p');
  const [type, setType] = useState<'direct' | 'extract'>('direct');
  const [url, setUrl] = useState('');
  const [langs, setLangs] = useState('en');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    onSave({
      quality,
      type,
      url: url.trim(),
      languages: langs
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    });
  }
  return (
    <form
      onSubmit={submit}
      className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-3 space-y-2"
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Field label="Quality">
          <select
            value={quality}
            onChange={(e) => setQuality(e.target.value)}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1.5 text-sm"
          >
            {QUALITIES.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Type">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as 'direct' | 'extract')}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1.5 text-sm"
          >
            <option value="direct">Direct (.mp4 / .m3u8)</option>
            <option value="extract">Extract (worker)</option>
          </select>
        </Field>
        <Field label="Languages (comma)">
          <input
            value={langs}
            onChange={(e) => setLangs(e.target.value)}
            placeholder="en, hi"
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1.5 text-sm"
          />
        </Field>
      </div>
      <Field label="URL">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/stream.mp4 or .m3u8"
          required
          className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1.5 text-sm"
        />
      </Field>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] rounded px-3 py-1.5 text-sm disabled:opacity-60"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)]">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function LinkItem({
  link,
  onChanged,
  onDelete,
}: {
  link: LinkRow;
  onChanged: () => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState(link.url);
  const [quality, setQuality] = useState(link.quality);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    await api(`/api/admin/links/${link.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ url, quality }),
    });
    setBusy(false);
    setEditing(false);
    onChanged();
  }

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-3">
      {editing ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1 text-sm"
            >
              {QUALITIES.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setEditing(false);
                setUrl(link.url);
                setQuality(link.quality);
              }}
              className="text-xs px-2 py-1 border border-[var(--color-border)] rounded"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={busy}
              className="text-xs px-3 py-1 bg-[var(--color-brand)] rounded inline-flex items-center gap-1"
            >
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="px-2 py-0.5 rounded bg-[var(--color-surface-2)] text-xs font-medium">
                {link.quality}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${
                  link.type === 'direct'
                    ? 'bg-blue-900/40 text-blue-300'
                    : 'bg-purple-900/40 text-purple-300'
                }`}
              >
                {link.type}
              </span>
              {link.languages && link.languages.length > 0 && (
                <span className="text-xs text-[var(--color-text-dim)]">
                  {link.languages.join(', ')}
                </span>
              )}
              {link.expiresAt && link.expiresAt * 1000 > Date.now() && (
                <span className="text-[10px] text-green-400">cached</span>
              )}
            </div>
            <div className="text-xs text-[var(--color-text-dim)] mt-1 break-all">
              {link.url}
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <button
              onClick={() => setEditing(true)}
              className="text-xs px-2 py-1 border border-[var(--color-border)] hover:border-white rounded"
            >
              Edit
            </button>
            <button
              onClick={onDelete}
              className="grid place-items-center w-7 h-7 border border-[var(--color-border)] hover:border-[var(--color-brand)] hover:text-[var(--color-brand)] rounded"
              title="Delete"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
