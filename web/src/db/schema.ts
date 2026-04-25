import { sql } from 'drizzle-orm';
import {
  sqliteTable,
  integer,
  text,
  real,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/sqlite-core';

/* -------------------------------------------------------------------------- */
/*                                   MOVIES                                   */
/* -------------------------------------------------------------------------- */

export const movies = sqliteTable(
  'movies',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    tmdbId: integer('tmdb_id'),
    imdbId: text('imdb_id'),

    title: text('title').notNull(),
    overview: text('overview'),
    posterPath: text('poster_path'),
    backdropPath: text('backdrop_path'),
    rating: real('rating'),
    releaseDate: text('release_date'),
    releaseYear: integer('release_year'),
    runtime: integer('runtime'),

    /** JSON array of genre names, e.g. ["Action","Drama"]. */
    genres: text('genres', { mode: 'json' }).$type<string[]>().default([]),

    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => ({
    tmdbIdx: uniqueIndex('movies_tmdb_id_unique').on(t.tmdbId),
    titleIdx: index('movies_title_idx').on(t.title),
    yearIdx: index('movies_year_idx').on(t.releaseYear),
  }),
);

/* -------------------------------------------------------------------------- */
/*                                     TV                                     */
/* -------------------------------------------------------------------------- */

export const tv = sqliteTable(
  'tv',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    tmdbId: integer('tmdb_id'),
    imdbId: text('imdb_id'),

    name: text('name').notNull(),
    overview: text('overview'),
    posterPath: text('poster_path'),
    backdropPath: text('backdrop_path'),
    rating: real('rating'),
    firstAirDate: text('first_air_date'),
    releaseYear: integer('release_year'),

    numberOfSeasons: integer('number_of_seasons'),
    numberOfEpisodes: integer('number_of_episodes'),

    genres: text('genres', { mode: 'json' }).$type<string[]>().default([]),

    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => ({
    tmdbIdx: uniqueIndex('tv_tmdb_id_unique').on(t.tmdbId),
    nameIdx: index('tv_name_idx').on(t.name),
    yearIdx: index('tv_year_idx').on(t.releaseYear),
  }),
);

/* -------------------------------------------------------------------------- */
/*                                  EPISODES                                  */
/* -------------------------------------------------------------------------- */

export const episodes = sqliteTable(
  'episodes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    tvId: integer('tv_id')
      .notNull()
      .references(() => tv.id, { onDelete: 'cascade' }),

    seasonNumber: integer('season_number').notNull(),
    episodeNumber: integer('episode_number').notNull(),

    title: text('title'),
    overview: text('overview'),
    stillPath: text('still_path'),

    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => ({
    uniq: uniqueIndex('episodes_tv_season_episode_unique').on(
      t.tvId,
      t.seasonNumber,
      t.episodeNumber,
    ),
    tvSeasonIdx: index('episodes_tv_season_idx').on(t.tvId, t.seasonNumber),
  }),
);

/* -------------------------------------------------------------------------- */
/*                                   LINKS                                    */
/* -------------------------------------------------------------------------- */

export const QUALITIES = ['720p', '1080p'] as const;
export type Quality = (typeof QUALITIES)[number];

export const LINK_TYPES = ['direct', 'extract'] as const;
export type LinkType = (typeof LINK_TYPES)[number];

export const links = sqliteTable(
  'links',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),

    movieId: integer('movie_id').references(() => movies.id, {
      onDelete: 'cascade',
    }),
    episodeId: integer('episode_id').references(() => episodes.id, {
      onDelete: 'cascade',
    }),

    quality: text('quality', { enum: QUALITIES }).notNull(),
    type: text('type', { enum: LINK_TYPES }).notNull(),

    /** Admin-entered URL (direct stream OR embed/player page). */
    url: text('url').notNull(),
    /** Resolved direct stream URL (only populated for `type = 'extract'`). */
    extractedUrl: text('extracted_url'),
    /** Unix-seconds expiry for `extractedUrl`. */
    expiresAt: integer('expires_at', { mode: 'timestamp' }),

    /** JSON array of language codes, e.g. ["en","hi","te"]. */
    languages: text('languages', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default([]),

    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => ({
    // EXACTLY one of (movie_id, episode_id) is set.
    xorCheck: check(
      'links_movie_or_episode_xor',
      sql`((${t.movieId} IS NOT NULL AND ${t.episodeId} IS NULL) OR (${t.movieId} IS NULL AND ${t.episodeId} IS NOT NULL))`,
    ),
    // One link per quality per movie / episode.
    movieQualityUniq: uniqueIndex('links_movie_quality_unique').on(
      t.movieId,
      t.quality,
    ),
    episodeQualityUniq: uniqueIndex('links_episode_quality_unique').on(
      t.episodeId,
      t.quality,
    ),
    movieIdx: index('links_movie_idx').on(t.movieId),
    episodeIdx: index('links_episode_idx').on(t.episodeId),
  }),
);

/* -------------------------------------------------------------------------- */
/*                                    USERS                                   */
/* -------------------------------------------------------------------------- */

export const users = sqliteTable(
  'users',
  {
    /** Firebase UID (text) — guests use a generated id with prefix `guest:`. */
    id: text('id').primaryKey(),
    email: text('email'),
    displayName: text('display_name'),
    photoUrl: text('photo_url'),
    authProvider: text('auth_provider', { enum: ['google', 'guest'] }).notNull(),
    isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => ({
    emailIdx: uniqueIndex('users_email_unique').on(t.email),
  }),
);

/* -------------------------------------------------------------------------- */
/*                                  WATCHLIST                                 */
/* -------------------------------------------------------------------------- */

export const CONTENT_TYPES = ['movie', 'tv'] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const watchlist = sqliteTable(
  'watchlist',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    contentType: text('content_type', { enum: CONTENT_TYPES }).notNull(),
    contentId: integer('content_id').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => ({
    uniq: uniqueIndex('watchlist_user_content_unique').on(
      t.userId,
      t.contentType,
      t.contentId,
    ),
    userIdx: index('watchlist_user_idx').on(t.userId),
  }),
);

/* -------------------------------------------------------------------------- */
/*                                   HISTORY                                  */
/* -------------------------------------------------------------------------- */

export const history = sqliteTable(
  'history',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    movieId: integer('movie_id').references(() => movies.id, {
      onDelete: 'cascade',
    }),
    episodeId: integer('episode_id').references(() => episodes.id, {
      onDelete: 'cascade',
    }),
    lastWatchedAt: integer('last_watched_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => ({
    xorCheck: check(
      'history_movie_or_episode_xor',
      sql`((${t.movieId} IS NOT NULL AND ${t.episodeId} IS NULL) OR (${t.movieId} IS NULL AND ${t.episodeId} IS NOT NULL))`,
    ),
    userMovieUniq: uniqueIndex('history_user_movie_unique').on(t.userId, t.movieId),
    userEpisodeUniq: uniqueIndex('history_user_episode_unique').on(
      t.userId,
      t.episodeId,
    ),
    userIdx: index('history_user_idx').on(t.userId),
  }),
);

/* -------------------------------------------------------------------------- */
/*                                  LANGUAGES                                 */
/* -------------------------------------------------------------------------- */

export const languages = sqliteTable(
  'languages',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    /** ISO 639-1 code, e.g. "en", "hi", "te". */
    code: text('code').notNull(),
    name: text('name').notNull(),
  },
  (t) => ({
    codeUniq: uniqueIndex('languages_code_unique').on(t.code),
  }),
);

