import './styles/globals.css';
import SiteHeader from '../components/SiteHeader';

export const metadata = {
  title: 'VRBOT - Viking Rise Bot',
  description: 'Smart automation bot for Viking Rise',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
