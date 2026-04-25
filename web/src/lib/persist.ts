/**
 * Helpers for persisting TMDB results into our DB on first lookup.
 * Used by the detail routes (DB-first; on miss → TMDB → save → return).
 */
import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { movies, tv } from '@/db/schema';
import {
  tmdb,
  type TmdbMovieDetail,
  type TmdbTvDetail,
} from '@/lib/tmdb';

function yearFromDate(date?: string | null): number | null {
  if (!date) return null;
  const y = Number(date.slice(0, 4));
  return Number.isFinite(y) && y > 1800 ? y : null;
}

/** Find by tmdb_id, else fetch from TMDB, save, return the saved row. */
export async function getOrCreateMovieByTmdbId(tmdbId: number) {
  const db = await getDb();
  const existing = await db
    .select()
    .from(movies)
    .where(eq(movies.tmdbId, tmdbId))
    .limit(1);
  if (existing.length > 0) return { row: existing[0], created: false };

  const detail = await tmdb<TmdbMovieDetail>(`/movie/${tmdbId}`);
  const inserted = await db
    .insert(movies)
    .values({
      tmdbId: detail.id,
      imdbId: detail.imdb_id ?? null,
      title: detail.title,
      overview: detail.overview ?? null,
      posterPath: detail.poster_path ?? null,
      backdropPath: detail.backdrop_path ?? null,
      rating: detail.vote_average ?? null,
      releaseDate: detail.release_date ?? null,
      releaseYear: yearFromDate(detail.release_date),
      runtime: detail.runtime ?? null,
      genres: (detail.genres ?? []).map((g) => g.name),
    })
    .onConflictDoNothing({ target: movies.tmdbId })
    .returning();

  // Possible race — re-query if onConflict skipped the insert.
  if (inserted.length === 0) {
    const again = await db
      .select()
      .from(movies)
      .where(eq(movies.tmdbId, tmdbId))
      .limit(1);
    return { row: again[0]!, created: false };
  }
  return { row: inserted[0]!, created: true };
}

export async function getOrCreateTvByTmdbId(tmdbId: number) {
  const db = await getDb();
  const existing = await db
    .select()
    .from(tv)
    .where(eq(tv.tmdbId, tmdbId))
    .limit(1);
  if (existing.length > 0) return { row: existing[0], created: false };

  const detail = await tmdb<TmdbTvDetail>(`/tv/${tmdbId}`, {
    append_to_response: 'external_ids',
  });
  const inserted = await db
    .insert(tv)
    .values({
      tmdbId: detail.id,
      imdbId: detail.external_ids?.imdb_id ?? null,
      name: detail.name,
      overview: detail.overview ?? null,
      posterPath: detail.poster_path ?? null,
      backdropPath: detail.backdrop_path ?? null,
      rating: detail.vote_average ?? null,
      firstAirDate: detail.first_air_date ?? null,
      releaseYear: yearFromDate(detail.first_air_date),
      numberOfSeasons: detail.number_of_seasons ?? null,
      numberOfEpisodes: detail.number_of_episodes ?? null,
      genres: (detail.genres ?? []).map((g) => g.name),
    })
    .onConflictDoNothing({ target: tv.tmdbId })
    .returning();

  if (inserted.length === 0) {
    const again = await db
      .select()
      .from(tv)
      .where(eq(tv.tmdbId, tmdbId))
      .limit(1);
    return { row: again[0]!, created: false };
  }
  return { row: inserted[0]!, created: true };
}
