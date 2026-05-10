'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { AuthModal } from './AuthModal';
import { Search, User, LogOut, Bookmark, History, Shield, Film, Settings, Copy, Link as LinkIcon } from 'lucide-react';
import { StealthToggle } from './StealthToggle';

export function Header() {
  const { user, isAdmin, signOut, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showCopyLink, setShowCopyLink] = useState(false);
  const [q, setQ] = useState('');
  const router = useRouter();
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const val = localStorage.getItem('showCopyLink') === 'true';
    setShowCopyLink(val);
  }, []);

  const toggleCopyLink = () => {
    const newVal = !showCopyLink;
    setShowCopyLink(newVal);
    localStorage.setItem('showCopyLink', String(newVal));
    window.dispatchEvent(new Event('storage'));
  };

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [menuOpen]);

  useEffect(() => {
    if (pathname === '/search') {
      const sp = new URLSearchParams(window.location.search);
      const urlQ = sp.get('q') || '';
      if (urlQ !== q) setQ(urlQ);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!q.trim()) return;
      const sp = new URLSearchParams(window.location.search);
      if (sp.get('q') === q.trim()) return;

      if (pathname === '/search') {
        router.replace(`/search?q=${encodeURIComponent(q.trim())}`);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [q, pathname, router]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  const userInitial = user ? (user.displayName || user.email || '?')[0] : '?';

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
              className={pathname.includes('movies') ? 'text-white' : 'hover:text-white'}
            >
              Movies
            </Link>
            <Link 
              href="/?tab=tv" 
              className={pathname.includes('tv') ? 'text-white' : 'hover:text-white'}
            >
              TV Shows
            </Link>
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
          {loading ? (
             <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] animate-pulse" />
          ) : user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-full bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)] border border-[var(--color-border)] pl-2 pr-3 py-1.5"
              >
                <div className="grid place-items-center w-7 h-7 rounded-full bg-[var(--color-brand)] text-white text-xs font-semibold uppercase">
                  {userInitial}
                </div>
                <span className="hidden sm:inline text-sm">
                  {user.displayName || user.email}
                </span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl py-1 text-sm">
                  <div className="px-3 py-2 border-b border-[var(--color-border)]">
                    <div className="font-medium truncate">{user.displayName || 'Signed in'}</div>
                    <div className="text-xs text-[var(--color-text-dim)] truncate">
                      {user.email}
                    </div>
                  </div>
                  <Link
                    href="/collections"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--color-surface-2)]"
                  >
                    <Bookmark size={14} /> My Collections
                  </Link>
                  <Link
                    href="/history"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--color-surface-2)]"
                  >
                    <History size={14} /> Watch History
                  </Link>

                  <button
                    onClick={toggleCopyLink}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--color-surface-2)] text-left"
                  >
                    <LinkIcon size={14} /> 
                    <span className="flex-1">Show Copy Links</span>
                    <div className={`w-8 h-4 rounded-full relative transition-colors ${showCopyLink ? 'bg-[var(--color-brand)]/50' : 'bg-white/10'}`}>
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${showCopyLink ? 'right-0.5' : 'left-0.5'}`} />
                    </div>
                  </button>

                  <div className="border-t border-[var(--color-border)] my-1" />
                  <StealthToggle />
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
