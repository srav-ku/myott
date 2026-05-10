/**
 * GET /api/tv
 *   ?category=popular|top_rated|on_the_air|airing_today|trending  (default: popular)
 *   ?page=1
 *   ?genre=18
 *   ?language=en
 *   ?sort_by=popularity.desc   (only with discover)
 *
 * No DB writes here.
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
import { tv } from '@/db/schema';
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
        .from(tv)
        .orderBy(desc(tv.createdAt))
        .limit(q.limit)
        .offset((q.page - 1) * q.limit);
      
      return ok({
        page: q.page,
        results: rows.map(s => ({
          id: s.id,
          tmdb_id: s.tmdbId,
          type: 'tv' as const,
          title: s.name,
          overview: s.overview,
          poster_url: tmdbImg(s.posterPath, 'w500'),
          backdrop_url: tmdbImg(s.backdropPath, 'w780'),
          rating: s.rating,
          first_air_date: s.firstAirDate,
        }))
      });
    }

    let path: string;
    const params: Record<string, string | number | undefined> = {
      page: q.page,
    };

    const useDiscover =
      q.genre !== undefined ||
      q.language !== undefined ||
      q.sort_by !== undefined;

    if (useDiscover) {
      path = '/discover/tv';
      if (q.genre) params.with_genres = q.genre;
      if (q.language) params.with_original_language = q.language;
      if (q.sort_by) params.sort_by = q.sort_by;
    } else if (q.category === 'trending') {
      path = '/trending/tv/week';
    } else {
      path = `/tv/${q.category}`;
    }

    // 1. Fetch from TMDB
    const data = await tmdb<TmdbPaged<TmdbListItem>>(path, params);
    
    // 2. Bulk-persist
    if (data.results.length > 0) {
      const values = data.results.map((s) => ({
        tmdbId: s.id,
        name: s.name ?? s.original_name ?? 'Untitled',
        overview: s.overview ?? null,
        posterPath: s.poster_path ?? null,
        backdropPath: s.backdrop_path ?? null,
        rating: s.vote_average ?? null,
        firstAirDate: s.first_air_date ?? null,
        releaseYear: s.first_air_date ? Number(s.first_air_date.slice(0, 4)) : null,
      }));

      for (const v of values) {
        await db.insert(tv).values(v).onConflictDoUpdate({
          target: tv.tmdbId,
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
      results: data.results.map((s) => ({
        tmdb_id: s.id,
        type: 'tv' as const,
        title: s.name ?? s.original_name ?? '',
        overview: s.overview,
        poster_url: tmdbImg(s.poster_path, 'w500'),
        backdrop_url: tmdbImg(s.backdrop_path, 'w780'),
        rating: s.vote_average,
        first_air_date: s.first_air_date ?? null,
        original_language: s.original_language ?? null,
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
