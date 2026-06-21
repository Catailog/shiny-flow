import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import 'flag-icons/css/flag-icons.min.css';

import { AuthSessionProvider } from '@/components/AuthSessionProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'shiny-flow',
  description: 'Visualize your Next.js App Router project as an interactive page-flow graph.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          <AuthSessionProvider>
            <TooltipProvider>{children}</TooltipProvider>
            <Toaster />
          </AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
