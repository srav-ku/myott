'use client';
import { useEffect, useState } from 'react';
import { QUALITIES, type Quality } from '@/lib/quality';
import { api } from '@/lib/api';
import { Plus, Trash2, Loader2, Save, X, AlertCircle } from 'lucide-react';

type LinkRow = {
  id: number;
  movieId: number | null;
  episodeId: number | null;
  quality: Quality;
  type: 'direct' | 'extract';
  url: string;
  extractedUrl: string | null;
  expiresAt: number | null;
  languages: string[] | null;
};

export function LinksManager({
  scope,
}: {
  scope: { kind: 'movie'; movieId: number } | { kind: 'episode'; episodeId: number };
}) {
  const [items, setItems] = useState<LinkRow[] | null>(null);
  const [showAdd, setShowAdd] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [addingLanguage, setAddingLanguage] = useState(false);

  const queryKey =
    scope.kind === 'movie' ? `movie_id=${scope.movieId}` : `episode_id=${scope.episodeId}`;

  async function loadLinks() {
    setError(null);
    const r = await api<{ links: LinkRow[] }>(`/api/admin/links?${queryKey}`);
    if (r.ok) setItems(r.data.links);
    else setError(r.error);
  }

  async function loadLanguages() {
    const r = await api<{ languages: string[] }>('/api/admin/languages');
    if (r.ok) setAvailableLanguages(r.data.languages);
    else console.error('Failed to load languages:', r.error);
  }

  useEffect(() => {
    setItems(null);
    void loadLinks();
    void loadLanguages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  async function addLink(form: NewLink) {
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
      void loadLinks();
    } else {
      setError(r.error);
    }
  }

  async function addNewLanguage(name: string) {
    setAddingLanguage(true);
    const r = await api('/api/admin/languages', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    setAddingLanguage(false);
    if (r.ok) {
      void loadLanguages(); // Reload languages to include the new one
    } else {
      setError(r.error);
    }
  }

  async function remove(id: number) {
    if (!confirm('Delete this link?')) return;
    await api(`/api/admin/links/${id}`, { method: 'DELETE' });
    void loadLinks();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Streaming Links</h3>
        <button
          onClick={() => setShowAdd((s) => !s)}
          className="inline-flex items-center gap-1 text-sm bg-brand hover:bg-brand-hover rounded px-3 py-1.5"
        >
          {showAdd ? <X size={14} /> : <Plus size={14} />}
          {showAdd ? 'Cancel' : 'Add Link'}
        </button>
      </div>

      {showAdd && (
        <NewLinkForm
          onSave={addLink}
          saving={saving}
          availableLanguages={availableLanguages}
          onAddNewLanguage={addNewLanguage}
          addingLanguage={addingLanguage}
        />
      )}
      {error && (
        <div className="text-sm text-brand flex items-center gap-2">
          <AlertCircle size={14} /> {error}
        </div>
      )}
      {!items ? (
        <Loader2 className="animate-spin" />
      ) : items.length === 0 ? (
        <div className="text-sm text-text-dim border border-dashed border-border rounded p-3">
          No links yet. Click &quot;Add Link&quot; above.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((l) => (
            <LinkItem
              key={l.id}
              link={l}
              availableLanguages={availableLanguages}
              onChanged={loadLinks}
              onDelete={() => remove(l.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type NewLink = {
  quality: Quality;
  type: 'direct' | 'extract';
  url: string;
  languages: string[];
};
function NewLinkForm({
  onSave,
  saving,
  availableLanguages,
  onAddNewLanguage,
  addingLanguage,
}: {
  onSave: (f: NewLink) => void;
  saving: boolean;
  availableLanguages: string[];
  onAddNewLanguage: (name: string) => void;
  addingLanguage: boolean;
}) {
  const [quality, setQuality] = useState<Quality>('1080p');
  const [type, setType] = useState<'direct' | 'extract'>('direct');
  const [url, setUrl] = useState('');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [newLanguageName, setNewLanguageName] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    onSave({
      quality,
      type,
      url: url.trim(),
      languages: selectedLanguages,
    });
  }

  function handleLanguageChange(lang: string, isChecked: boolean) {
    setSelectedLanguages((prev) => (isChecked ? [...prev, lang] : prev.filter((l) => l !== lang)));
  }

  function handleAddLanguage(e: React.FormEvent) {
    e.preventDefault();
    if (newLanguageName.trim() && !availableLanguages.includes(newLanguageName.trim())) {
      onAddNewLanguage(newLanguageName.trim());
      setNewLanguageName('');
    }
  }

  return (
    <form
      onSubmit={submit}
      className="bg-surface-2 border border-border rounded-lg p-3 space-y-2"
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Field label="Quality">
          <select
            value={quality}
            onChange={(e) => setQuality(e.target.value as Quality)}
            className="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm"
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
            className="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm"
          >
            <option value="direct">Direct (.mp4 / .m3u8)</option>
            <option value="extract">Extract (worker)</option>
          </select>
        </Field>
      </div>
      <Field label="Languages">
        <div className="flex flex-wrap gap-2 py-1.5">
          {availableLanguages.map((lang) => (
            <label key={lang} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={selectedLanguages.includes(lang)}
                onChange={(e) => handleLanguageChange(lang, e.target.checked)}
                className="form-checkbox"
              />
              {lang}
            </label>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <input
            type="text"
            value={newLanguageName}
            onChange={(e) => setNewLanguageName(e.target.value)}
            placeholder="Add new language"
            className="flex-1 bg-bg border border-border rounded px-2 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={handleAddLanguage}
            disabled={addingLanguage || !newLanguageName.trim()}
            className="inline-flex items-center gap-1 bg-gray-600 hover:bg-gray-700 rounded px-3 py-1.5 text-sm disabled:opacity-60"
          >
            {addingLanguage ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Add
          </button>
        </div>
      </Field>
      <Field label="URL">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/stream.mp4 or .m3u8"
          required
          className="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm"
        />
      </Field>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1 bg-brand hover:bg-brand-hover rounded px-3 py-1.5 text-sm disabled:opacity-60"
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
      <span className="text-[10px] uppercase tracking-wider text-text-dim">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function LinkItem({
  link,
  availableLanguages,
  onChanged,
  onDelete,
}: {
  link: LinkRow;
  availableLanguages: string[];
  onChanged: () => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState(link.url);
  const [quality, setQuality] = useState<Quality>(link.quality);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(link.languages || []);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    await api(`/api/admin/links/${link.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ url, quality, languages: selectedLanguages }),
    });
    setBusy(false);
    setEditing(false);
    onChanged();
  }

  function handleLanguageChange(lang: string, isChecked: boolean) {
    setSelectedLanguages((prev) => (isChecked ? [...prev, lang] : prev.filter((l) => l !== lang)));
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-3">
      {editing ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Field label="Quality">
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value as Quality)}
                className="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm"
              >
                {QUALITIES.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="URL">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm"
              />
            </Field>
          </div>

          <Field label="Languages">
            <div className="flex flex-wrap gap-2 py-1.5">
              {availableLanguages.map((lang) => (
                <label key={lang} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedLanguages.includes(lang)}
                    onChange={(e) => handleLanguageChange(lang, e.target.checked)}
                    className="form-checkbox"
                  />
                  {lang}
                </label>
              ))}
            </div>
          </Field>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setEditing(false);
                setUrl(link.url);
                setQuality(link.quality);
                setSelectedLanguages(link.languages || []);
              }}
              className="text-xs px-3 py-1.5 border border-border rounded"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={busy}
              className="text-xs px-4 py-1.5 bg-brand rounded inline-flex items-center gap-1"
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
              <span className="px-2 py-0.5 rounded bg-surface-2 text-xs font-medium">
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
                <span className="text-xs text-text-dim">
                  {link.languages.join(', ')}
                </span>
              )}
              {link.expiresAt && link.expiresAt * 1000 > Date.now() && (
                <span className="text-[10px] text-green-400">cached</span>
              )}
            </div>
            <div className="text-xs text-text-dim mt-1 break-all">
              {link.url}
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => setEditing(true)}
              className="text-xs px-2 py-1 border border-border hover:border-white rounded"
            >
              Edit
            </button>
            <button
              onClick={onDelete}
              className="grid place-items-center w-7 h-7 border border-border hover:border-brand hover:text-brand rounded"
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
