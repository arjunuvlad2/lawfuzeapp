'use client';

import * as React from 'react';

type Props = {
  size?: number;
  className?: string; // e.g. "text-white" or "text-primary"
  title?: string;
};

/**
 * LawFuze brand mark (scales + bolt), transparent background.
 * Inherits color from CSS via currentColor.
 */
export default function Mark({ size = 28, className = 'text-white', title = 'LawFuze' }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      className={className}
      fill="none"
    >
      {/* Outer ring */}
      <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" />

      {/* Column + crossbar */}
      <path d="M32 16v20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M16 20h32" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />

      {/* Left chains */}
      <path d="M24 22l-4 8M24 22l4 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Left pan */}
      <path d="M18 30h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M20 30c2.2 3.2 9.8 3.2 12 0" stroke="currentColor" strokeWidth="2" fill="none" />

      {/* Right chains */}
      <path d="M40 22l-4 8M40 22l4 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Right pan */}
      <path d="M34 30h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M36 30c2.2 3.2 9.8 3.2 12 0" stroke="currentColor" strokeWidth="2" fill="none" />

      {/* Lightning bolt overlay (solid) */}
      <path
        d="M36 13h-7l4-10-16 16h11l-4 14 16-18h-4z"
        fill="currentColor"
        transform="translate(13 15) scale(0.55)"
      />

      {/* Base */}
      <path d="M24 44h16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
