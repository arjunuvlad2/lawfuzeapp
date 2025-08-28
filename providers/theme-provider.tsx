'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { TooltipProvider } from '@/components/ui/tooltip';

export function ThemeProvider({
  children,
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      forcedTheme="dark"          // 🔒 always dark
      enableSystem={false}        // ignore OS theme
      storageKey="nextjs-theme"   // safe to keep
      disableTransitionOnChange   // avoids flicker
      enableColorScheme           // sets <meta color-scheme="dark">
    >
      <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
    </NextThemesProvider>
  );
}
