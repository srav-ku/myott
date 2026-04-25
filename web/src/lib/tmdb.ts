/**
 * Server-only TMDB v3 client.
 * - Reads `TMDB_API_KEY` from env.
 * - Adds Next.js fetch caching (revalidate 1h) for rate-limit safety.
 * - Never throws raw — wrap with `tmdbSafe` if you want a tagged result.
 */
import 'server-only';

const TMDB_BASE = 'https://api.themoviedb.org/3';
export const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p';

const DEFAULT_REVALIDATE = 60 * 60; // 1h

function getKey(): string {
  const k = process.env.TMDB_API_KEY;
  if (!k) throw new Error('TMDB_API_KEY is not set');
  return k;
}

export type TmdbParams = Record<
  string,
  string | number | boolean | undefined | null
>;

export async function tmdb<T = unknown>(
  path: string,
  params: TmdbParams = {},
  revalidate: number = DEFAULT_REVALIDATE,
): Promise<T> {
  const url = new URL(TMDB_BASE + path);
  url.searchParams.set('api_key', getKey());
  url.searchParams.set('language', params.language?.toString() ?? 'en-US');
  for (const [k, v] of Object.entries(params)) {
    if (k === 'language') continue;
    if (v === undefined || v === null || v === '') continue;
    url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString(), {
    next: { revalidate },
    headers: { accept: 'application/json' },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`TMDB ${path} -> ${res.status}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

/** Try a TMDB call, returning `null` on failure. */
export async function tmdbSafe<T = unknown>(
  path: string,
  params: TmdbParams = {},
  revalidate?: number,
): Promise<T | null> {
  try {
    return await tmdb<T>(path, params, revalidate);
  } catch (err) {
    console.error('[tmdb] failed:', err);
    return null;
  }
}

/** Build a TMDB image URL. Returns `null` for null inputs. */
export function tmdbImg(
  path: string | null | undefined,
  size:
    | 'w92'
    | 'w154'
    | 'w185'
    | 'w300'
    | 'w342'
    | 'w500'
    | 'w780'
    | 'original' = 'w500',
): string | null {
  if (!path) return null;
  return `${TMDB_IMG_BASE}/${size}${path}`;
}

/* -------------------------------------------------------------------------- */
/*                              Response shapes                               */
/* -------------------------------------------------------------------------- */

export type TmdbGenre = { id: number; name: string };

export type TmdbListItem = {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  media_type?: 'movie' | 'tv' | 'person';
  original_language?: string;
};

export type TmdbPaged<T> = {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
};

export type TmdbMovieDetail = {
  id: number;
  imdb_id: string | null;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  release_date: string;
  runtime: number | null;
  genres: TmdbGenre[];
  original_language: string;
};

export type TmdbTvDetail = {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  first_air_date: string;
  number_of_seasons: number;
  number_of_episodes: number;
  genres: TmdbGenre[];
  external_ids?: { imdb_id: string | null };
  original_language: string;
};

export type TmdbSeasonDetail = {
  id: number;
  season_number: number;
  episodes: Array<{
    id: number;
    season_number: number;
    episode_number: number;
    name: string;
    overview: string;
    still_path: string | null;
    air_date: string | null;
  }>;
};
