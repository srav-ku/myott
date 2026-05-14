import type { ReactNode } from 'react';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import { AdProvider } from '@/components/AdProvider';

export const metadata = {
  title: 'MyOTT Admin',
  description: 'OTT streaming platform management',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
