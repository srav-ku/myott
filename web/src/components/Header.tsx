'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { AuthModal } from './AuthModal';
import { Search, User, LogOut, Bookmark, History, Shield, Film } from 'lucide-react';

export function Header() {
  const { user, isAdmin, signOut } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [q, setQ] = useState('');
  const router = useRouter();
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [menuOpen]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-[rgba(10,10,15,0.92)] backdrop-blur border-b border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto flex items-center gap-4 px-4 sm:px-6 h-16">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <Film className="text-[var(--color-brand)]" size={24} />
            <span>STREAMR</span>
          </Link>
          <nav className="hidden md:flex items-center gap-5 text-sm text-[var(--color-text-dim)]">
            <Link
              href="/"
              className={pathname === '/' ? 'text-white' : 'hover:text-white'}
            >
              Home
            </Link>
            <Link
              href="/?tab=movies"
              className="hover:text-white"
            >
              Movies
            </Link>
            <Link href="/?tab=tv" className="hover:text-white">
              TV Shows
            </Link>
            {user && (
              <>
                <Link
                  href="/watchlist"
                  className={pathname === '/watchlist' ? 'text-white' : 'hover:text-white'}
                >
                  Watchlist
                </Link>
                <Link
                  href="/history"
                  className={pathname === '/history' ? 'text-white' : 'hover:text-white'}
                >
                  History
                </Link>
              </>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                className={
                  pathname.startsWith('/admin')
                    ? 'text-[var(--color-brand)]'
                    : 'text-[var(--color-brand)] hover:opacity-80'
                }
              >
                Admin
              </Link>
            )}
          </nav>
          <form onSubmit={submitSearch} className="ml-auto flex-1 max-w-sm">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)]"
              />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search movies & shows…"
                className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md pl-9 pr-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
              />
            </div>
          </form>
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-full bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)] border border-[var(--color-border)] pl-2 pr-3 py-1.5"
              >
                <div className="grid place-items-center w-7 h-7 rounded-full bg-[var(--color-brand)] text-white text-xs font-semibold uppercase">
                  {(user.name || user.email)[0]}
                </div>
                <span className="hidden sm:inline text-sm">
                  {user.name || user.email}
                </span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl py-1 text-sm">
                  <div className="px-3 py-2 border-b border-[var(--color-border)]">
                    <div className="font-medium truncate">{user.name || 'Signed in'}</div>
                    <div className="text-xs text-[var(--color-text-dim)] truncate">
                      {user.email}
                    </div>
                    {isAdmin && (
                      <div className="mt-1 inline-block text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-brand)]/15 text-[var(--color-brand)] font-medium">
                        ADMIN
                      </div>
                    )}
                  </div>
                  <Link
                    href="/watchlist"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--color-surface-2)]"
                  >
                    <Bookmark size={14} /> Watchlist
                  </Link>
                  <Link
                    href="/history"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--color-surface-2)]"
                  >
                    <History size={14} /> History
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--color-surface-2)]"
                    >
                      <Shield size={14} /> Admin Panel
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      signOut();
                      setMenuOpen(false);
                    }}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-[var(--color-surface-2)] border-t border-[var(--color-border)]"
                  >
                    <LogOut size={14} /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="flex items-center gap-1.5 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] rounded-md px-3 py-1.5 text-sm font-medium"
            >
              <User size={14} /> Sign in
            </button>
          )}
        </div>
      </header>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}
