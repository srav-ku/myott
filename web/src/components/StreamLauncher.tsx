'use client';
import { useRouter } from 'next/navigation';
import { Play } from 'lucide-react';
import { api } from '@/lib/api';
import { useAds } from './AdProvider';
import { RewardAdModal } from './RewardAdModal';
import { useState } from 'react';

type Link = {
  id: number;
  quality: string;
  type: 'direct' | 'extract';
  languages: string[] | null;
};

type Props = {
  links: Link[];
  watchHrefBase: string; // e.g. '/watch/movie/27205' or '/watch/episode/123'
  contentId: number;     // internal db id
  contentType: 'movie' | 'episode';
};

const QUALITY_ORDER = ['1080p', '720p'];

export function StreamLauncher({ links, watchHrefBase, contentId, contentType }: Props) {
  const router = useRouter();
  const { hasActiveAd } = useAds();
  const [pendingWatch, setPendingWatch] = useState<number | null>(null);

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

  function proceedToWatch(linkId: number) {
    // Record history (fire and forget, don't block UI)
    const body = contentType === 'movie' 
      ? { movie_id: contentId, link_id: linkId }
      : { episode_id: contentId, link_id: linkId };
    
    void api('/api/user/history', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    router.push(`${watchHrefBase}?link=${linkId}`);
  }

  async function handleWatch(linkId: number) {
    const link = links.find(l => l.id === linkId);
    const isHighQuality = link?.quality === '1080p';

    // If 1080p AND rewarded ads are active, show modal
    if (isHighQuality && hasActiveAd('player_overlay', 'rewarded')) {
      setPendingWatch(linkId);
      return;
    }

    proceedToWatch(linkId);
  }

  return (
    <div className="space-y-2">
      {pendingWatch !== null && (
        <RewardAdModal 
          onComplete={() => {
            const id = pendingWatch;
            setPendingWatch(null);
            proceedToWatch(id);
          }}
          onClose={() => setPendingWatch(null)}
        />
      )}
      <button
        onClick={() => handleWatch(best.id)}
        className="inline-flex items-center gap-2 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white font-medium rounded-md px-5 py-2.5"
      >
        <Play size={18} fill="white" /> Play {best.quality}
      </button>
      {sorted.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-[var(--color-text-dim)] self-center">
            Other qualities:
          </span>
          {sorted.slice(1).map((l) => (
            <button
              key={l.id}
              onClick={() => handleWatch(l.id)}
              className="text-xs px-2.5 py-1 rounded border border-[var(--color-border)] hover:border-white"
            >
              {l.quality}
              {l.languages && l.languages.length > 0 && (
                <span className="text-[var(--color-text-dim)]">
                  {' '}
                  · {l.languages.join('/')}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
