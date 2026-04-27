'use client';
import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { AdminGuard } from '@/components/AdminGuard';
import {
  ChevronLeft,
  Loader2,
  Trash2,
  Upload,
  Plus,
  AlertCircle,
  CheckCircle,
  Save,
  ExternalLink,
} from 'lucide-react';

type Tv = {
  id: number;
  tmdb_id: number;
  name: string;
  overview: string | null;
  poster_url: string | null;
  first_air_date: string | null;
  release_year: number | null;
};

type EpisodeLink = {
  id?: number;
  quality: string;
  url: string;
  type: 'direct' | 'extract';
  languages: string[] | null;
};

type Episode = {
  id: number;
  tvId: number;
  seasonNumber: number;
  episodeNumber: number;
  title: string | null;
  overview: string | null;
  links?: EpisodeLink[];
};

function Inner({ tmdbId }: { tmdbId: number }) {
  const [show, setShow] = useState<Tv | null>(null);
  const [episodes, setEpisodes] = useState<Episode[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showCsv, setShowCsv] = useState(false);
  const [showAddEp, setShowAddEp] = useState(false);
  const [activeSeason, setActiveSeason] = useState<number | null>(null);

  async function loadEpisodes(tvId: number) {
    const r = await api<{ episodes: Episode[] }>(`/api/admin/tv/${tvId}/episodes`);
    if (r.ok) {
      const sorted = [...r.data.episodes].sort(
        (a, b) =>
          a.seasonNumber - b.seasonNumber || a.episodeNumber - b.episodeNumber,
      );
      setEpisodes(sorted);
      if (activeSeason === null && sorted.length > 0) {
        setActiveSeason(sorted[0].seasonNumber);
      }
    }
  }

  useEffect(() => {
    (async () => {
      const r = await api<Tv>(`/api/tv/${tmdbId}`);
      if (r.ok) {
        setShow(r.data);
        void loadEpisodes(r.data.id);
      } else setErr(r.error);
    })();
  }, [tmdbId]);

  async function deleteShow() {
    if (!show) return;
    if (!confirm(`Delete "${show.name}" with all episodes & links?`)) return;
    const r = await api(`/api/admin/tv/${show.id}`, { method: 'DELETE' });
    if (r.ok) window.location.href = '/admin/manage?tab=tv';
    else alert(r.error);
  }

  if (err)
    return <div className="px-6 py-12 text-center text-[var(--color-brand)]">{err}</div>;
  if (!show)
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="animate-spin" />
      </div>
    );

  const seasons = episodes
    ? Array.from(new Set(episodes.map((e) => e.seasonNumber))).sort((a, b) => a - b)
    : [];
  const year =
    show.release_year ?? (Number(show.first_air_date?.slice(0, 4)) || null);

  return (
    <div className="px-4 sm:px-6 space-y-6 pb-20">
      <Link
        href="/admin/manage?tab=tv"
        className="inline-flex items-center gap-1 text-sm text-[var(--color-text-dim)] hover:text-white"
      >
        <ChevronLeft size={16} /> Manage Content
      </Link>
      <div className="flex flex-col sm:flex-row gap-4">
        {show.poster_url && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={show.poster_url}
            alt=""
            className="w-32 rounded border border-[var(--color-border)]"
          />
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{show.name}</h1>
          <div className="text-xs text-[var(--color-text-dim)] mt-1">
            TV · DB id {show.id} · TMDB #{show.tmdb_id}
            {year && ` · ${year}`}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/tv/${show.tmdb_id}`}
              className="text-sm border border-[var(--color-border)] hover:border-white rounded px-3 py-1.5"
            >
              View public page
            </Link>
            <button
              onClick={() => setShowAddEp((s) => !s)}
              className="text-sm bg-[var(--color-surface-2)] border border-[var(--color-border)] hover:border-white rounded px-3 py-1.5 inline-flex items-center gap-1"
            >
              <Plus size={14} /> Add Episode
            </button>
            <button
              onClick={() => setShowCsv((s) => !s)}
              className="text-sm bg-[var(--color-surface-2)] border border-[var(--color-border)] hover:border-white rounded px-3 py-1.5 inline-flex items-center gap-1"
            >
              <Upload size={14} /> CSV Import
            </button>
            <button
              onClick={deleteShow}
              className="text-sm border border-[var(--color-brand)] text-[var(--color-brand)] hover:bg-[var(--color-brand)] hover:text-white rounded px-3 py-1.5 inline-flex items-center gap-1"
            >
              <Trash2 size={14} /> Delete show
            </button>
          </div>
        </div>
      </div>

      {showAddEp && (
        <AddEpisodeForm
          tvId={show.id}
          onAdded={() => {
            setShowAddEp(false);
            void loadEpisodes(show.id);
          }}
        />
      )}

      {showCsv && (
        <CsvImporter
          tvId={show.id}
          onDone={() => {
            void loadEpisodes(show.id);
          }}
        />
      )}

      <hr className="border-[var(--color-border)]" />

      <div className="space-y-6">
        <div className="flex flex-wrap gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {seasons.map((s) => (
            <button
              key={s}
              onClick={() => setActiveSeason(s)}
              className={`px-4 py-2 rounded-md text-sm whitespace-nowrap ${
                activeSeason === s
                  ? 'bg-[var(--color-brand)] text-white'
                  : 'bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-white'
              }`}
            >
              Season {s}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {!episodes ? (
            <Loader2 className="animate-spin" />
          ) : episodes.length === 0 ? (
            <div className="text-sm text-[var(--color-text-dim)] border border-dashed border-[var(--color-border)] rounded p-12 text-center">
              No episodes. They should auto-fetch shortly or you can add manually.
            </div>
          ) : (
            episodes
              .filter((e) => e.seasonNumber === activeSeason)
              .map((e) => <EpisodeAdminCard key={e.id} episode={e} />)
          )}
        </div>
      </div>
    </div>
  );
}

function EpisodeAdminCard({ episode }: { episode: Episode }) {
  const l1080 = episode.links?.find((l) => l.quality === '1080p');
  const l720 = episode.links?.find((l) => l.quality === '720p');

  const [url1080, setUrl1080] = useState(l1080?.url || '');
  const [url720, setUrl720] = useState(l720?.url || '');
  const [type1080, setType1080] = useState<'direct' | 'extract'>(
    l1080?.type || 'extract',
  );
  const [type720, setType720] = useState<'direct' | 'extract'>(
    l720?.type || 'extract',
  );
  const [langs, setLangs] = useState(
    (l1080?.languages || l720?.languages || ['en']).join(', '),
  );
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true);
    const langArr = langs
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const r = await api(`/api/admin/episodes/${episode.id}/links`, {
      method: 'POST',
      body: JSON.stringify({
        links: [
          { quality: '1080p', url: url1080, type: type1080, languages: langArr },
          { quality: '720p', url: url720, type: type720, languages: langArr },
        ],
      }),
    });
    setBusy(false);
    if (r.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      alert(r.error);
    }
  }

  return (
    <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] overflow-hidden">
      <div className="p-3 border-b border-[var(--color-border)] bg-[var(--color-bg)]/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-[var(--color-brand)] bg-[var(--color-brand)]/10 px-2 py-0.5 rounded uppercase">
            E{episode.episodeNumber}
          </span>
          <span className="font-medium text-sm truncate">
            {episode.title || `Episode ${episode.episodeNumber}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {episode.links && episode.links.length > 0 && (
            <span className="text-[10px] text-green-400 uppercase font-bold">
              Linked
            </span>
          )}
          <button
            onClick={() => {
              if (confirm('Delete this episode?')) {
                api(`/api/admin/tv/${episode.tvId}/episodes/${episode.id}`, {
                  method: 'DELETE',
                }).then(() => window.location.reload());
              }
            }}
            className="text-[var(--color-text-dim)] hover:text-[var(--color-brand)] p-1"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_1fr_180px_auto] gap-4 items-end">
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-[var(--color-text-dim)]">
            1080p URL
          </label>
          <div className="flex gap-1">
            <input
              value={url1080}
              onChange={(e) => setUrl1080(e.target.value)}
              placeholder="https://..."
              className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1.5 text-sm outline-none focus:border-[var(--color-brand)]"
            />
            <select
              value={type1080}
              onChange={(e) => setType1080(e.target.value as any)}
              className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded text-[10px] px-1"
            >
              <option value="extract">EXT</option>
              <option value="direct">DIR</option>
            </select>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-[var(--color-text-dim)]">
            720p URL
          </label>
          <div className="flex gap-1">
            <input
              value={url720}
              onChange={(e) => setUrl720(e.target.value)}
              placeholder="https://..."
              className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1.5 text-sm outline-none focus:border-[var(--color-brand)]"
            />
            <select
              value={type720}
              onChange={(e) => setType720(e.target.value as any)}
              className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded text-[10px] px-1"
            >
              <option value="extract">EXT</option>
              <option value="direct">DIR</option>
            </select>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-[var(--color-text-dim)]">
            Languages
          </label>
          <input
            value={langs}
            onChange={(e) => setLangs(e.target.value)}
            placeholder="en, hi, te"
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1.5 text-sm outline-none focus:border-[var(--color-brand)]"
          />
        </div>
        <button
          onClick={save}
          disabled={busy}
          className={`flex items-center gap-2 rounded px-4 py-2 text-sm font-bold transition-colors ${
            saved
              ? 'bg-green-600 text-white'
              : 'bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white'
          } disabled:opacity-50`}
        >
          {busy ? (
            <Loader2 size={16} className="animate-spin" />
          ) : saved ? (
            <CheckCircle size={16} />
          ) : (
            <Save size={16} />
          )}
          {saved ? 'Saved' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function AddEpisodeForm({ tvId, onAdded }: { tvId: number; onAdded: () => void }) {
  const [s, setS] = useState(1);
  const [e, setE] = useState(1);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setBusy(true);
    setErr(null);
    const r = await api(`/api/admin/tv/${tvId}/episodes`, {
      method: 'POST',
      body: JSON.stringify({ season_number: s, episode_number: e, title: title || null }),
    });
    setBusy(false);
    if (r.ok) {
      setTitle('');
      onAdded();
    } else setErr(r.error);
  }

  return (
    <form
      onSubmit={submit}
      className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-3 grid grid-cols-1 sm:grid-cols-[80px_80px_1fr_auto] gap-2 items-end"
    >
      <label className="block">
        <span className="text-[10px] uppercase text-[var(--color-text-dim)]">Season</span>
        <input
          type="number"
          min={1}
          value={s}
          onChange={(ev) => setS(Number(ev.target.value))}
          className="mt-1 w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1.5 text-sm"
        />
      </label>
      <label className="block">
        <span className="text-[10px] uppercase text-[var(--color-text-dim)]">
          Episode
        </span>
        <input
          type="number"
          min={1}
          value={e}
          onChange={(ev) => setE(Number(ev.target.value))}
          className="mt-1 w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1.5 text-sm"
        />
      </label>
      <label className="block sm:col-span-1">
        <span className="text-[10px] uppercase text-[var(--color-text-dim)]">Title (Optional)</span>
        <input
          value={title}
          onChange={(ev) => setTitle(ev.target.value)}
          placeholder="Defaults to TMDB title"
          className="mt-1 w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1.5 text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] rounded px-3 py-1.5 text-sm"
      >
        {busy ? '…' : 'Add'}
      </button>
      {err && (
        <div className="sm:col-span-4 text-xs text-[var(--color-brand)] flex items-center gap-1">
          <AlertCircle size={12} /> {err}
        </div>
      )}
    </form>
  );
}

function CsvImporter({ tvId, onDone }: { tvId: number; onDone: () => void }) {
  const [csv, setCsv] = useState(
    'season_number,episode_number,title,primary_stream_url,quality,languages\n1,1,Episode One,https://test-streams.mux.dev/test_001/stream.mp4,1080p,en|hi\n',
  );
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    inserted_episodes: number;
    inserted_links: number;
    skipped: { row: number; reason: string }[];
    errors: { row: number; reason: string }[];
  } | null>(null);

  async function submit() {
    setBusy(true);
    setResult(null);
    const r = await fetch(`/api/admin/tv/${tvId}/episodes/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/csv',
        'x-admin-email': JSON.parse(localStorage.getItem('ott:user') || '{}').email || '',
      },
      body: csv,
    });
    const json = (await r.json()) as { ok: boolean; data?: typeof result; error?: string };
    setBusy(false);
    if (json.ok && json.data) {
      setResult(json.data);
      onDone();
    } else alert(json.error);
  }

  return (
    <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-3 space-y-2">
      <div className="text-sm font-medium">CSV Import</div>
      <div className="text-xs text-[var(--color-text-dim)]">
        Header row required. Columns: season_number, episode_number, title,
        primary_stream_url (optional), quality (optional), languages (optional,
        pipe-separated). Re-running is idempotent.
      </div>
      <textarea
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        rows={6}
        className="w-full font-mono text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2"
      />
      <button
        onClick={submit}
        disabled={busy}
        className="bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] rounded px-3 py-1.5 text-sm disabled:opacity-60"
      >
        {busy ? 'Importing…' : 'Import'}
      </button>
      {result && (
        <div className="text-xs space-y-1 mt-2">
          <div>
            <CheckCircle size={12} className="inline text-green-400 mr-1" />
            {result.inserted_episodes} episodes, {result.inserted_links} links
          </div>
          {result.skipped.length > 0 && (
            <div className="text-yellow-400">
              {result.skipped.length} rows had warnings:{' '}
              {result.skipped.map((s) => `row ${s.row}: ${s.reason}`).join(' · ')}
            </div>
          )}
          {result.errors.length > 0 && (
            <div className="text-[var(--color-brand)]">
              {result.errors.length} errors:{' '}
              {result.errors.map((s) => `row ${s.row}: ${s.reason}`).join(' · ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ManageTvPage({
  params,
}: {
  params: Promise<{ tmdbId: string }>;
}) {
  const { tmdbId } = use(params);
  return (
    <AdminGuard>
      <Inner tmdbId={Number(tmdbId)} />
    </AdminGuard>
  );
}
