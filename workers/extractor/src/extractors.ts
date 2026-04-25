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

// Example skeleton — fill in real logic per host:
//
// const vidsrc: Extractor = async (u) => {
//   if (!u.hostname.endsWith('vidsrc.to')) return null;
//   const html = await fetch(u.toString()).then((r) => r.text());
//   const m = html.match(/file:\s*"([^"]+\.m3u8[^"]*)"/);
//   if (!m) return null;
//   return { stream_url: m[1], type: 'hls' };
// };

const EXTRACTORS: Extractor[] = [
  passthrough,
  // vidsrc,
  // streamtape,
  // ...
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
