import type {Metadata} from 'next';
import { Inter } from 'next/font/google'; // Using Inter for better multi-language support as a base
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AppHeader } from '@/components/layout/app-header';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'PolyVoice',
  description: 'Real-time voice translation between Kannada, Hindi, and English.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <div className="flex flex-col items-center min-h-screen p-4">
          <AppHeader />
          <main className="flex-grow w-full max-w-3xl mt-8">
            {children}
          </main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
