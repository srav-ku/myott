'use client';
import { useEffect, useState, use } from 'react';
import { api } from '@/lib/api';
import { WatchlistButton } from '@/components/WatchlistButton';
import { ReportButton } from '@/components/ReportButton';
import { StreamLauncher } from '@/components/StreamLauncher';
import { MissingLinksRequest } from '@/components/MissingLinksRequest';
import { Loader2, Star, Calendar } from 'lucide-react';
import AdRenderer from '@/components/AdRenderer';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation'; // Import router and searchParams

type EpisodeLink = {
  id: number;
  quality: string;
  url: string;
  type: 'direct' | 'extract';
  languages: string[] | null;
};

type Episode = {
  id: number;
  episode_number: number;
  title: string | null;
  overview: string | null;
  thumbnail_url: string | null;
  runtime: number | null;
  links: EpisodeLink[];
};

type Season = {
  season_number: number;
  episodes: Episode[];
};

type Tv = {
  id: number;
  tmdb_id: number;
  title: string;
  overview: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  first_air_date: string | null;
  release_year: number | null;
  rating: number | null;
  number_of_seasons: number | null;
  genres: string[] | null;
  seasons: Season[];
};

export default function TvPage({
  params,
}: {
  params: Promise<{ tmdbId: string }>;
}) {
  const { tmdbId } = use(params);
  const [show, setShow] = useState<Tv | null>(null);
  const [activeSeasonNum, setActiveSeasonNum] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const searchParams = useSearchParams(); // For getting current search params
  const router = useRouter(); // For navigation

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
      if (r.data.seasons.length > 0) {
        setActiveSeasonNum(r.data.seasons[0].season_number);
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

  const activeSeason = show.seasons.find((s) => s.season_number === activeSeasonNum);
  const episodes = activeSeason?.episodes ?? [];

  const hasAnyLinks = show.seasons.some((s) =>
    s.episodes.some((e) => e.links && e.links.length > 0),
  );

  const year = show.release_year ?? (Number(show.first_air_date?.slice(0, 4)) || null);

  // Extract unique languages from all episode links
  const uniqueLanguages = show.seasons.reduce((acc: string[], season) => {
    season.episodes.forEach((ep) => {
      if (ep.links) {
        ep.links.forEach((link) => {
          if (link.languages) {
            link.languages.forEach((lang) => {
              if (lang && !acc.includes(lang)) {
                acc.push(lang);
              }
            });
          }
        });
      }
    });
    return acc.sort(); // Sort languages alphabetically
  }, []);

  // Handle navigation to search page with language filter
  const handleLanguageClick = (lang: string) => {
    const currentQuery = searchParams.get('q') || '';
    const queryParams = new URLSearchParams();
    if (currentQuery) queryParams.set('q', currentQuery);
    queryParams.set('lang', lang);
    router.push(`/search?${queryParams.toString()}`);
  };

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
                alt={show.title}
                className="w-full rounded-lg shadow-2xl border border-[var(--color-border)]"
              />
            </div>
          )}
          <div className="flex-1 space-y-4">
            <h1 className="text-3xl sm:text-4xl font-bold">{show.title}</h1>
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
                  <Link
                    key={g}
                    href={`/search?genre=${encodeURIComponent(g)}`}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/30 border border-purple-500/30 text-purple-300 hover:bg-purple-900/50 transition-colors"
                  >
                    {g}
                  </Link>
                ))}
              </div>
            )}
            {/* Display Languages */}
            {uniqueLanguages.length > 0 && (
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-dim)] mr-1">
                  Languages:
                </span>
                {uniqueLanguages.map((lang) => (
                  <Link
                    key={lang}
                    href={`/search?lang=${encodeURIComponent(lang)}`}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/30 border border-blue-500/30 text-blue-300 hover:bg-blue-900/50 transition-colors"
                  >
                    {lang}
                  </Link>
                ))}
              </div>
            )}
            {show.overview && (
              <p className="max-w-3xl leading-relaxed text-[var(--color-text)]">
                {show.overview}
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              <WatchlistButton kind="tv" contentId={show.id} />
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 space-y-4">
        <h2 className="text-xl font-semibold">Episodes</h2>
        {!hasAnyLinks && (
          <div className="mb-6">
            <MissingLinksRequest
              tmdbId={show.tmdb_id}
              contentType="tv"
              title={show.title}
            />
          </div>
        )}
        {show.seasons.length === 0 ? (
          <div className="rounded-md border border-dashed border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text-dim)]">
            No episodes available yet.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {show.seasons.map((s) => (
                <button
                  key={s.season_number}
                  onClick={() => setActiveSeasonNum(s.season_number)}
                  className={`px-4 py-2 rounded-md text-sm whitespace-nowrap transition-colors ${
                    s.season_number === activeSeasonNum
                      ? 'bg-[var(--color-brand)] text-white'
                      : 'bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-white'
                  }`}
                >
                  Season {s.season_number}
                </button>
              ))}
            </div>
            
            <div className="space-y-3 pb-20">
              {episodes.map((ep) => (
                <EpisodeRow key={ep.id} ep={ep} />
              ))}
            </div>
          </>
        )}
      </div>
      <div className="px-4 sm:px-6 pb-12">
        <AdRenderer position="detail_bottom" />
      </div>
    </div>
  );
}

function EpisodeRow({ ep }: { ep: Episode }) {
  const hasLinks = ep.links && ep.links.length > 0;

  return (
    <div className="flex flex-col sm:flex-row gap-4 p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] hover:border-[var(--color-border-hover)] transition-colors group">
      <div className="w-full sm:w-64 aspect-video flex-shrink-0 rounded-lg overflow-hidden bg-[var(--color-bg)] border border-[var(--color-border)] relative shadow-lg">
        {ep.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ep.thumbnail_url}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-xs text-[var(--color-text-dim)] bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-bg)]">
            No Preview
          </div>
        )}
        <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border border-white/10 text-white">
          E{ep.episode_number}
        </div>
        {ep.runtime && (
          <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-md rounded px-1.5 py-0.5 text-[10px] font-bold text-white">
            {ep.runtime}m
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="font-bold text-lg group-hover:text-[var(--color-brand)] transition-colors truncate flex items-center gap-2">
          <span className="text-[var(--color-brand)] opacity-50 text-base font-mono">
            {ep.episode_number.toString().padStart(2, '0')}
          </span>
          {ep.title ?? `Episode ${ep.episode_number}`}
        </div>
        {ep.overview && (
          <p className="text-sm text-[var(--color-text-dim)] line-clamp-2 mt-1 leading-relaxed">
            {ep.overview}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <StreamLauncher
            links={ep.links}
            watchHrefBase={`/watch/episode/${ep.id}`}
            contentId={ep.id}
            contentType="episode"
          />
          <ReportButton contentType="episode" contentId={ep.id} />
        </div>
      </div>
    </div>
  );
}
