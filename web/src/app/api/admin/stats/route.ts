import { NextRequest } from 'next/server';
import { eq, isNull, sql, desc, count } from 'drizzle-orm';
import { ok, serverError } from '@/lib/http';
import { requireAdmin } from '@/lib/admin';
import { getDb } from '@/db/client';
import { movies, tv, episodes, links, reports, contentRequests } from '@/db/schema';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const db = await getDb();

    // 1. moviesWithoutLinks
    const moviesWithoutLinksRes = await db
      .select({ count: count() })
      .from(movies)
      .leftJoin(links, eq(movies.id, links.movieId))
      .where(isNull(links.id));
    const moviesWithoutLinks = moviesWithoutLinksRes[0].count;

    // 2. tvMissingEpisodes (meaning TV shows with missing links in episodes)
    const tvMissingEpisodesRes = await db
      .select({ count: sql`count(distinct ${tv.id})` })
      .from(tv)
      .innerJoin(episodes, eq(tv.id, episodes.tvId))
      .leftJoin(links, eq(episodes.id, links.episodeId))
      .where(isNull(links.id));
    const tvMissingEpisodes = Number((tvMissingEpisodesRes[0] as any).count || 0);

    // 3. pendingReports
    const pendingReportsRes = await db
      .select({ count: count() })
      .from(reports)
      .where(eq(reports.status, 'open'));
    const pendingReports = pendingReportsRes[0].count;

    // 4. pendingRequests
    const pendingRequestsRes = await db
      .select({ count: count() })
      .from(contentRequests)
      .where(eq(contentRequests.status, 'pending'));
    const pendingRequests = pendingRequestsRes[0].count;

    // 5. topReported
    // Using a subquery approach to get details + aggregated count
    const topReported = await db
      .select({
        contentType: reports.contentType,
        contentId: reports.contentId,
        issueType: reports.issueType,
        count: sql<number>`count(*)`,
        movieTitle: movies.title,
        movieTmdbId: movies.tmdbId,
        tvName: tv.name,
        tvTmdbId: tv.tmdbId,
        epTitle: episodes.title,
        epSeason: episodes.seasonNumber,
        epNumber: episodes.episodeNumber,
        epTvName: sql<string>`(SELECT name FROM tv WHERE id = ${episodes.tvId})`,
      })
      .from(reports)
      .leftJoin(movies, sql`${reports.contentType} = 'movie' AND ${reports.contentId} = ${movies.id}`)
      .leftJoin(episodes, sql`${reports.contentType} = 'episode' AND ${reports.contentId} = ${episodes.id}`)
      .leftJoin(tv, sql`${episodes.tvId} = ${tv.id}`)
      .where(eq(reports.status, 'open'))
      .groupBy(reports.contentType, reports.contentId, reports.issueType)
      .orderBy(desc(sql`count(*)`))
      .limit(5);

    // 6. topRequested
    const topRequested = await db
      .select()
      .from(contentRequests)
      .where(eq(contentRequests.status, 'pending'))
      .orderBy(desc(contentRequests.count))
      .limit(5);

    return ok({
      stats: {
        moviesWithoutLinks,
        tvMissingEpisodes,
        pendingReports,
        pendingRequests,
      },
      topReported,
      topRequested,
    });
  } catch (err) {
    return serverError(err);
  }
}
