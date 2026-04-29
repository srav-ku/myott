'use client';
import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { LinksManager } from '@/components/LinksManager';
import { ChevronLeft, Loader2, Trash2, ExternalLink } from 'lucide-react';

type Movie = {
  id: number;
  tmdb_id: number;
  title: string;
  overview: string | null;
  poster_url: string | null;
  release_year: number | null;
};

function Inner({ tmdbId }: { tmdbId: number }) {
  const [movie, setMovie] = useState<Movie | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const r = await api<Movie>(`/api/movies/${tmdbId}`);
      if (r.ok) setMovie(r.data);
      else setErr(r.error);
    })();
  }, [tmdbId]);

  async function deleteMovie() {
    if (!movie) return;
    if (!confirm(`Delete "${movie.title}" and all its links from the catalogue?`))
      return;
    const r = await api(`/api/admin/movies/${movie.id}`, { method: 'DELETE' });
    if (r.ok) window.location.href = '/admin';
    else alert(r.error);
  }

  if (err)
    return <div className="px-6 py-12 text-center text-[var(--color-brand)]">{err}</div>;
  if (!movie)
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="animate-spin text-[var(--color-brand)]" />
      </div>
    );

  return (
    <div className="space-y-6 pb-20">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-[var(--color-text-dim)] hover:text-white"
      >
        <ChevronLeft size={16} /> Back
      </Link>

      <div className="flex flex-col sm:flex-row gap-4">
        {movie.poster_url && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={movie.poster_url}
            alt=""
            className="w-24 rounded border border-[var(--color-border)] shadow-lg"
          />
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{movie.title}</h1>
          <div className="text-xs text-[var(--color-text-dim)] mt-1">
            MOVIE · TMDB #{movie.tmdb_id}
            {movie.release_year && ` · ${movie.release_year}`}
          </div>
          {movie.overview && (
            <p className="text-sm text-[var(--color-text-dim)] mt-2 line-clamp-2 max-w-2xl">
              {movie.overview}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/movies/${movie.tmdb_id}`}
              className="text-xs border border-[var(--color-border)] hover:border-white rounded-lg px-3 py-1.5 inline-flex items-center gap-1.5 transition-all"
            >
              <ExternalLink size={12} /> View public page
            </Link>
            <button
              onClick={deleteMovie}
              className="text-xs border border-[var(--color-brand)] text-[var(--color-brand)] hover:bg-[var(--color-brand)] hover:text-white rounded-lg px-3 py-1.5 inline-flex items-center gap-1.5 transition-all"
            >
              <Trash2 size={12} /> Delete movie
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6">
        <LinksManager scope={{ kind: 'movie', movieId: movie.id }} />
      </div>
    </div>
  );
}

export default function ManageMoviePage({
  params,
}: {
  params: Promise<{ tmdbId: string }>;
}) {
  const { tmdbId } = use(params);
  return (
    <Inner tmdbId={Number(tmdbId)} />
  );
}
