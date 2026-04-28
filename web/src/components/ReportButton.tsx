'use client';
import { useState } from 'react';
import { Flag, X, Check, Loader2 } from 'lucide-react';
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
  const [issue, setIssue] = useState<typeof ISSUES[number]['value']>(
    'broken_1080p',
  );
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submittedIssues, setSubmittedIssues] = useState<Set<string>>(new Set());

  async function submit() {
    if (submittedIssues.has(issue)) {
      setDone(true);
      setTimeout(() => {
        setOpen(false);
        setDone(false);
      }, 1500);
      return;
    }

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
    if (r.ok || r.status === 409) {
      setDone(true);
      setSubmittedIssues((prev) => new Set(prev).add(issue));
      setTimeout(() => {
        setOpen(false);
        setDone(false);
        setMsg('');
      }, 2000);
    } else {
      alert(r.error || 'Failed to submit report');
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] hover:border-white px-4 py-2 text-sm transition-colors"
      >
        <Flag size={16} /> Report
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Report a problem</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-[var(--color-text-dim)] hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {done ? (
              <div className="py-8 text-center animate-in fade-in zoom-in duration-300">
                <Check size={48} className="mx-auto text-green-500 mb-3" />
                <div className="text-lg font-medium">Thank you</div>
                <div className="text-sm text-[var(--color-text-dim)] mt-1">
                  We&apos;ve received your report and will look into it.
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-[var(--color-text-dim)] tracking-wider">
                    What is the issue?
                  </label>
                  <select
                    value={issue}
                    onChange={(e) =>
                      setIssue(
                        e.target.value as (typeof ISSUES)[number]['value'],
                      )
                    }
                    className="mt-1.5 w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 outline-none focus:border-[var(--color-brand)] transition-colors"
                  >
                    {ISSUES.map((i) => (
                      <option key={i.value} value={i.value}>
                        {i.label} {submittedIssues.has(i.value) ? '(Submitted)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-[var(--color-text-dim)] tracking-wider">
                    Additional details
                  </label>
                  <textarea
                    value={msg}
                    onChange={(e) => setMsg(e.target.value)}
                    rows={3}
                    placeholder="Describe the problem..."
                    className="mt-1.5 w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 outline-none focus:border-[var(--color-brand)] transition-colors resize-none"
                  />
                </div>

                <button
                  onClick={submit}
                  disabled={busy || submittedIssues.has(issue)}
                  className="w-full bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] disabled:bg-green-600 disabled:opacity-80 rounded-lg px-4 py-3 font-bold text-white transition-all flex items-center justify-center gap-2"
                >
                  {busy ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Sending...
                    </>
                  ) : submittedIssues.has(issue) ? (
                    <>
                      <Check size={18} />
                      Report Received
                    </>
                  ) : (
                    'Submit Report'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
