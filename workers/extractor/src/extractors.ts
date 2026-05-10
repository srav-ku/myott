/**
 * Per-host extractor registry.
 *
 * Each extractor receives the original URL and returns either:
 *   - { stream_url, expires_at?, type? } on success
 *   - null if it can't handle this URL (next extractor is tried)
 *
 * Add a new host by writing a small async function and pushing it onto
 * EXTRACTORS in priority order.
 */

export type ExtractResult = {
  stream_url: string;
  /** Unix seconds. Optional — backend will use EXTRACT_TTL_SECONDS otherwise. */
  expires_at?: number;
  type?: 'hls' | 'mp4' | 'webm' | 'mkv' | 'embed';
};

type Extractor = (url: URL, raw: string) => Promise<ExtractResult | null>;

/** Direct media URLs — return as-is. */
const passthrough: Extractor = async (u) => {
  const path = u.pathname.toLowerCase();
  const map: Array<[RegExp, ExtractResult['type']]> = [
    [/\.m3u8($|\?)/, 'hls'],
    [/\.mp4($|\?)/, 'mp4'],
    [/\.webm($|\?)/, 'webm'],
    [/\.mkv($|\?)/, 'mkv'],
  ];
  for (const [re, type] of map) {
    if (re.test(path) || re.test(u.search)) {
      return {
        stream_url: u.toString(),
        type,
        expires_at: Math.floor(Date.now() / 1000) + 6 * 60 * 60,
      };
    }
  }
  return null;
};

/* -------------------------------------------------------------------------- */
/*                          Per-host extractors (TODO)                        */
/* -------------------------------------------------------------------------- */

/** Scraper for player pages that define a `finalUrl` variable in JS. */
const finalUrlScraper: Extractor = async (u) => {
  // Add hosts that use this pattern
  const supportedHosts = ['mrfooll.xyz'];
  if (!supportedHosts.some(h => u.hostname.endsWith(h))) return null;

  try {
    const res = await fetch(u.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    });
    if (!res.ok) return null;

    const html = await res.text();
    const PATTERN = /const finalUrl\s*=\s*['"]([^'"]+)['"]/;
    const match = PATTERN.exec(html);
    if (!match) return null;

    const streamUrl = match[1].trim();
    
    // Determine type from extension
    let type: ExtractResult['type'] = undefined;
    if (streamUrl.includes('.m3u8')) type = 'hls';
    else if (streamUrl.includes('.mp4')) type = 'mp4';
    else if (streamUrl.includes('.mkv')) type = 'mkv';
    else if (streamUrl.includes('.webm')) type = 'webm';

    return {
      stream_url: streamUrl,
      type,
      expires_at: Math.floor(Date.now() / 1000) + 6 * 60 * 60,
    };
  } catch (err) {
    console.error('[extractor] Scrape failed:', err);
    return null;
  }
};

const EXTRACTORS: Extractor[] = [
  finalUrlScraper,
  passthrough,
];

export async function extract(raw: string): Promise<ExtractResult | null> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  for (const fn of EXTRACTORS) {
    const result = await fn(u, raw);
    if (result) return result;
  }
  return null;
}
