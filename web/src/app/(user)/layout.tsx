import type { ReactNode } from 'react';
import { Header } from '@/components/Header';

export default function UserLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto py-6 sm:py-8 min-h-[calc(100vh-4rem)]">
        {children}
      </main>
      <footer className="border-t border-[var(--color-border)] py-6 mt-12">
        <div className="max-w-7xl mx-auto px-6 text-center text-xs text-[var(--color-text-dim)]">
          STREAMR · Powered by TMDB · For development & testing
        </div>
      </footer>
    </>
  );
}
