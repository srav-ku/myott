/**
 * GET /api/movies
 *   ?category=popular|top_rated|now_playing|upcoming|trending  (default: popular)
 *   ?page=1
 *   ?genre=28              (TMDB genre id; switches to /discover/movie)
 *   ?year=2024
 *   ?language=en           (TMDB original_language filter)
 *   ?sort_by=popularity.desc   (only with discover)
 *
 * No DB writes here — list endpoints just proxy TMDB (with fetch caching).
 */
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, badRequest, serverError, parseQuery } from '@/lib/http';
import {
  tmdb,
  tmdbImg,
  type TmdbListItem,
  type TmdbPaged,
} from '@/lib/tmdb';
import { getDb } from '@/db/client';
import { movies } from '@/db/schema';
import { sql, desc } from 'drizzle-orm';

export const runtime = 'nodejs';
const CATEGORIES = [
  'trending',
] as const;

const QuerySchema = z.object({
  source: z.enum(['local', 'tmdb']).optional().default('tmdb'),
  category: z.enum(CATEGORIES).optional().default('trending'),
  page: z.coerce.number().int().min(1).max(500).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  genre: z.coerce.number().int().positive().optional(),
  year: z.coerce.number().int().min(1888).max(2100).optional(),
  language: z.string().min(2).max(5).optional(),
  sort_by: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const parsed = parseQuery(url, QuerySchema);
  if (!parsed.ok) return parsed.response;
  const q = parsed.data;

  try {
    const db = await getDb();

    if (q.source === 'local') {
      const rows = await db
        .select()
        .from(movies)
        .orderBy(desc(movies.createdAt))
        .limit(q.limit)
        .offset((q.page - 1) * q.limit);

      return ok({
        page: q.page,
        results: rows.map(m => ({
          id: m.id,
          tmdb_id: m.tmdbId,
          type: 'movie' as const,
          title: m.title,
          overview: m.overview,
          poster_url: tmdbImg(m.posterPath, 'w500'),
          backdrop_url: tmdbImg(m.backdropPath, 'w780'),
          rating: m.rating,
          release_date: m.releaseDate,
        }))
      });
    }

    let path: string;

    const params: Record<string, string | number | undefined> = {
      page: q.page,
    };

    const useDiscover =
      q.genre !== undefined ||
      q.year !== undefined ||
      q.language !== undefined ||
      q.sort_by !== undefined;

    if (useDiscover) {
      path = '/discover/movie';
      if (q.genre) params.with_genres = q.genre;
      if (q.year) params.primary_release_year = q.year;
      if (q.language) params.with_original_language = q.language;
      if (q.sort_by) params.sort_by = q.sort_by;
    } else if (q.category === 'trending') {
      path = '/trending/movie/week';
    } else {
      path = `/movie/${q.category}`;
    }

    // 1. Fetch from TMDB (with built-in caching in tmdb helper)
    const data = await tmdb<TmdbPaged<TmdbListItem>>(path, params);
    
    // 2. Bulk-persist to DB to ensure DB-first availability for subsequent calls
    if (data.results.length > 0) {
      const values = data.results.map((m) => ({
        tmdbId: m.id,
        title: m.title ?? m.original_title ?? 'Untitled',
        overview: m.overview ?? null,
        posterPath: m.poster_path ?? null,
        backdropPath: m.backdrop_path ?? null,
        rating: m.vote_average ?? null,
        releaseDate: m.release_date ?? null,
        releaseYear: m.release_date ? Number(m.release_date.slice(0, 4)) : null,
      }));

      // Use onConflictDoUpdate to keep data fresh but avoid duplicates
      for (const v of values) {
        await db.insert(movies).values(v).onConflictDoUpdate({
          target: movies.tmdbId,
          set: {
            rating: v.rating,
            updatedAt: sql`(unixepoch())`,
          },
        });
      }
    }

    // 3. Return results
    return ok({
      page: data.page,
      total_pages: data.total_pages,
      total_results: data.total_results,
      results: data.results.map((m) => ({
        tmdb_id: m.id,
        type: 'movie' as const,
        title: m.title ?? m.original_title ?? '',
        overview: m.overview,
        poster_url: tmdbImg(m.poster_path, 'w500'),
        backdrop_url: tmdbImg(m.backdrop_path, 'w780'),
        rating: m.vote_average,
        release_date: m.release_date ?? null,
        original_language: m.original_language ?? null,
      })),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800',
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) return badRequest(err);
    return serverError(err);
  }
}
