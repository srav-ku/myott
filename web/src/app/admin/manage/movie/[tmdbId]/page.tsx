'use client';
import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { LinksManager } from '@/components/LinksManager';
import { ChevronLeft, Loader2, Trash2 } from 'lucide-react';

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
    if (!confirm(`Delete "${movie.title}" and all its links from the catalog?`))
      return;
    const r = await api(`/api/admin/movies/${movie.id}`, { method: 'DELETE' });
    if (r.ok) window.location.href = '/admin/manage';
    else alert(r.error);
  }

  if (err)
    return <div className="px-6 py-12 text-center text-[var(--color-brand)]">{err}</div>;
  if (!movie)
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6">
      <Link
        href="/admin/manage"
        className="inline-flex items-center gap-1 text-sm text-[var(--color-text-dim)] hover:text-white"
      >
        <ChevronLeft size={16} /> Manage Content
      </Link>
      <div className="flex flex-col sm:flex-row gap-4">
        {movie.poster_url && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={movie.poster_url}
            alt=""
            className="w-32 rounded border border-[var(--color-border)]"
          />
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{movie.title}</h1>
          <div className="text-xs text-[var(--color-text-dim)] mt-1">
            Movie · DB id {movie.id} · TMDB #{movie.tmdb_id}
            {movie.release_year && ` · ${movie.release_year}`}
          </div>
          {movie.overview && (
            <p className="text-sm text-[var(--color-text-dim)] mt-2 line-clamp-3">
              {movie.overview}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <Link
              href={`/movies/${movie.tmdb_id}`}
              className="text-sm border border-[var(--color-border)] hover:border-white rounded px-3 py-1.5"
            >
              View public page
            </Link>
            <button
              onClick={deleteMovie}
              className="text-sm border border-[var(--color-brand)] text-[var(--color-brand)] hover:bg-[var(--color-brand)] hover:text-white rounded px-3 py-1.5 inline-flex items-center gap-1"
            >
              <Trash2 size={14} /> Delete movie
            </button>
          </div>
        </div>
      </div>
      <hr className="border-[var(--color-border)]" />
      <LinksManager scope={{ kind: 'movie', movieId: movie.id }} />
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
