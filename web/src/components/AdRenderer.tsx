'use client';
import { useAds } from './AdProvider';

export default function AdRenderer({ position }: { position: string }) {
  const { ads, loading } = useAds();
  
  if (loading) return null;
  
  const positionAds = ads[position];
  if (!positionAds || positionAds.length === 0) return null;

  // Pick the highest priority ad (already sorted by API)
  const ad = positionAds[0];

  if (ad.provider === 'custom') {
    return (
      <div className="w-full my-6">
        <a 
          href={ad.redirectUrl || '#'} 
          target="_blank" 
          rel="noopener noreferrer"
          className="block relative group overflow-hidden rounded-2xl border border-[var(--color-border)] hover:border-[var(--color-brand)] transition-all shadow-lg"
        >
          {ad.imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img 
              src={ad.imageUrl} 
              alt="Advertisement" 
              className="w-full h-auto object-cover max-h-[300px]"
            />
          ) : (
            <div className="w-full h-32 bg-[var(--color-surface)] flex items-center justify-center">
              <span className="text-[var(--color-text-dim)] text-[10px] uppercase font-bold tracking-[0.2em]">Advertisement</span>
            </div>
          )}
          <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md text-[9px] font-bold uppercase px-2 py-0.5 rounded-full text-white/80 border border-white/10">
            Sponsored
          </div>
        </a>
      </div>
    );
  }

  // Placeholder for SDK-based ads (AdMob, AppLovin, etc.)
  return (
    <div className="w-full h-24 my-6 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl flex items-center justify-center relative overflow-hidden group hover:border-[var(--color-brand)] transition-all">
       <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-brand)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
       <span className="text-[var(--color-text-dim)] text-[10px] uppercase font-bold tracking-[0.2em] relative z-10">
         {ad.provider} {ad.type} Ad
       </span>
       <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md text-[9px] font-bold uppercase px-2 py-0.5 rounded-full text-white/80 border border-white/10">
         Sponsored
       </div>
    </div>
  );
}
