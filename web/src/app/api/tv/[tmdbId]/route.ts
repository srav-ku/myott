/**
 * GET /api/tv/[tmdbId]
 *   - DB-first by tmdb_id.
 *   - On miss: fetch from TMDB, persist once, return.
 *   - Includes a lightweight seasons summary fetched live from TMDB
 *     (we don't bulk-create episode rows here — episodes are created on
 *     demand by season fetch / admin CSV import).
 */
import { NextRequest } from 'next/server';
import { ok, fail, notFound, serverError } from '@/lib/http';
import { getOrCreateTvByTmdbId } from '@/lib/persist';
import { tmdb, tmdbImg, type TmdbTvDetail } from '@/lib/tmdb';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ tmdbId: string }> },
) {
  const { tmdbId: tmdbIdRaw } = await ctx.params;
  const tmdbId = Number(tmdbIdRaw);
  if (!Number.isFinite(tmdbId) || tmdbId <= 0) {
    return fail('Invalid tmdbId', 400);
  }

  try {
    const { row: show, created } = await getOrCreateTvByTmdbId(tmdbId);
    if (!show) return notFound('TV show not found');

    // Fetch fresh seasons summary (cached by TMDB layer).
    let seasons: Array<{
      season_number: number;
      episode_count: number;
      name: string;
      poster_url: string | null;
      air_date: string | null;
    }> = [];
    try {
      const fresh = await tmdb<
        TmdbTvDetail & {
          seasons?: Array<{
            season_number: number;
            episode_count: number;
            name: string;
            poster_path: string | null;
            air_date: string | null;
          }>;
        }
      >(`/tv/${tmdbId}`);
      seasons = (fresh.seasons ?? [])
        .filter((s) => s.season_number > 0) // hide season 0 ("Specials")
        .map((s) => ({
          season_number: s.season_number,
          episode_count: s.episode_count,
          name: s.name,
          poster_url: tmdbImg(s.poster_path, 'w300'),
          air_date: s.air_date,
        }));
    } catch {
      // non-fatal; just omit seasons
    }

    return ok({
      id: show.id,
      tmdb_id: show.tmdbId,
      imdb_id: show.imdbId,
      name: show.name,
      overview: show.overview,
      poster_url: tmdbImg(show.posterPath, 'w500'),
      backdrop_url: tmdbImg(show.backdropPath, 'original'),
      rating: show.rating,
      first_air_date: show.firstAirDate,
      release_year: show.releaseYear,
      number_of_seasons: show.numberOfSeasons,
      number_of_episodes: show.numberOfEpisodes,
      genres: show.genres ?? [],
      seasons,
      _meta: { source: created ? 'tmdb' : 'cache' },
    });
  } catch (err) {
    return serverError(err);
  }
}
