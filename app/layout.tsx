import './styles/globals.css';
import SiteHeader from '../components/SiteHeader';
import Providers from '../components/Providers';

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
    <html lang='ar' dir='rtl'>
      <body>
        <Providers>
          <SiteHeader />
          {children}
        </Providers>
      </body>
    </html>
  );
}
