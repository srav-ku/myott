'use client';
import { useState } from 'react';
import { Send, Check, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

type Props = {
  tmdbId: number;
  contentType: 'movie' | 'tv';
  title: string;
};

export function MissingLinksRequest({ tmdbId, contentType, title }: Props) {
  const [status, setStatus] = useState<'idle' | 'busy' | 'done'>('idle');

  async function handleRequest() {
    setStatus('busy');
    const r = await api('/api/content-requests', {
      method: 'POST',
      body: JSON.stringify({
        tmdbId,
        contentType,
        title,
        reason: 'missing_links',
      }),
    });
    if (r.ok) {
      setStatus('done');
    } else {
      setStatus('idle');
      alert(r.error || 'Failed to submit request');
    }
  }

  return (
    <button
      onClick={handleRequest}
      disabled={status !== 'idle'}
      className="flex items-center gap-2 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] disabled:bg-green-600 disabled:opacity-90 transition-all rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm"
    >
      {status === 'busy' ? (
        <>
          <Loader2 size={16} className="animate-spin" />
          Sending...
        </>
      ) : status === 'done' ? (
        <>
          <Check size={16} />
          Requested
        </>
      ) : (
        <>
          <Send size={16} />
          Request Link
        </>
      )}
    </button>
  );
}
