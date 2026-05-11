'use client';
import { useEffect, useState, use } from 'react';
import { api } from '@/lib/api';
import { WatchedButton } from '@/components/WatchedButton';
import { CollectionManager } from '@/components/CollectionManager';
import { StreamLauncher } from '@/components/StreamLauncher';
import { Loader2, Star, Calendar, Clock } from 'lucide-react';
import Link from 'next/link';

type LinkRow = {
  id: number;
  quality: string;
  type: 'direct' | 'extract';
  languages: string[] | null;
};
type Movie = {
  id: number;
  tmdb_id: number;
  title: string;
  overview: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  release_year: number | null;
  rating: number | null;
  runtime: number | null;
  genres: string[] | null;
  links?: LinkRow[];
};

export default function MoviePage({
  params,
}: {
  params: Promise<{ tmdbId: string }>;
}) {
  const { tmdbId } = use(params);
  const [movie, setMovie] = useState<Movie | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const r = await api<Movie>(`/api/movies/${tmdbId}`);
      if (!active) return;
      if (!r.ok) {
        setErr(r.error);
        return;
      }
      setMovie(r.data);
    })();
    return () => {
      active = false;
    };
  }, [tmdbId]);

  if (err) {
    return (
      <div className="px-6 py-12 text-center">
        <div className="text-brand mb-2">{err}</div>
      </div>
    );
  }
  if (!movie) {
    return (
      <div className="px-6 py-24 grid place-items-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const links = movie.links ?? [];

  return (
    <div className="space-y-8">
      <div className="relative">
        {movie.backdrop_url && (
          <div className="absolute inset-0 -z-10 h-[420px] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={movie.backdrop_url}
              alt=""
              className="w-full h-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-linear-to-b from-transparent via-bg/80 to-bg" />
          </div>
        )}
        <div className="px-4 sm:px-6 pt-8 flex flex-col md:flex-row gap-6">
          {movie.poster_url && (
            <div className="w-44 sm:w-56 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={movie.poster_url}
                alt={movie.title}
                className="w-full rounded-lg shadow-2xl border border-border"
              />
            </div>
          )}
          <div className="flex-1 space-y-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">{movie.title}</h1>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-dim">
                {movie.release_year && (
                  <span className="flex items-center gap-1">
                    <Calendar size={14} /> {movie.release_year}
                  </span>
                )}
                {movie.runtime && (
                  <span className="flex items-center gap-1">
                    <Clock size={14} /> {movie.runtime} min
                  </span>
                )}
                {movie.rating && movie.rating > 0 && (
                  <span className="flex items-center gap-1">
                    <Star size={14} className="text-yellow-400 fill-yellow-400" />
                    {movie.rating.toFixed(1)}
                  </span>
                )}
              </div>
              {movie.genres && movie.genres.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {movie.genres.map((g) => (
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
              {/* Aggregated Languages from Links */}
              {(() => {
                const allLangs = new Set<string>();
                links.forEach((l) => {
                  if (l.languages) l.languages.forEach((lang) => allLangs.add(lang));
                });
                if (allLangs.size === 0) return null;
                return (
                  <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-text-dim mr-1">
                      Languages:
                    </span>
                    {Array.from(allLangs)
                      .sort()
                      .map((lang) => (
                        <Link
                          key={lang}
                          href={`/search?lang=${encodeURIComponent(lang)}`}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/30 border border-blue-500/30 text-blue-300 hover:bg-blue-900/50 transition-colors"
                        >
                          {lang}
                        </Link>
                      ))}
                  </div>
                );
              })()}
            </div>
            {movie.overview && (
              <p className="text-text max-w-3xl leading-relaxed">
                {movie.overview}
              </p>
            )}
            <StreamLauncher
              links={links}
              watchHrefBase={`/watch/movie/${movie.id}`}
              contentId={movie.id}
              contentType="movie"
            />

            <div className="flex flex-wrap gap-2 pt-4">
              <WatchedButton movieId={movie.id} />
              <CollectionManager movieId={movie.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
