import type { ReactNode } from 'react';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import { AdProvider } from '@/components/AdProvider';

export const metadata = {
  title: 'STREAMR — Movies & TV',
  description: 'OTT streaming platform',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AdProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </AdProvider>
      </body>
    </html>
  );
}
