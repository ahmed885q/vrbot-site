import './styles/globals.css';
import SiteHeader from '../components/SiteHeader';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'VRBOT - Viking Rise Bot',
  description: 'Smart automation bot for Viking Rise. Manage farms, gather resources, upgrade buildings, and attack enemies — all automated 24/7 with advanced AI.',
  metadataBase: new URL('https://www.vrbot.me'),
  icons: {
    icon: '/icon.svg',
  },
  openGraph: {
    title: 'VRBOT - Viking Rise Bot',
    description: 'Smart automation bot for Viking Rise. Manage farms, gather resources, upgrade buildings — all automated 24/7 with AI.',
    url: 'https://www.vrbot.me',
    siteName: 'VRBOT',
    locale: 'ar_SA',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VRBOT - Viking Rise Bot',
    description: 'Smart automation bot for Viking Rise. Manage farms, gather resources, upgrade buildings — all automated 24/7 with AI.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            var t = localStorage.getItem('vrbot_theme');
            if (t) document.documentElement.setAttribute('data-theme', t);
          })();
        `}} />
      </head>
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
