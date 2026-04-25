import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: 'JJT PisoTab — Smart Coin-Operated Phone Rental System',
  description: 'Turn any Android tablet into a self-service rental kiosk. Coin-operated, web-managed, offline-ready.',
  icons: { icon: '/jjt-logo.png', apple: '/jjt-logo.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
