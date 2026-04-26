import type { ReactNode } from 'react';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import { Header } from '@/components/Header';

export const metadata = {
  title: 'STREAMR — Movies & TV',
  description: 'OTT streaming platform',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Header />
          <main className="max-w-7xl mx-auto py-6 sm:py-8 min-h-[calc(100vh-4rem)]">
            {children}
          </main>
          <footer className="border-t border-[var(--color-border)] py-6 mt-12">
            <div className="max-w-7xl mx-auto px-6 text-center text-xs text-[var(--color-text-dim)]">
              STREAMR · Powered by TMDB · For development & testing
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
