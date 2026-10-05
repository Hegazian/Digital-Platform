'use client';

import React from 'react';

interface LogoMarkProps {
  /** Pixel size of the square mark. */
  size?: number;
  className?: string;
}

/**
 * Brand mark: a geometric graduation cap (mortarboard + tassel) set in the
 * platform's indigo→violet gradient tile. Original vector art so it scales
 * crisply anywhere (navbar, footer, print).
 */
export function LogoMark({ size = 40, className = '' }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="edu-logo-tile" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366F1" />
          <stop offset="0.55" stopColor="#7C3AED" />
          <stop offset="1" stopColor="#4F46E5" />
        </linearGradient>
        <linearGradient id="edu-logo-sheen" x1="10" y1="8" x2="38" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" stopOpacity="0.28" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Tile */}
      <rect x="1" y="1" width="46" height="46" rx="13" fill="url(#edu-logo-tile)" />
      <rect x="1" y="1" width="46" height="46" rx="13" fill="url(#edu-logo-sheen)" />
      <rect
        x="1.75"
        y="1.75"
        width="44.5"
        height="44.5"
        rx="12.25"
        stroke="#FFFFFF"
        strokeOpacity="0.18"
        strokeWidth="1.5"
      />

      {/* Mortarboard */}
      <path
        d="M24 12L39.5 19.5L24 27L8.5 19.5L24 12Z"
        fill="#FFFFFF"
        fillOpacity="0.96"
      />
      {/* Cap base */}
      <path
        d="M15.5 23.4V29.2C15.5 31.9 19.3 34 24 34C28.7 34 32.5 31.9 32.5 29.2V23.4L24 27.45L15.5 23.4Z"
        fill="#FFFFFF"
        fillOpacity="0.82"
      />
      {/* Tassel */}
      <path
        d="M37.6 20.4V27.5"
        stroke="#A5B4FC"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="37.6" cy="29.8" r="1.9" fill="#A5B4FC" />
    </svg>
  );
}

interface LogoProps {
  /** Show the wordmark beside the mark. */
  withWordmark?: boolean;
  size?: number;
  className?: string;
}

/** Full lockup used in footers / marketing surfaces. */
export default function Logo({ withWordmark = false, size = 36, className = '' }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      {withWordmark && (
        <span className="font-extrabold tracking-tight text-white text-lg leading-none">
          Edu<span className="text-indigo-400">Platform</span>
        </span>
      )}
    </span>
  );
}
