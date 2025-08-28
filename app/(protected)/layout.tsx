'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from '@/providers/auth-provider';
import { ScreenLoader } from '@/components/common/screen-loader';
import { Demo1Layout } from '../components/layouts/demo1/layout';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'unauthenticated') {
      // Optional: send them back here after signin
      const redirectTo = encodeURIComponent(pathname || '/');
      router.replace(`/signin?redirectTo=${redirectTo}`);
    }
  }, [status, router, pathname]);

  // While we’re checking the session, show a loader (prevents flicker)
  if (status === 'loading') return <ScreenLoader />;

  // If unauthenticated we already triggered a redirect; render nothing
  if (status === 'unauthenticated') return null;

  // Authenticated: render the app shell + page
  return <Demo1Layout>{children}</Demo1Layout>;
}
