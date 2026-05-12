import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc } from 'drizzle-orm';
import { tmdbFetch, tmdbImg } from '../lib/tmdb';
import { schema } from '../db/schema';

const app = new Hono<{ Bindings: any }>();

app.get('/', async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const q = c.req.query();
  const page = Math.max(1, Number(q.page) || 1);
  const limit = Math.min(100, Number(q.limit) || 20);

  // Runtime rule: Local DB only
  const rows = await db
    .select({
      id: schema.tv.id,
      tmdbId: schema.tv.tmdbId,
      name: schema.tv.name,
      overview: schema.tv.overview,
      posterPath: schema.tv.posterPath,
      backdropPath: schema.tv.backdropPath,
      rating: schema.tv.rating,
      firstAirDate: schema.tv.firstAirDate,
    })
    .from(schema.tv)
    .orderBy(desc(schema.tv.updatedAt))
    .limit(limit)
    .offset((page - 1) * limit);

  return c.json({
    page,
    results: rows.map(t => ({
      id: t.id,
      tmdb_id: t.tmdbId,
      type: 'tv',
      name: t.name,
      overview: t.overview,
      poster_url: tmdbImg(t.posterPath, 'w500'),
      backdrop_url: tmdbImg(t.backdropPath, 'w780'),
      rating: t.rating,
      release_date: t.firstAirDate,
    }))
  });
});

app.get('/:tmdbId', async (c) => {
  const tmdbId = Number(c.req.param('tmdbId'));
  const db = drizzle(c.env.DB, { schema });

  let [series] = await db.select().from(schema.tv).where(eq(schema.tv.tmdbId, tmdbId)).limit(1);
  
  if (!series) {
    try {
      const detail = await tmdbFetch<any>(`/tv/${tmdbId}`, c.env.TMDB_API_KEY);
      const [inserted] = await db.insert(schema.tv).values({
        tmdbId: detail.id,
        imdbId: detail.external_ids?.imdb_id || null, // Note: external_ids requires append_to_response=external_ids
        name: detail.name,
        overview: detail.overview || null,
        posterPath: detail.poster_path || null,
        backdropPath: detail.backdrop_path || null,
        rating: detail.vote_average || null,
        firstAirDate: detail.first_air_date || null,
        releaseYear: detail.first_air_date ? Number(detail.first_air_date.slice(0, 4)) : null,
        numberOfSeasons: detail.number_of_seasons || null,
        numberOfEpisodes: detail.number_of_episodes || null,
        genres: (detail.genres || []).map((g: any) => g.name),
      }).returning();
      series = inserted;

      // Ingest all episodes automatically
      if (detail.seasons && Array.isArray(detail.seasons)) {
        for (const season of detail.seasons) {
          if (season.season_number > 0) {
            try {
              const seasonData = await tmdbFetch<any>(`/tv/${tmdbId}/season/${season.season_number}`, c.env.TMDB_API_KEY);
              if (seasonData.episodes && Array.isArray(seasonData.episodes)) {
                for (const ep of seasonData.episodes) {
                  await db.insert(schema.episodes).values({
                    tvId: series.id,
                    seasonNumber: ep.season_number,
                    episodeNumber: ep.episode_number,
                    title: ep.name || null,
                    overview: ep.overview || null,
                    stillPath: ep.still_path || null,
                    runtime: ep.runtime || null,
                  }).onConflictDoNothing();
                }
              }
            } catch (err) {
              console.error(`Failed to fetch season ${season.season_number} for TV ${tmdbId}`, err);
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      return c.json({ error: 'TV Show not found in DB or TMDB' }, 404);
    }
  }

  let episodes = await db.select().from(schema.episodes).where(eq(schema.episodes.tvId, series.id));

  if (episodes.length === 0) {
    try {
      const detail = await tmdbFetch<any>(`/tv/${tmdbId}`, c.env.TMDB_API_KEY);
      if (detail.seasons && Array.isArray(detail.seasons)) {
        for (const season of detail.seasons) {
          if (season.season_number > 0) {
            try {
              const seasonData = await tmdbFetch<any>(`/tv/${tmdbId}/season/${season.season_number}`, c.env.TMDB_API_KEY);
              if (seasonData.episodes && Array.isArray(seasonData.episodes)) {
                for (const ep of seasonData.episodes) {
                  await db.insert(schema.episodes).values({
                    tvId: series.id,
                    seasonNumber: ep.season_number,
                    episodeNumber: ep.episode_number,
                    title: ep.name || null,
                    overview: ep.overview || null,
                    stillPath: ep.still_path || null,
                    runtime: ep.runtime || null,
                  }).onConflictDoNothing();
                }
              }
            } catch (err) {
              console.error(`Failed to fetch season ${season.season_number} for TV ${tmdbId}`, err);
            }
          }
        }
      }
      // Re-fetch after ingestion
      episodes = await db.select().from(schema.episodes).where(eq(schema.episodes.tvId, series.id));
    } catch (err) {
      console.error('Failed to ingest missing episodes for TV', err);
    }
  }

  return c.json({
    ...series,
    poster_url: tmdbImg(series.posterPath, 'w500'),
    backdrop_url: tmdbImg(series.backdropPath, 'original'),
    episodes,
  });
});

export default app;
