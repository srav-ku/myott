/**
 * Stream-extractor Cloudflare Worker.
 *
 * Endpoints:
 *   GET  /health           → { ok: true }
 *   POST /extract { url }  → { stream_url, expires_at?, type? }
 *
 * Auth (optional): if EXTRACTOR_API_KEY secret is set, callers must send the
 * matching `x-api-key` header.
 *
 * Extractors are plug-and-play (`src/extractors.ts`). Add per-host modules
 * there as needed. The worker ships with a "passthrough" extractor that
 * handles direct media URLs (`.mp4`, `.m3u8`, etc.) so the end-to-end pipeline
 * is testable on day one.
 */
import { extract } from './extractors';

export interface Env {
  EXTRACTOR_API_KEY?: string;
}

const corsHeaders: HeadersInit = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type, x-api-key',
};

function json(body: unknown, status = 200, extra: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      ...corsHeaders,
      ...extra,
    },
  });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (url.pathname === '/health' && req.method === 'GET') {
      return json({ ok: true, service: 'ott-extractor' });
    }

    if (url.pathname === '/extract' && req.method === 'POST') {
      // Optional API key gate
      if (env.EXTRACTOR_API_KEY) {
        const auth = req.headers.get('x-api-key');
        if (auth !== env.EXTRACTOR_API_KEY) {
          return json({ ok: false, error: 'Unauthorized' }, 401);
        }
      }

      let body: { url?: string };
      try {
        body = (await req.json()) as { url?: string };
      } catch {
        return json({ ok: false, error: 'Invalid JSON' }, 400);
      }
      if (!body.url || typeof body.url !== 'string') {
        return json({ ok: false, error: 'Missing url' }, 400);
      }

      try {
        const result = await extract(body.url);
        if (!result) {
          return json(
            { ok: false, error: 'No extractor for this host' },
            501,
          );
        }
        return json(result);
      } catch (err) {
        return json(
          {
            ok: false,
            error: err instanceof Error ? err.message : 'Extraction failed',
          },
          500,
        );
      }
    }

    return json({ ok: false, error: 'Not found' }, 404);
  },
};
