'use client';
import { useState } from 'react';
import { Flag, X, Check } from 'lucide-react';
import { api } from '@/lib/api';

type Props = {
  contentType: 'movie' | 'episode';
  contentId: number;
};

const ISSUES = [
  { value: 'broken_1080p', label: '1080p stream broken' },
  { value: 'broken_720p', label: '720p stream broken' },
  { value: 'no_link', label: 'No link available' },
  { value: 'wrong_data', label: 'Wrong content / metadata' },
  { value: 'other', label: 'Other' },
] as const;

export function ReportButton({ contentType, contentId }: Props) {
  const [open, setOpen] = useState(false);
  const [issue, setIssue] = useState<typeof ISSUES[number]['value']>('broken_1080p');
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const r = await api('/api/reports', {
      method: 'POST',
      body: JSON.stringify({
        content_type: contentType,
        content_id: contentId,
        issue_type: issue,
        message: msg || undefined,
      }),
    });
    setBusy(false);
    if (r.ok) {
      setDone(true);
      setTimeout(() => {
        setOpen(false);
        setDone(false);
        setMsg('');
      }, 1400);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border border-[var(--color-border)] hover:border-white px-4 py-2 text-sm"
      >
        <Flag size={16} /> Report
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Report a problem</h2>
              <button onClick={() => setOpen(false)} className="text-[var(--color-text-dim)]">
                <X size={20} />
              </button>
            </div>
            {done ? (
              <div className="py-8 text-center">
                <Check size={40} className="mx-auto text-green-500 mb-2" />
                <div>Thanks — we&apos;ll take a look.</div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs uppercase text-[var(--color-text-dim)]">Issue</label>
                  <select
                    value={issue}
                    onChange={(e) =>
                      setIssue(e.target.value as typeof ISSUES[number]['value'])
                    }
                    className="mt-1 w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-2 outline-none focus:border-[var(--color-brand)]"
                  >
                    {ISSUES.map((i) => (
                      <option key={i.value} value={i.value}>
                        {i.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase text-[var(--color-text-dim)]">
                    Details (optional)
                  </label>
                  <textarea
                    value={msg}
                    onChange={(e) => setMsg(e.target.value)}
                    rows={3}
                    className="mt-1 w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-2 outline-none focus:border-[var(--color-brand)]"
                  />
                </div>
                <button
                  onClick={submit}
                  disabled={busy}
                  className="w-full bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] rounded px-4 py-2 font-medium disabled:opacity-60"
                >
                  {busy ? 'Sending…' : 'Submit Report'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
