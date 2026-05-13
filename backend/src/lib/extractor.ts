export interface ExtractResult {
  stream_url: string;
  expires_at?: number;
  type?: 'hls' | 'mp4' | 'webm' | 'mkv' | 'embed';
}

export async function callExtractor(url: string, extractorUrl: string, apiKey?: string): Promise<ExtractResult | null> {
  try {
    const res = await fetch(`${extractorUrl}/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'x-api-key': apiKey } : {}),
      },
      body: JSON.stringify({ url }),
    });

    if (!res.ok) return null;

    const data = await res.json() as any;
    if (!data?.stream_url) return null;

    return {
      stream_url: data.stream_url,
      expires_at: data.expires_at,
      type: data.type,
    };
  } catch (error) {
    console.error('Extractor call failed:', error);
    return null;
  }
}
