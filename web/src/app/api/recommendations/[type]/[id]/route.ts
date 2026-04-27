import { NextRequest, NextResponse } from 'next/server';
import { tmdbSafe, tmdbImg, type TmdbPaged, type TmdbListItem } from '@/lib/tmdb';

export const runtime = 'nodejs';

/**
 * GET /api/recommendations/[type]/[id]
 * - type: "movie" | "tv"
 * - id: tmdb_id
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ type: string; id: string }> },
) {
  try {
    const { type, id } = await ctx.params;
    const tmdbId = Number(id);

    if (!['movie', 'tv'].includes(type) || isNaN(tmdbId) || tmdbId <= 0) {
      return NextResponse.json([]);
    }

    const path = `/${type}/${tmdbId}/recommendations`;
    const data = await tmdbSafe<TmdbPaged<TmdbListItem>>(path);

    if (!data || !data.results) {
      return NextResponse.json([]);
    }

    const results = data.results.map((r) => ({
      id: r.id,
      title: r.title ?? r.name ?? '',
      poster_url: tmdbImg(r.poster_path, 'w500'),
      rating: r.vote_average,
    }));

    return NextResponse.json(results);
  } catch (err) {
    console.error('[recommendations] failed:', err);
    return NextResponse.json([]);
  }
}
