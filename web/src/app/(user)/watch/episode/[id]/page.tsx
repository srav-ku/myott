'use client';
import { Suspense, useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Player } from '@/components/Player';
import { ReportButton } from '@/components/ReportButton';
import { ChevronLeft, Loader2, AlertCircle } from 'lucide-react';

type LinkRow = {
  id: number;
  quality: string;
  type: 'direct' | 'extract';
  languages: string[] | null;
};
type StreamRes = {
  url: string;
  type: 'direct' | 'extract';
  fallback: boolean;
  expires_at?: number;
};
type EpisodeMeta = {
  id: number;
  tv_tmdb_id: number | null;
  tv_title: string;
  tv_backdrop_url: string | null;
  season_number: number;
  episode_number: number;
  title: string | null;
  still_path: string | null;
};

function Inner({ id }: { id: number }) {
  const sp = useSearchParams();
  const initialLink = Number(sp.get('link') || 0);
  const [meta, setMeta] = useState<EpisodeMeta | null>(null);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [activeLink, setActiveLink] = useState<number | null>(null);
  const [stream, setStream] = useState<StreamRes | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const [m, r] = await Promise.all([
        api<EpisodeMeta>(`/api/episodes/${id}`),
        api<{ links: LinkRow[] }>(`/api/links?episode_id=${id}`),
      ]);
      if (!active) return;
      if (m.ok) setMeta(m.data);
      if (r.ok) {
        setLinks(r.data.links);
        const order = ['1080p', '720p', '480p', '2160p', '360p'];
        const requested = r.data.links.find((l) => l.id === initialLink);
        const fallback =
          order.map((q) => r.data.links.find((l) => l.quality === q)).find(Boolean) ??
          r.data.links[0];
        setActiveLink((requested ?? fallback)?.id ?? null);
      }
    })();
    return () => {
      active = false;
    };
  }, [id, initialLink]);

  useEffect(() => {
    if (!activeLink) return;
    let active = true;
    setStream(null);
    setErr(null);
    (async () => {
      const r = await api<StreamRes>(`/api/stream/${activeLink}`);
      if (!active) return;
      if (r.ok) {
        setStream(r.data);
      } else {
        setErr(r.error);
      }
    })();
    return () => {
      active = false;
    };
  }, [activeLink, id]);

  return (
    <div className="px-4 sm:px-6 space-y-4 max-w-5xl mx-auto">
      <Link
        href={meta ? `/tv/${meta.tv_tmdb_id}` : '/'}
        className="inline-flex items-center gap-1 text-sm text-[var(--color-text-dim)] hover:text-white"
      >
        <ChevronLeft size={16} /> {meta ? `Back to ${meta.tv_title}` : 'Back'}
      </Link>
      {meta ? (
        <div>
          <div className="text-sm text-[var(--color-text-dim)]">
            {meta.tv_title} · S{meta.season_number} · E{meta.episode_number}
          </div>
          <h1 className="text-2xl font-semibold">{meta.title}</h1>
        </div>
      ) : (
        <h1 className="text-2xl font-semibold">Episode #{id}</h1>
      )}
      {err ? (
        <div className="rounded-lg border border-[var(--color-brand)]/40 bg-[var(--color-brand)]/10 p-4 flex gap-3">
          <AlertCircle className="text-[var(--color-brand)] flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm">{err}</div>
        </div>
      ) : !stream ? (
        <div className="aspect-video grid place-items-center bg-black rounded-lg">
          <Loader2 className="animate-spin" />
        </div>
      ) : stream.fallback ? (
        <div className="rounded-lg border border-yellow-700/40 bg-yellow-900/20 p-4 text-sm">
          <strong>Embed link:</strong>{' '}
          <a
            href={stream.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-brand)] underline break-all"
          >
            {stream.url}
          </a>
        </div>
      ) : (
        <Player src={stream.url} poster={meta?.tv_backdrop_url ?? null} />
      )}
      {links.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-[var(--color-text-dim)] self-center">
            Quality:
          </span>
          {links.map((l) => (
            <button
              key={l.id}
              onClick={() => setActiveLink(l.id)}
              className={`text-xs px-2.5 py-1 rounded border ${
                l.id === activeLink
                  ? 'border-[var(--color-brand)] text-[var(--color-brand)]'
                  : 'border-[var(--color-border)] hover:border-white'
              }`}
            >
              {l.quality}
            </button>
          ))}
        </div>
      )}
      <div className="pt-2">
        <ReportButton contentType="episode" contentId={id} />
      </div>
    </div>
  );
}

export default function EpisodeWatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <Suspense fallback={<div className="px-6">Loading…</div>}>
      <Inner id={Number(id)} />
    </Suspense>
  );
}
