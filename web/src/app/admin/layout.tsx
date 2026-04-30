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
  Loader2
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
      <div className="min-h-screen grid place-items-center bg-[var(--color-bg)] text-white">
        <Loader2 className="animate-spin text-[var(--color-brand)]" size={40} />
      </div>
    );
  }

  const sidebarItems = [
    { label: 'Content', href: '/admin', icon: Film },
    { label: 'Reports', href: '/admin/reports', icon: Flag },
    { label: 'Requests', href: '/admin/requests', icon: MessageSquare },
    { label: 'Updates', href: '/admin/updates', icon: Megaphone },
    { label: 'Ads', href: '/admin/ads', icon: LayoutDashboard },
  ];

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)] text-white">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[var(--color-border)] flex flex-col fixed inset-y-0 z-50 bg-[var(--color-surface)]">
        <div className="h-16 flex items-center px-6 border-b border-[var(--color-border)] gap-2">
          <ShieldCheck className="text-[var(--color-brand)]" size={24} />
          <span className="font-bold text-lg tracking-tight">Admin Portal</span>
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-1">
          {sidebarItems.map((item) => {
            const itemPath = item.href.split('?')[0];
            const itemTab = item.href.split('tab=')[1];
            
            let active = false;
            if (item.label === 'Content') {
              active = pathname === '/admin' || pathname === '/admin/manage' || pathname.startsWith('/admin/manage/');
            } else {
              active = pathname.startsWith(item.href);
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[var(--color-brand)] text-white'
                    : 'text-[var(--color-text-dim)] hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[var(--color-border)]">
          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 pl-64 flex flex-col">
        <header className="h-16 border-b border-[var(--color-border)] flex items-center justify-between px-8 bg-[var(--color-surface)]/50 backdrop-blur sticky top-0 z-40">
          <div className="text-sm font-medium text-[var(--color-text-dim)]">
            Welcome back, <span className="text-white">{user.displayName || user.email}</span>
          </div>
          <Link href="/" className="text-xs text-[var(--color-text-dim)] hover:text-white transition-colors">
            Exit to Site →
          </Link>
        </header>
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
