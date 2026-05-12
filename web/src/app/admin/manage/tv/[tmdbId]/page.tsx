'use client';
import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { LinksManager } from '@/components/LinksManager';
import {
  ChevronLeft,
  Loader2,
  Trash2,
  Plus,
  X
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
  const [activeSeason, setActiveSeason] = useState<number | null>(null);

  const [addingEpisode, setAddingEpisode] = useState(false);
  const [newEpSeason, setNewEpSeason] = useState(1);
  const [newEpNum, setNewEpNum] = useState(1);
  const [addingBusy, setAddingBusy] = useState(false);

  async function handleAddEpisode(e: React.FormEvent) {
    e.preventDefault();
    setAddingBusy(true);
    const r = await api(`/api/admin/tv/${show!.id}/episodes`, {
      method: 'POST',
      body: JSON.stringify({ season_number: newEpSeason, episode_number: newEpNum })
    });
    setAddingBusy(false);
    if (r.ok) {
      setAddingEpisode(false);
      void loadEpisodes(show!.id);
      setActiveSeason(newEpSeason);
    } else {
      alert(r.error);
    }
  }

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
    if (r.ok) window.location.href = '/admin';
    else alert(r.error);
  }

  if (err)
    return <div className="px-6 py-12 text-center text-brand">{err}</div>;
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
    <div className="space-y-6 pb-20">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-text-dim hover:text-white"
      >
        <ChevronLeft size={16} /> Back
      </Link>
      <div className="flex flex-col sm:flex-row gap-4">
        {show.poster_url && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={show.poster_url}
            alt=""
            className="w-24 rounded border border-border"
          />
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{show.name}</h1>
          <div className="text-xs text-text-dim mt-1">
            TV · TMDB #{show.tmdb_id}
            {year && ` · ${year}`}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/tv/${show.tmdb_id}`}
              className="text-xs border border-border hover:border-white rounded-lg px-3 py-1.5 transition-all"
            >
              View public page
            </Link>
            <button
              onClick={deleteShow}
              className="text-xs border border-brand text-brand hover:bg-brand hover:text-white rounded-lg px-3 py-1.5 inline-flex items-center gap-1 transition-all"
            >
              <Trash2 size={14} /> Delete show
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-1.5 overflow-x-auto no-scrollbar">
            {seasons.map((s) => (
              <button
                key={s}
                onClick={() => setActiveSeason(s)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeSeason === s
                    ? 'bg-brand text-white'
                    : 'bg-surface border border-border hover:border-white'
                }`}
              >
                SEASON {s}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              setNewEpSeason(activeSeason || 1);
              setAddingEpisode(true);
            }}
            className="flex items-center gap-1 text-xs bg-brand text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition-all"
          >
            <Plus size={14} /> Add Episode
          </button>
        </div>

        {addingEpisode && (
          <form onSubmit={handleAddEpisode} className="bg-surface-2 border border-border rounded-lg p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm">Add Episode Manually</h3>
              <button type="button" onClick={() => setAddingEpisode(false)} className="text-text-dim hover:text-white">
                <X size={16} />
              </button>
            </div>
            <div className="flex items-center gap-4">
              <label className="block flex-1">
                <span className="text-[10px] uppercase tracking-wider text-text-dim">Season</span>
                <input type="number" min={0} value={newEpSeason} onChange={(e) => setNewEpSeason(Number(e.target.value))} className="w-full mt-1 bg-bg border border-border rounded px-3 py-2 text-sm" required />
              </label>
              <label className="block flex-1">
                <span className="text-[10px] uppercase tracking-wider text-text-dim">Episode</span>
                <input type="number" min={0} value={newEpNum} onChange={(e) => setNewEpNum(Number(e.target.value))} className="w-full mt-1 bg-bg border border-border rounded px-3 py-2 text-sm" required />
              </label>
            </div>
            <div className="flex justify-end">
              <button disabled={addingBusy} type="submit" className="bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                {addingBusy && <Loader2 size={14} className="animate-spin" />}
                Save Episode
              </button>
            </div>
          </form>
        )}

        <div className="space-y-4">
          {!episodes ? (
            <Loader2 className="animate-spin" />
          ) : episodes.length === 0 ? (
            <div className="text-sm text-text-dim border border-dashed border-border rounded p-12 text-center">
              No episodes found for this show.
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
  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden transition-all hover:border-border-hover">
      <div className="p-3 border-b border-border bg-bg/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-brand bg-brand/10 px-2 py-0.5 rounded uppercase tracking-wider">
            E{episode.episodeNumber}
          </span>
          <span className="font-bold text-sm truncate">
            {episode.title || `Episode ${episode.episodeNumber}`}
          </span>
        </div>
        <button
          onClick={() => {
            if (confirm('Delete this episode?')) {
              api(`/api/admin/tv/${episode.tvId}/episodes/${episode.id}`, {
                method: 'DELETE',
              }).then(() => window.location.reload());
            }
          }}
          className="text-text-dim hover:text-red-400 p-1 transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>
      <div className="p-4">
        <LinksManager scope={{ kind: 'episode', episodeId: episode.id }} />
      </div>
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
    <Inner tmdbId={Number(tmdbId)} />
  );
}
