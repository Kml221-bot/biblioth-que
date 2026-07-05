import React from 'react';
import { cn } from '@/lib/utils';

type LogoSize = 'sm' | 'md' | 'lg' | 'xl';

interface BiblioTechLogoProps {
  className?: string;
  markClassName?: string;
  textClassName?: string;
  showText?: boolean;
  size?: LogoSize;
  variant?: 'default' | 'light';
}

const markSizes: Record<LogoSize, string> = {
  sm: 'h-7 w-7',
  md: 'h-9 w-9',
  lg: 'h-12 w-12',
  xl: 'h-24 w-24',
};

const textSizes: Record<LogoSize, string> = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl',
  xl: 'text-5xl',
};

// ─── Logo vectoriel inline ─────────────────────────────────────────────────────
// SVG inline = zéro requête HTTP, rendu instantané, accessible.
// Design inspiré du logo réaliste : fond teal→violet, livre ouvert avec glow,
// favori doré et étoile.
export function BiblioTechMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      role="img"
      aria-label="Logo BiblioTech"
    >
      <defs>
        {/* Fond : teal → bleu → violet (identique au PNG) */}
        <linearGradient id="bt-bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#0E7A4F" />
          <stop offset="48%"  stopColor="#1A4FC0" />
          <stop offset="100%" stopColor="#6B21A8" />
        </linearGradient>

        {/* Ombre portée en bas du fond */}
        <linearGradient id="bt-shadow" x1="8" y1="48" x2="56" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#000" stopOpacity="0"   />
          <stop offset="100%" stopColor="#000" stopOpacity="0.28"/>
        </linearGradient>

        {/* Page gauche */}
        <linearGradient id="bt-pl" x1="14" y1="19" x2="32" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#DCF5EB" />
        </linearGradient>

        {/* Page droite */}
        <linearGradient id="bt-pr" x1="32" y1="19" x2="50" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#DDE8FF" />
        </linearGradient>

        {/* Lueur au centre (spine glow) */}
        <radialGradient id="bt-glow" cx="32" cy="35" r="9" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#7DD3FC" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#7DD3FC" stopOpacity="0"    />
        </radialGradient>
      </defs>

      {/* ── Fond arrondi ─────────────────────────────────────── */}
      <rect x="2" y="2" width="60" height="60" rx="15" fill="url(#bt-bg)" />
      <rect x="2" y="2" width="60" height="60" rx="15" fill="url(#bt-shadow)" />

      {/* ── Page gauche ──────────────────────────────────────── */}
      <path
        d="M13 22 Q13 19.5 15.5 18.5 Q22 16.5 32 21 L32 50 Q22 46.5 13 48 Z"
        fill="url(#bt-pl)"
      />

      {/* ── Page droite ──────────────────────────────────────── */}
      <path
        d="M51 22 Q51 19.5 48.5 18.5 Q42 16.5 32 21 L32 50 Q42 46.5 51 48 Z"
        fill="url(#bt-pr)"
      />

      {/* ── Lueur centrale (comme le glow du PNG) ────────────── */}
      <ellipse cx="32" cy="35" rx="3.5" ry="15" fill="url(#bt-glow)" />

      {/* ── Lignes page gauche ───────────────────────────────── */}
      <line x1="17" y1="28" x2="28.5" y2="26.5" stroke="#7CA899" strokeWidth="1.3" strokeLinecap="round" opacity="0.65" />
      <line x1="17" y1="32" x2="28.5" y2="30.5" stroke="#7CA899" strokeWidth="1.3" strokeLinecap="round" opacity="0.65" />
      <line x1="17" y1="36" x2="28.5" y2="34.5" stroke="#7CA899" strokeWidth="1.1" strokeLinecap="round" opacity="0.45" />
      <line x1="17" y1="40" x2="26"   y2="38.5" stroke="#7CA899" strokeWidth="1"   strokeLinecap="round" opacity="0.35" />

      {/* ── Lignes page droite ───────────────────────────────── */}
      <line x1="35.5" y1="26.5" x2="47" y2="28" stroke="#8898B0" strokeWidth="1.3" strokeLinecap="round" opacity="0.65" />
      <line x1="35.5" y1="30.5" x2="47" y2="32" stroke="#8898B0" strokeWidth="1.3" strokeLinecap="round" opacity="0.65" />
      <line x1="35.5" y1="34.5" x2="47" y2="36" stroke="#8898B0" strokeWidth="1.1" strokeLinecap="round" opacity="0.45" />
      <line x1="38"   y1="38.5" x2="47" y2="40" stroke="#8898B0" strokeWidth="1"   strokeLinecap="round" opacity="0.35" />

      {/* ── Favori doré (comme le ribbon du PNG) ─────────────── */}
      <path d="M44.5 12 L44.5 26.5 L41.5 23.8 L38.5 26.5 L38.5 12 Z" fill="#F5C430" />
      <path d="M44.5 12 L44.5 26.5 L41.5 23.8 L38.5 26.5 L38.5 12 Z"
        fill="none" stroke="#D4A400" strokeWidth="0.6" opacity="0.5" />

      {/* ── Étoile (sparkle, en haut à gauche) ───────────────── */}
      <path
        d="M19.5 15.5 L20.4 17.9 L22.9 17.9 L20.9 19.4 L21.7 21.8 L19.5 20.3 L17.3 21.8 L18.1 19.4 L16.1 17.9 L18.6 17.9 Z"
        fill="#F5C430"
        opacity="0.95"
      />

      {/* ── Petite étoile secondaire ──────────────────────────── */}
      <path
        d="M11.5 34 L12 35.2 L13.3 35.2 L12.3 36 L12.7 37.2 L11.5 36.4 L10.3 37.2 L10.7 36 L9.7 35.2 L11 35.2 Z"
        fill="#F5C430"
        opacity="0.55"
      />
    </svg>
  );
}

export function BiblioTechLogo({
  className,
  markClassName,
  textClassName,
  showText = true,
  size = 'md',
  variant = 'default',
}: BiblioTechLogoProps) {
  const isLight = variant === 'light';

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <BiblioTechMark className={cn(markSizes[size], markClassName)} />
      {showText && (
        <span
          className={cn(
            'font-bold leading-none tracking-normal',
            textSizes[size],
            isLight ? 'text-white' : 'text-foreground',
            textClassName
          )}
        >
          Biblio<span className={isLight ? 'text-emerald-300' : 'text-primary'}>Tech</span>
        </span>
      )}
    </span>
  );
}
