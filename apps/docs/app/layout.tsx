import './global.css';
import { ThemeProvider } from '@/providers/theme';
import { GoogleAnalytics } from '@next/third-parties/google';
import { Toaster } from '@repo/shadcn-ui/components/ui/sonner';
import { TooltipProvider } from '@repo/shadcn-ui/components/ui/tooltip';
import { cn } from '@repo/shadcn-ui/lib/utils';
import { Analytics as VercelAnalytics } from '@vercel/analytics/react';
import { RootProvider } from 'fumadocs-ui/provider';
import type { ReactNode } from 'react';
import { Navbar } from '../components/navbar';
import { env } from '../env';
import { fonts } from './lib/fonts';

type LayoutProps = {
  readonly children: ReactNode;
};

const Layout = ({ children }: LayoutProps) => (
  <html lang="en" suppressHydrationWarning>
    <body className={cn('flex min-h-screen flex-col', fonts)}>
      <ThemeProvider>
        <RootProvider>
          <TooltipProvider>
            <Navbar />
            {children}
          </TooltipProvider>
          <Toaster />
        </RootProvider>
        <VercelAnalytics />
        {env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <GoogleAnalytics gaId={env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
        )}
      </ThemeProvider>
    </body>
  </html>
);

export default Layout;
