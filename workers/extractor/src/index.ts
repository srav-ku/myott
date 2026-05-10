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
  BOT_TOKEN?: string;
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

async function sendTelegramMessage(token: string, chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      disable_web_page_preview: true,
    }),
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

    // --- TELEGRAM BOT LOGIC ---
    // If it's a POST and we have a BOT_TOKEN, check if it's a Telegram webhook.
    // Usually Telegram sends to the root '/' or a specific secret path.
    if (req.method === 'POST' && env.BOT_TOKEN) {
      let update: any;
      try {
        update = await req.clone().json();
      } catch {
        update = null;
      }

      if (update && update.message) {
        const chatId = update.message.chat.id;
        const text = update.message.text || '';

        if (text === '/start') {
          await sendTelegramMessage(env.BOT_TOKEN, chatId, 'Send player links and I will extract the final stream URLs.');
          return new Response('ok');
        }

        const urls = [...text.matchAll(/https?:\/\/\S+/g)].map((m) => m[0]);
        if (urls.length === 0) {
          await sendTelegramMessage(env.BOT_TOKEN, chatId, 'No valid links found.');
          return new Response('ok');
        }

        await sendTelegramMessage(env.BOT_TOKEN, chatId, `Extracting from ${urls.length} link(s)...`);

        const results: string[] = [];
        for (const u of urls) {
          const res = await extract(u);
          if (res?.stream_url) results.push(res.stream_url);
        }

        if (results.length === 0) {
          await sendTelegramMessage(env.BOT_TOKEN, chatId, 'No final URLs extracted.');
        } else {
          let msg = `Extracted ${results.length} final link(s):\n\n`;
          results.forEach((link, i) => {
            msg += `${i + 1}. ${link}\n`;
          });
          await sendTelegramMessage(env.BOT_TOKEN, chatId, msg);
        }
        return new Response('ok');
      }
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
          return json({ ok: false, error: 'No extractor for this host' }, 501);
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
