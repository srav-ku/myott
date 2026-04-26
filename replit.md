# Workspace

## Overview

OTT streaming platform — backend + DB built on **Next.js 15 (App Router)** with **Cloudflare D1** as the production database. Local dev uses a libSQL file so the same SQLite-dialect Drizzle schema runs everywhere.

The frontend (also Next.js, with Firebase Google auth) will be added later in this same `web/` app. A separate stream-extractor Cloudflare Worker lives at `workers/extractor/` (Phase 4 — to come).

## Stack

- **Monorepo tool**: pnpm workspaces (`artifacts/*`, `web`, `workers/*`, `scripts`)
- **Node.js**: 24 / **TypeScript**: 5.9 / **Package manager**: pnpm
- **Web app**: Next.js 15.5.2 (App Router), React 19
- **DB ORM**: Drizzle (sqlite-core, dialect: sqlite/D1)
- **DB driver**:
  - Production → Cloudflare D1 via `getRequestContext().env.DB`
  - Local dev → `@libsql/client` against `web/local.db`
- **Validation**: Zod (catalog version)
- **TMDB**: server-side fetch with `next: { revalidate: 3600 }` caching
- **Deploy target**: Cloudflare Pages (`@cloudflare/next-on-pages`)

## Tables (10)

`movies`, `tv`, `episodes`, `links`, `users`, `watchlist`, `history`, `reports`, `search_logs`, `content_requests`

Key constraints:
- `links` & `history`: XOR check — exactly one of `movie_id` / `episode_id` is set
- `links`: `UNIQUE(movie_id, quality)` and `UNIQUE(episode_id, quality)` — one link per quality
- `episodes`: `UNIQUE(tv_id, season_number, episode_number)`
- `links.languages` and `movies.genres`/`tv.genres` stored as JSON arrays
- `search_logs.query` & `content_requests.query` deduped via UNIQUE — repeats bump `count`

Quality enum is strict: only `"720p"` and `"1080p"` accepted (`web/src/lib/quality.ts`).
Languages are normalized via `web/src/lib/languages.ts` (lowercase ISO codes; English names auto-mapped).

## API surface (Phase 3 done)

All routes return `{ ok: true, data: ... }` or `{ ok: false, error, details? }` (see `web/src/lib/http.ts`).

| Route | Source | DB write |
|---|---|---|
| `GET /api/healthz` | — | no |
| `GET /api/movies?category=&page=&genre=&year=&language=&sort_by=` | TMDB | no |
| `GET /api/movies/[tmdbId]` | DB-first → TMDB on miss | yes (once) |
| `GET /api/tv?category=&page=&genre=&language=&sort_by=` | TMDB | no |
| `GET /api/tv/[tmdbId]` | DB-first → TMDB on miss | yes (once) |
| `GET /api/search?q=&type=multi\|movie\|tv&page=` | DB ∪ TMDB; bumps `search_logs`; if 0 hits anywhere → bumps `content_requests` | conditional |

## Key Commands

- `pnpm --filter @workspace/web run dev` — run dev server (workflow `Start application`)
- `pnpm --filter @workspace/web run db:generate` — generate Drizzle migration
- `pnpm --filter @workspace/web run db:migrate:local` — apply migrations to `web/local.db`
- `pnpm --filter @workspace/web run db:migrate:remote` — apply migrations to D1 (requires wrangler login)

## Required env

- `TMDB_API_KEY` — server-side, never exposed to client
- `EXTRACT_TTL_SECONDS` (default 21600) — how long extracted stream URLs are cached
- `EXTRACTOR_URL` — base URL of the stream-extractor worker (Phase 4)
- `ADMIN_EMAILS` (comma-separated) — admin allowlist (Phase 5)

## Roadmap

- ✅ Phase 1 — foundation (Next.js + Drizzle + D1/libSQL wiring)
- ✅ Phase 2 — schema (10 tables with all constraints)
- ✅ Phase 3 — TMDB read APIs (movies/tv/search)
- ✅ Phase 4 — `GET /api/stream/[link_id]` + `workers/extractor` (passthrough + per-host registry)
- ✅ Phase 5 — admin CRUD: links, episodes (single + CSV), movie/tv delete, reports, content-requests
- ✅ Phase 6 — user features (watchlist, history, public report POST + admin/me)
- ✅ Phase 7 — frontend (browse / search / detail / watch / watchlist / history / admin)

## Auth shim (Phase 7)

Pending Firebase wire-up. The browser writes a JSON blob to `localStorage['ott:user']`
(`{ email, displayName }`) via `AuthProvider`/`AuthModal`, and `lib/api.ts` injects
`x-user-email`, `x-user-name`, and `x-admin-email` headers on every fetch. Server-side
`requireUser`/`requireAdmin` accept these headers (open mode) so the whole app works
end-to-end while we slot Firebase in later.

## Frontend pages

- `/` — trending/popular tabs with movie + TV rows
- `/search` — TMDB-backed search across movies and TV
- `/movies/[tmdbId]`, `/tv/[tmdbId]` — detail + season/episode picker
- `/watch/movie/[id]`, `/watch/episode/[id]` — HLS player with quality switcher + report
- `/watchlist`, `/history` — per-user lists (header-shim auth)
- `/admin` — overview, reports queue, content requests
- `/admin/manage`, `/admin/manage/movie/[tmdbId]`, `/admin/manage/tv/[tmdbId]` —
  search TMDB → seed → manage links + episodes (single add + CSV bulk)

## Admin guard

`web/src/lib/admin.ts → requireAdmin(req)`:
- If `ADMIN_EMAILS` env is empty → open mode (dev convenience).
- If set → request must carry header `x-admin-email: <one-of-the-listed-emails>`.
- Once Firebase auth is added, the frontend will verify the Google email server-side and forward it as that header.

## Workflows

- `Start application` → `pnpm --filter @workspace/web run dev` → port `3000`
- `Extractor Worker` → `pnpm --filter @workspace/extractor run dev` (wrangler) → port `8787`
