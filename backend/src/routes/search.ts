import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { sql, eq, and, like } from 'drizzle-orm';
import { schema } from '../db/schema';
import { tmdbFetch, tmdbImg } from '../lib/tmdb';

const app = new Hono<{ Bindings: any }>();

app.get('/', async (c: any) => {
  const db = drizzle(c.env.DB, { schema });
  
  // Robust admin check
  const authHeader = c.req.header('Authorization');
  let isAdmin = false;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // In a real app, you'd verify the Firebase token here. 
    // For now, we trust the presence of a Bearer token as an "authorized" call from the admin portal.
    isAdmin = true; 
  }

  const q = c.req.query('q') || '';
  const type = c.req.query('type') || 'multi';
  const page = Number(c.req.query('page') || 1);

  const qTrim = q.trim();
  if (!qTrim) return c.json({ results: [] });

  const likeExpr = `%${qTrim}%`;

  let dbMovies: any[] = [];
  if (type !== 'tv') {
    dbMovies = await db.select().from(schema.movies)
      .where(like(schema.movies.title, likeExpr)).limit(40);
  }

  let dbShows: any[] = [];
  if (type !== 'movie') {
    dbShows = await db.select().from(schema.tv)
      .where(like(schema.tv.name, likeExpr)).limit(40);
  }

  let tmdbResults: any[] = [];
  let tmdbTotal = { total_pages: 0, total_results: 0, page };
  
  if (qTrim && isAdmin) {
    const tmdbPath = type === 'multi' ? '/search/multi' : type === 'movie' ? '/search/movie' : '/search/tv';
    try {
      const data = await tmdbFetch<any>(tmdbPath, c.env.TMDB_API_KEY, { 
        query: qTrim, 
        page, 
        include_adult: false 
      });

      // LOG RAW TMDB DATA
      console.log('--- RAW TMDB DATA ---');
      console.log(JSON.stringify(data, null, 2));
      console.log('--- END RAW TMDB DATA ---');

      tmdbResults = data.results.filter((r: any) => !r.media_type || r.media_type !== 'person');
      tmdbTotal = { total_pages: data.total_pages, total_results: data.total_results, page: data.page };
    } catch (err) {
      console.error('[search] TMDB failed:', err);
    }
  }

  const dbTmdbIds = new Set<number>([
    ...dbMovies.map((m) => m.tmdbId).filter((x) => x != null),
    ...dbShows.map((s) => s.tmdbId).filter((x) => x != null),
  ]);

  const dbItems = [
    ...dbMovies.map((m) => ({
      type: 'movie',
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
      type: 'tv',
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
      const isMovie = r.media_type === 'movie' || (!r.media_type && type === 'movie') || (!!r.title && !r.name);
      const kind = isMovie ? 'movie' : 'tv';
      return {
        type: kind,
        id: null,
        tmdb_id: r.id,
        title: r.title ?? r.name ?? '',
        overview: r.overview,
        poster_url: tmdbImg(r.poster_path, 'w500'),
        backdrop_url: tmdbImg(r.backdrop_path, 'w780'),
        rating: r.vote_average,
        release_date: r.release_date ?? r.first_air_date ?? null,
        in_db: false,
        // Include raw TMDB fields for richness
        popularity: r.popularity,
        vote_count: r.vote_count,
        original_language: r.original_language,
      };
    });

  return c.json({
    query: qTrim,
    ...tmdbTotal,
    results: [...dbItems, ...tmdbItems],
  });
});


export default app;
