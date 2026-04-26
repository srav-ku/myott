'use client';
import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { X } from 'lucide-react';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthModal({ onClose }: { onClose: () => void }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const e2 = email.trim().toLowerCase();
    if (!EMAIL_RE.test(e2)) {
      setErr('Enter a valid email');
      return;
    }
    setLoading(true);
    await signIn({ email: e2, name: name.trim() || e2.split('@')[0] });
    setLoading(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-semibold">Sign in</h2>
          <button
            onClick={onClose}
            className="text-[var(--color-text-dim)] hover:text-white"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <p className="text-sm text-[var(--color-text-dim)] mb-4">
          Quick sign-in for testing. Enter any email — used as your identity for
          watchlist, history, and (if your email is in the admin allowlist) admin
          access.
        </p>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs uppercase tracking-wider text-[var(--color-text-dim)]">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus
              className="mt-1 w-full rounded-md bg-[var(--color-bg)] border border-[var(--color-border)] px-3 py-2 outline-none focus:border-[var(--color-brand)]"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-[var(--color-text-dim)]">
              Display name (optional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="mt-1 w-full rounded-md bg-[var(--color-bg)] border border-[var(--color-border)] px-3 py-2 outline-none focus:border-[var(--color-brand)]"
            />
          </div>
          {err && <div className="text-sm text-[var(--color-brand)]">{err}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] disabled:opacity-60 px-4 py-2 font-medium"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
