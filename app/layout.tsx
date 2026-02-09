import './styles/globals.css';

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
      <body>{children}</body>
    </html>
  );
}