/* -------------------------------------------------------------------------- */
/*                                   REPORTS                                  */
/* -------------------------------------------------------------------------- */

export const REPORT_TARGETS = ['movie', 'episode'] as const;
export const REPORT_ISSUES = [
  'broken_1080p',
  'broken_720p',
  'no_link',
  'wrong_data',
  'other',
] as const;
export const REPORT_STATUS = ['open', 'resolved'] as const;

export const reports = sqliteTable(
  'reports',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    contentType: text('content_type', { enum: REPORT_TARGETS }).notNull(),
    contentId: integer('content_id').notNull(),
    issueType: text('issue_type', { enum: REPORT_ISSUES }).notNull(),
    message: text('message'),
    status: text('status', { enum: REPORT_STATUS }).notNull().default('open'),
    reportedBy: text('reported_by'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    resolvedAt: integer('resolved_at', { mode: 'timestamp' }),
  },
  (t) => ({
    statusIdx: index('reports_status_idx').on(t.status),
    contentIdx: index('reports_content_idx').on(t.contentType, t.contentId),
  }),
);

/* -------------------------------------------------------------------------- */
/*                                SEARCH LOGS                                 */
/* -------------------------------------------------------------------------- */

/**
 * Deduped search log.
 *  - Only meaningful queries (length >= 3) are stored.
 *  - Repeated queries bump `count` and `lastSearchedAt` instead of inserting.
 */
export const searchLogs = sqliteTable(
  'search_logs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    /** Lowercased, trimmed query string. */
    query: text('query').notNull(),
    count: integer('count').notNull().default(1),
    lastSearchedAt: integer('last_searched_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => ({
    queryUniq: uniqueIndex('search_logs_query_unique').on(t.query),
    lastSearchedIdx: index('search_logs_last_searched_idx').on(t.lastSearchedAt),
  }),
);

/* -------------------------------------------------------------------------- */
/*                              CONTENT REQUESTS                              */
/* -------------------------------------------------------------------------- */

export const REQUEST_STATUS = ['pending', 'added', 'ignored'] as const;

/**
 * Created when a search returns 0 results — these are real "missing content"
 * signals admin acts on. Deduped by query.
 */
export const contentRequests = sqliteTable(
  'content_requests',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    query: text('query').notNull(),
    count: integer('count').notNull().default(1),
    status: text('status', { enum: REQUEST_STATUS }).notNull().default('pending'),
    lastRequestedAt: integer('last_requested_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => ({
    queryUniq: uniqueIndex('content_requests_query_unique').on(t.query),
    statusIdx: index('content_requests_status_idx').on(t.status),
  }),
);

/* -------------------------------------------------------------------------- */
/*                              SCHEMA EXPORTS                                */
/* -------------------------------------------------------------------------- */

export const schema = {
  movies,
  tv,
  episodes,
  links,
  users,
  watchlist,
  history,
  languages,
  reports,
  searchLogs,
  contentRequests,
};
