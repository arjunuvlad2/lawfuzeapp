'use client';

import { ReactNode } from 'react';
import { ClassicLayout } from './layouts/classic';


export default function Layout({ children }: { children: ReactNode }) {
  return <ClassicLayout>{children}</ClassicLayout>;
}
