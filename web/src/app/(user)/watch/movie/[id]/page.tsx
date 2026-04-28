'use client';
import { Suspense, useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Player } from '@/components/Player';
import { ReportButton } from '@/components/ReportButton';
import { ChevronLeft, Loader2, AlertCircle } from 'lucide-react';

type Movie = {
  id: number;
  tmdb_id: number;
  title: string;
  backdrop_url: string | null;
};
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

function Inner({ id }: { id: number }) {
  const sp = useSearchParams();
  const initialLinkId = Number(sp.get('link') || 0);
  const [movie, setMovie] = useState<Movie | null>(null);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [activeLink, setActiveLink] = useState<number | null>(null);
  const [stream, setStream] = useState<StreamRes | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // load movie + links
  useEffect(() => {
    let active = true;
    (async () => {
      const [mRes, linksRes] = await Promise.all([
        api<Movie>(`/api/movies/by-id/${id}`),
        api<{ links: LinkRow[] }>(`/api/links?movie_id=${id}`),
      ]);
      if (!active) return;
      if (mRes.ok) setMovie(mRes.data);
      if (linksRes.ok) {
        setLinks(linksRes.data.links);
        setActiveLink(pickQuality(linksRes.data.links, initialLinkId));
      } else {
        setErr(linksRes.error);
      }
    })();
    return () => {
      active = false;
    };
  }, [id, initialLinkId]);

  // load stream when active link changes
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
        href={`/movies/${movie?.tmdb_id ?? ''}`}
        className="inline-flex items-center gap-1 text-sm text-[var(--color-text-dim)] hover:text-white"
      >
        <ChevronLeft size={16} /> Back
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">{movie?.title ?? `Movie #${id}`}</h1>
      </div>
      {err && stream === null ? (
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
          <strong>Embed link:</strong> this stream needs an external page to play. Open
          it in a new tab:
          <br />
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
        <Player src={stream.url} poster={movie?.backdrop_url ?? null} />
      )}
      <QualityRow links={links} activeLink={activeLink} onPick={setActiveLink} />
      <div className="flex gap-2 pt-2">
        <ReportButton contentType="movie" contentId={id} />
      </div>
    </div>
  );
}

function pickQuality(links: LinkRow[], requested: number): number | null {
  if (links.length === 0) return null;
  if (requested && links.find((l) => l.id === requested)) return requested;
  const order = ['1080p', '720p', '480p', '2160p', '360p'];
  for (const q of order) {
    const f = links.find((l) => l.quality === q);
    if (f) return f.id;
  }
  return links[0].id;
}

function QualityRow({
  links,
  activeLink,
  onPick,
}: {
  links: LinkRow[];
  activeLink: number | null;
  onPick: (id: number) => void;
}) {
  if (links.length <= 1) return null;
  return (
    <div className="flex flex-wrap gap-2">
      <span className="text-xs text-[var(--color-text-dim)] self-center">Quality:</span>
      {links.map((l) => (
        <button
          key={l.id}
          onClick={() => onPick(l.id)}
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
  );
}

export default function MovieWatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const idNum = Number(id);
  return (
    <Suspense fallback={<div className="px-6">Loading…</div>}>
      <Inner id={idNum} />
    </Suspense>
  );
}
