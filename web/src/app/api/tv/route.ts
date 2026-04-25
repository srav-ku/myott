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

export const runtime = 'nodejs';

const CATEGORIES = [
  'popular',
  'top_rated',
  'on_the_air',
  'airing_today',
  'trending',
] as const;

const QuerySchema = z.object({
  category: z.enum(CATEGORIES).optional().default('popular'),
  page: z.coerce.number().int().min(1).max(500).optional().default(1),
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

    const data = await tmdb<TmdbPaged<TmdbListItem>>(path, params);
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
    });
  } catch (err) {
    if (err instanceof z.ZodError) return badRequest(err);
    return serverError(err);
  }
}
