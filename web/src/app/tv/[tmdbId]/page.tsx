'use client';
import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { WatchlistButton } from '@/components/WatchlistButton';
import { ReportButton } from '@/components/ReportButton';
import { Loader2, Star, Calendar, Play } from 'lucide-react';

type Tv = {
  id: number;
  tmdb_id: number;
  name: string;
  overview: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  first_air_date: string | null;
  release_year: number | null;
  rating: number | null;
  number_of_seasons: number | null;
  genres: string[] | null;
};

type Episode = {
  id: number;
  tvId: number;
  seasonNumber: number;
  episodeNumber: number;
  title: string | null;
  overview: string | null;
  stillPath: string | null;
};

export default function TvPage({
  params,
}: {
  params: Promise<{ tmdbId: string }>;
}) {
  const { tmdbId } = use(params);
  const [show, setShow] = useState<Tv | null>(null);
  const [seasons, setSeasons] = useState<number[]>([]);
  const [activeSeason, setActiveSeason] = useState<number | null>(null);
  const [allEpisodes, setAllEpisodes] = useState<Episode[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const r = await api<Tv>(`/api/tv/${tmdbId}`);
      if (!active) return;
      if (!r.ok) {
        setErr(r.error);
        return;
      }
      setShow(r.data);
      const ep = await api<{ episodes: Episode[] }>(
        `/api/admin/tv/${r.data.id}/episodes`,
      );
      if (!active) return;
      if (ep.ok) {
        setAllEpisodes(ep.data.episodes);
        const ss = Array.from(
          new Set(ep.data.episodes.map((e) => e.seasonNumber)),
        ).sort((a, b) => a - b);
        setSeasons(ss);
        setActiveSeason(ss[0] ?? null);
      } else {
        setAllEpisodes([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [tmdbId]);

  if (err)
    return (
      <div className="px-6 py-12 text-center text-[var(--color-brand)]">{err}</div>
    );
  if (!show)
    return (
      <div className="px-6 py-24 grid place-items-center">
        <Loader2 className="animate-spin" />
      </div>
    );

  const episodes =
    allEpisodes && activeSeason !== null
      ? allEpisodes
          .filter((e) => e.seasonNumber === activeSeason)
          .sort((a, b) => a.episodeNumber - b.episodeNumber)
      : null;

  const year = show.release_year ?? (Number(show.first_air_date?.slice(0, 4)) || null);

  return (
    <div className="space-y-8">
      <div className="relative">
        {show.backdrop_url && (
          <div className="absolute inset-0 -z-10 h-[420px] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={show.backdrop_url}
              alt=""
              className="w-full h-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--color-bg)]/80 to-[var(--color-bg)]" />
          </div>
        )}
        <div className="px-4 sm:px-6 pt-8 flex flex-col md:flex-row gap-6">
          {show.poster_url && (
            <div className="w-44 sm:w-56 flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={show.poster_url}
                alt={show.name}
                className="w-full rounded-lg shadow-2xl border border-[var(--color-border)]"
              />
            </div>
          )}
          <div className="flex-1 space-y-4">
            <h1 className="text-3xl sm:text-4xl font-bold">{show.name}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--color-text-dim)]">
              {year && (
                <span className="flex items-center gap-1">
                  <Calendar size={14} /> {year}
                </span>
              )}
              {show.number_of_seasons && (
                <span>
                  {show.number_of_seasons} season
                  {show.number_of_seasons !== 1 ? 's' : ''}
                </span>
              )}
              {show.rating && show.rating > 0 && (
                <span className="flex items-center gap-1">
                  <Star size={14} className="text-yellow-400 fill-yellow-400" />
                  {show.rating.toFixed(1)}
                </span>
              )}
            </div>
            {show.genres && (
              <div className="flex flex-wrap gap-1.5">
                {show.genres.map((g) => (
                  <span
                    key={g}
                    className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-surface-2)] border border-[var(--color-border)]"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}
            {show.overview && (
              <p className="max-w-3xl leading-relaxed">{show.overview}</p>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              <WatchlistButton kind="tv" contentId={show.id} />
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 space-y-4">
        <h2 className="text-xl font-semibold">Episodes</h2>
        {seasons.length === 0 ? (
          <div className="rounded-md border border-dashed border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text-dim)]">
            No episodes yet. An admin can import them via CSV.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {seasons.map((s) => (
                <button
                  key={s}
                  onClick={() => setActiveSeason(s)}
                  className={`px-3 py-1.5 rounded-md text-sm ${
                    s === activeSeason
                      ? 'bg-[var(--color-brand)] text-white'
                      : 'bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-white'
                  }`}
                >
                  Season {s}
                </button>
              ))}
            </div>
            {!episodes ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-24 skeleton" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {episodes.map((ep) => (
                  <EpisodeRow key={ep.id} ep={ep} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function EpisodeRow({ ep }: { ep: Episode }) {
  const still = ep.stillPath
    ? `https://image.tmdb.org/t/p/w300${ep.stillPath}`
    : null;
  return (
    <div className="flex gap-3 p-3 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
      <div className="w-32 h-20 sm:w-40 sm:h-24 flex-shrink-0 rounded overflow-hidden bg-[var(--color-bg)]">
        {still ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={still} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full grid place-items-center text-xs text-[var(--color-text-dim)]">
            S{ep.seasonNumber}E{ep.episodeNumber}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-[var(--color-text-dim)]">
          S{ep.seasonNumber} · E{ep.episodeNumber}
        </div>
        <div className="font-medium">{ep.title ?? `Episode ${ep.episodeNumber}`}</div>
        {ep.overview && (
          <p className="text-xs text-[var(--color-text-dim)] line-clamp-2 mt-1">
            {ep.overview}
          </p>
        )}
      </div>
      <div className="self-center">
        <Link
          href={`/watch/episode/${ep.id}`}
          className="inline-flex items-center gap-1.5 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] rounded-md px-3 py-1.5 text-sm font-medium"
        >
          <Play size={14} fill="white" /> Play
        </Link>
      </div>
    </div>
  );
}
