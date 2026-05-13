export async function tmdbFetch<T>(path: string, apiKey: string, params: Record<string, any> = {}): Promise<T> {
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  url.searchParams.set('api_key', apiKey);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const res = await fetch(url.toString(), {
    cf: { cacheTtl: 3600, cacheEverything: true }
  } as any);

  if (!res.ok) {
    throw new Error(`TMDB error: ${res.status}`);
  }

  return await res.json() as T;
}

export function tmdbImg(path: string | null, size: string = 'original'): string | null {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}
