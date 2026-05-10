import { NextRequest } from 'next/server';
import { z } from 'zod';
import { sql, like, eq, and, or } from 'drizzle-orm';
import { ok, badRequest, serverError, parseQuery } from '@/lib/http';
import { getDb } from '@/db/client';
import { movies, tv, links, episodes } from '@/db/schema';
import {
  tmdb,
  tmdbImg,
  type TmdbListItem,
  type TmdbPaged,
} from '@/lib/tmdb';
import { requireAdmin } from '@/lib/admin';

export const runtime = 'nodejs';

const QuerySchema = z.object({
  q: z.string().optional().default(''),
  type: z.enum(['multi', 'movie', 'tv']).optional().default('multi'),
  page: z.coerce.number().int().min(1).max(500).optional().default(1),
  lang: z.string().optional(),
  genre: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const parsed = parseQuery(url, QuerySchema);
  if (!parsed.ok) return parsed.response;
  const { q: rawQ, type, page, lang, genre } = parsed.data;

  const q = rawQ?.trim() || '';
  if (!q && !lang && !genre) return badRequest('Empty query and no filters');
  const likeExpr = q ? `%${q}%` : undefined;
  const langFilterExpr = lang ? `%"${lang}"%` : undefined;
  const genreFilterExpr = genre ? `%"${genre}"%` : undefined;

  try {
    const db = await getDb();
    
    // Check if requester is admin
    const auth = await requireAdmin(req);
    const isAdmin = auth.ok;

    // 1) DB lookup
    let dbMovies: any[] = [];
    if (type !== 'tv') {
      let movieQuery = (db as any)
        .select({
          id: movies.id,
          tmdbId: movies.tmdbId,
          imdbId: movies.imdbId,
          title: movies.title,
          overview: movies.overview,
          posterPath: movies.posterPath,
          backdropPath: movies.backdropPath,
          rating: movies.rating,
          releaseDate: movies.releaseDate,
          releaseYear: movies.releaseYear,
          runtime: movies.runtime,
          genres: movies.genres,
          createdAt: movies.createdAt,
          updatedAt: movies.updatedAt,
        })
        .from(movies);

      const conditions: any[] = [];
      if (likeExpr) conditions.push(like(movies.title, likeExpr));
      if (genreFilterExpr) conditions.push(like(movies.genres, genreFilterExpr));

      if (langFilterExpr) {
        movieQuery = movieQuery.innerJoin(links, eq(links.movieId, movies.id));
        conditions.push(like(links.languages, langFilterExpr));
      }

      if (conditions.length > 0) {
        movieQuery = movieQuery.where(and(...conditions));
      }
      dbMovies = await movieQuery.limit(40);
    }

    let dbShows: any[] = [];
    if (type !== 'movie') {
      let tvQuery = (db as any)
        .select({
          id: tv.id,
          tmdbId: tv.tmdbId,
          imdbId: tv.imdbId,
          name: tv.name,
          overview: tv.overview,
          posterPath: tv.posterPath,
          backdropPath: tv.backdropPath,
          rating: tv.rating,
          firstAirDate: tv.firstAirDate,
          releaseYear: tv.releaseYear,
          numberOfSeasons: tv.numberOfSeasons,
          numberOfEpisodes: tv.numberOfEpisodes,
          genres: tv.genres,
          createdAt: tv.createdAt,
          updatedAt: tv.updatedAt,
        })
        .from(tv);

      const conditions: any[] = [];
      if (likeExpr) conditions.push(like(tv.name, likeExpr));
      if (genreFilterExpr) conditions.push(like(tv.genres, genreFilterExpr));

      if (langFilterExpr) {
        tvQuery = tvQuery
          .innerJoin(episodes, eq(episodes.tvId, tv.id))
          .innerJoin(links, eq(links.episodeId, episodes.id));
        conditions.push(like(links.languages, langFilterExpr));
      }

      if (conditions.length > 0) {
        tvQuery = tvQuery.where(and(...conditions));
      }
      dbShows = await tvQuery.limit(40);
    }

    // 2) TMDB lookup (ONLY FOR ADMINS)
    let tmdbResults: TmdbListItem[] = [];
    let tmdbTotal = { total_pages: 0, total_results: 0, page };
    
    if (q && isAdmin) { 
      const tmdbPath =
        type === 'multi'
          ? '/search/multi'
          : type === 'movie'
            ? '/search/movie'
            : '/search/tv';
      try {
        const data = await tmdb<TmdbPaged<TmdbListItem>>(tmdbPath, {
          query: q,
          page,
          include_adult: false,
        });
        tmdbResults = data.results.filter(
          (r) => !r.media_type || r.media_type !== 'person',
        );
        tmdbTotal = {
          total_pages: data.total_pages,
          total_results: data.total_results,
          page: data.page,
        };
      } catch (err) {
        console.error('[search] TMDB failed:', err);
      }
    }

    // Build unified result list. DB rows first (with internal id), then TMDB.
    const dbTmdbIds = new Set<number>([
      ...dbMovies.map((m) => m.tmdbId).filter((x): x is number => x != null),
      ...dbShows.map((s) => s.tmdbId).filter((x): x is number => x != null),
    ]);

    const dbItems = [
      ...dbMovies.map((m) => {
        const movieRow = m.movies ? m.movies : m;
        return {
          type: 'movie' as const,
          id: movieRow.id,
          tmdb_id: movieRow.tmdbId,
          title: movieRow.title,
          overview: movieRow.overview,
          poster_url: tmdbImg(movieRow.posterPath, 'w500'),
          backdrop_url: tmdbImg(movieRow.backdropPath, 'w780'),
          rating: movieRow.rating,
          release_date: movieRow.releaseDate,
          in_db: true,
        };
      }),
      ...dbShows.map((s) => {
        const tvRow = s.tv ? s.tv : s;
        return {
          type: 'tv' as const,
          id: tvRow.id,
          tmdb_id: tvRow.tmdbId,
          title: tvRow.name,
          overview: tvRow.overview,
          poster_url: tmdbImg(tvRow.posterPath, 'w500'),
          backdrop_url: tmdbImg(tvRow.backdropPath, 'w780'),
          rating: tvRow.rating,
          release_date: tvRow.firstAirDate,
          in_db: true,
        };
      }),
    ];

    const tmdbItems = tmdbResults
      .filter((r) => !dbTmdbIds.has(r.id))
      .map((r) => {
        const isMovie =
          r.media_type === 'movie' || (!r.media_type && type === 'movie');
        const isTv =
          r.media_type === 'tv' || (!r.media_type && type === 'tv');
        const kind = isMovie ? 'movie' : isTv ? 'tv' : (r.title ? 'movie' : 'tv');
        return {
          type: kind as 'movie' | 'tv',
          id: null,
          tmdb_id: r.id,
          title: r.title ?? r.name ?? '',
          overview: r.overview,
          poster_url: tmdbImg(r.poster_path, 'w500'),
          backdrop_url: tmdbImg(r.backdrop_path, 'w780'),
          rating: r.vote_average,
          release_date: r.release_date ?? r.first_air_date ?? null,
          in_db: false,
        };
      });

    return ok({
      query: q,
      ...tmdbTotal,
      results: [...dbItems, ...tmdbItems],
    });
  } catch (err) {
    return serverError(err);
  }
}

