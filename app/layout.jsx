import './globals.css';
import { Toaster } from '@/components/ui/Toaster';
import AuthProvider from '@/components/layout/AuthProvider';

export const metadata = {
  title: 'Ludo Arena — Premium Multiplayer Ludo',
  description: 'Play real-time multiplayer Ludo with up to 4 players. Earn virtual coins, climb the leaderboard.',
  keywords: 'ludo, multiplayer, online game, board game, ludo arena',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Rajdhani:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
