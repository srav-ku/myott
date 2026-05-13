'use client';
import { ReactNode, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Film, 
  Tv, 
  Flag, 
  MessageSquare, 
  Megaphone, 
  LogOut,
  ShieldCheck,
  Loader2,
  Search
} from 'lucide-react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push('/');
    }
  }, [user, isAdmin, loading, router]);

  if (loading || !user || !isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center bg-bg text-white">
        <Loader2 className="animate-spin text-brand" size={40} />
      </div>
    );
  }

  const navItems = [
    { label: 'Library', href: '/admin?source=local', icon: Film },
    { label: 'Discovery', href: '/admin?source=tmdb', icon: Search },
  ];

  return (
    <div className="min-h-screen bg-bg text-white">
      {/* Top Navigation */}
      <header className="h-16 border-b border-border flex items-center justify-between px-8 bg-surface/50 backdrop-blur sticky top-0 z-50">
        {/* Left: Title */}
        <div className="flex items-center gap-2 w-48">
          <span className="font-bold text-lg tracking-tight">MyOTT Page</span>
        </div>

        {/* Center: Navigation */}
        <nav className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
          {navItems.map((item) => {
            let active = false;
            if (item.label === 'Library') {
              active = (pathname === '/admin' || pathname === '/admin/manage' || pathname.startsWith('/admin/manage/')) && searchParams.get('source') !== 'tmdb';
            } else if (item.label === 'Discovery') {
              active = pathname === '/admin' && searchParams.get('source') === 'tmdb';
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-2 px-6 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-brand text-white shadow-lg shadow-brand/20'
                    : 'text-text-dim hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center justify-end w-48">
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-16 md:py-24 space-y-24">
        {children}
      </main>
    </div>
  );
}
