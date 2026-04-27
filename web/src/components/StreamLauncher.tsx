'use client';
import Link from 'next/link';
import { Play } from 'lucide-react';

type Link = {
  id: number;
  quality: string;
  type: 'direct' | 'extract';
  languages: string[] | null;
};

type Props = {
  links: Link[];
  watchHrefBase: string; // e.g. '/watch/movie/27205' or '/watch/episode/123'
};

const QUALITY_ORDER = ['1080p', '720p'];

export function StreamLauncher({ links, watchHrefBase }: Props) {
  if (links.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text-dim)]">
        No streams available yet. An admin needs to add a link.
      </div>
    );
  }
  const sorted = [...links].sort(
    (a, b) => QUALITY_ORDER.indexOf(a.quality) - QUALITY_ORDER.indexOf(b.quality),
  );
  const best = sorted[0];

  return (
    <div className="space-y-2">
      <Link
        href={`${watchHrefBase}?link=${best.id}`}
        className="inline-flex items-center gap-2 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white font-medium rounded-md px-5 py-2.5"
      >
        <Play size={18} fill="white" /> Play {best.quality}
      </Link>
      {sorted.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-[var(--color-text-dim)] self-center">
            Other qualities:
          </span>
          {sorted.slice(1).map((l) => (
            <Link
              key={l.id}
              href={`${watchHrefBase}?link=${l.id}`}
              className="text-xs px-2.5 py-1 rounded border border-[var(--color-border)] hover:border-white"
            >
              {l.quality}
              {l.languages && l.languages.length > 0 && (
                <span className="text-[var(--color-text-dim)]">
                  {' '}
                  · {l.languages.join('/')}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
