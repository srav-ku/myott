'use client';
import { MediaRow } from '@/components/MediaRow';

export default function MoviesPage() {
  return (
    <div className="space-y-10 pt-6">
      <div className="px-4 sm:px-6">
        <h1 className="text-3xl font-bold">Movies</h1>
        <p className="text-[var(--color-text-dim)] mt-2">
          Discover the latest trending and popular movies.
        </p>
      </div>

      <MediaRow
        title="Trending Movies"
        endpoint="/api/movies?category=trending&limit=20"
        kind="movie"
      />
      <MediaRow
        title="Popular Movies"
        endpoint="/api/movies?category=popular&limit=20"
        kind="movie"
      />
    </div>
  );
}
