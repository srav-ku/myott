import { NextRequest } from 'next/server';
import { z } from 'zod';
import { sql, like, eq, and, or } from 'drizzle-orm';
import { ok, badRequest, serverError, parseQuery } from '@/lib/http';
import { getDb } from '@/db/client';
import { movies, tv, searchLogs, contentRequests, links, episodes } from '@/db/schema'; // Import links and episodes
import {
  tmdb,
  tmdbImg,
  type TmdbListItem,
  type TmdbPaged,
} from '@/lib/tmdb';

export const runtime = 'nodejs';

const QuerySchema = z.object({
  q: z.string().optional().default(''),
  type: z.enum(['multi', 'movie', 'tv']).optional().default('multi'),
  page: z.coerce.number().int().min(1).max(500).optional().default(1),
  lang: z.string().optional(),
  genre: z.string().optional(), // New: genre filter
});

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const parsed = parseQuery(url, QuerySchema);
  if (!parsed.ok) return parsed.response;
  const { q: rawQ, type, page, lang, genre } = parsed.data;

  const q = rawQ?.trim() || '';
  if (!q && !lang && !genre) return badRequest('Empty query and no filters');
  const qNorm = q.toLowerCase();
  const likeExpr = q ? `%${q}%` : undefined;
  const langFilterExpr = lang ? `%"${lang}"%` : undefined;
  const genreFilterExpr = genre ? `%"${genre}"%` : undefined; // New: genre filter expression

  try {
    const db = await getDb();

    // 1) DB lookup
    let dbMovies: typeof movies.$inferSelect[] = [];
    if (type !== 'tv') {
      let movieQuery = db
        .selectDistinct({
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
      dbMovies = await movieQuery.limit(20);
    }

    let dbShows: typeof tv.$inferSelect[] = [];
    if (type !== 'movie') {
      let tvQuery = db
        .selectDistinct({
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
      dbShows = await tvQuery.limit(20);
    }

    // 2) TMDB lookup (in parallel)
    const tmdbPath =
      type === 'multi'
        ? '/search/multi'
        : type === 'movie'
          ? '/search/movie'
          : '/search/tv';
    let tmdbResults: TmdbListItem[] = [];
    let tmdbTotal = { total_pages: 0, total_results: 0, page };
    // Skip TMDB search if only filtering by language
    if (q) { 
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

    // 3) Throttle & Logging
    // search_logs: check for existing query and last_searched_at
    const THROTTLE_MS = 5 * 60 * 1000;
    const canLog = qNorm.length >= 3;
    let isThrottled = false;

    if (canLog) {
      const existingLog = await db
        .select({ lastSearchedAt: searchLogs.lastSearchedAt })
        .from(searchLogs)
        .where(eq(searchLogs.query, qNorm))
        .limit(1);

      if (existingLog.length > 0 && existingLog[0].lastSearchedAt) {
        const diff = Date.now() - existingLog[0].lastSearchedAt.getTime();
        if (diff < THROTTLE_MS) {
          isThrottled = true;
        }
      }
    }

    // 4) If completely empty AND NOT throttled → search_logs handles general tracking.
    // content_requests is now handled by a manual POST from the UI.
    const totalHits = dbMovies.length + dbShows.length + tmdbResults.length;

    // 5) Update search_logs if NOT throttled and query is present
    if (canLog && !isThrottled && q) {
      await db
        .insert(searchLogs)
        .values({ query: qNorm })
        .onConflictDoUpdate({
          target: searchLogs.query,
          set: {
            count: sql`${searchLogs.count} + 1`,
            lastSearchedAt: sql`(unixepoch())`,
          },
        });
    }

    // Build unified result list. DB rows first (with internal id), then TMDB.
    const dbTmdbIds = new Set<number>([
      ...dbMovies.map((m) => m.tmdbId).filter((x): x is number => x != null),
      ...dbShows.map((s) => s.tmdbId).filter((x): x is number => x != null),
    ]);

    const dbItems = [
      ...dbMovies.map((m) => ({
        type: 'movie' as const,
        id: m.id,
        tmdb_id: m.tmdbId,
        title: m.title,
        overview: m.overview,
        poster_url: tmdbImg(m.posterPath, 'w500'),
        backdrop_url: tmdbImg(m.backdropPath, 'w780'),
        rating: m.rating,
        release_date: m.releaseDate,
        in_db: true,
      })),
      ...dbShows.map((s) => ({
        type: 'tv' as const,
        id: s.id,
        tmdb_id: s.tmdbId,
        title: s.name,
        overview: s.overview,
        poster_url: tmdbImg(s.posterPath, 'w500'),
        backdrop_url: tmdbImg(s.backdropPath, 'w780'),
        rating: s.rating,
        release_date: s.firstAirDate,
        in_db: true,
      })),
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
      created_request: totalHits === 0 && qNorm.length >= 3,
    });
  } catch (err) {
    return serverError(err);
  }
}

