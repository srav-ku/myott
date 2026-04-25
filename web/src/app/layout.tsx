import type { ReactNode } from 'react';

export const metadata = {
  title: 'OTT Backend',
  description: 'OTT streaming platform backend',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          margin: 0,
          background: '#0b0b10',
          color: '#e8e8ee',
        }}
      >
        {children}
      </body>
    </html>
  );
}
