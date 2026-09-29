import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Repertório Católico | Ministério de Adoração e Louvor',
  description: 'Sistema de gestão e curadoria de repertório musical para missas, vigílias e momentos de adoração católica.',
  keywords: ['música católica', 'repertório', 'adoração', 'missa', 'louvor', 'liturgia'],
  authors: [{ name: 'Ministério de Música' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1e3a8a',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
