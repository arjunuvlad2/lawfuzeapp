'use client';

import { ReactNode } from 'react';
import { BrandedLayout } from './layouts/branded';
import { ClassicLayout } from './layouts/classic';


export default function Layout({ children }: { children: ReactNode }) {
  return <ClassicLayout>{children}</ClassicLayout>;
}
