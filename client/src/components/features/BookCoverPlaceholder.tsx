// ============================================================
// BiblioTech — Book Cover Card
// Style Apple Books / iOS : dos de livre, pages empilées,
// brillance diagonale, ombre portée, typographie soignée.
// ============================================================

import React from 'react';

// ─── Palettes thématiques ─────────────────────────────────────
interface CoverTheme {
  from: string;
  via: string;
  to: string;
  spine: string;
  accent: string;
  emoji: string;
}

const CATEGORY_THEMES: Record<string, CoverTheme> = {
  'Littérature Africaine & Sénégalaise': {
    from: '#92400e', via: '#b45309', to: '#78350f',
    spine: '#451a03', accent: '#fbbf24', emoji: '🌍',
  },
  'Informatique & Cybersécurité': {
    from: '#1e3a5f', via: '#1d4ed8', to: '#1e40af',
    spine: '#0f172a', accent: '#60a5fa', emoji: '💻',
  },
  'Développement Personnel': {
    from: '#14532d', via: '#15803d', to: '#166534',
    spine: '#052e16', accent: '#4ade80', emoji: '🌱',
  },
  'Économie & Business': {
    from: '#1c1917', via: '#44403c', to: '#292524',
    spine: '#0c0a09', accent: '#d6d3d1', emoji: '📈',
  },
  'Dark Romance & Fiction': {
    from: '#4c0519', via: '#9f1239', to: '#881337',
    spine: '#27041a', accent: '#fda4af', emoji: '🌹',
  },
  'Aventure': {
    from: '#1a2e05', via: '#365314', to: '#166534',
    spine: '#0a1400', accent: '#a3e635', emoji: '🗺️',
  },
  'Mangas & Bandes Dessinées': {
    from: '#581c87', via: '#7e22ce', to: '#6b21a8',
    spine: '#2e0660', accent: '#d8b4fe', emoji: '⛩️',
  },
  'Droit & Sciences Politiques': {
    from: '#1e3a5f', via: '#1e40af', to: '#1d4ed8',
    spine: '#0f1f3d', accent: '#93c5fd', emoji: '⚖️',
  },
  'Sciences & Mathématiques': {
    from: '#134e4a', via: '#0f766e', to: '#115e59',
    spine: '#042f2e', accent: '#5eead4', emoji: '🔬',
  },
  'Manuels Universitaires & Annales': {
    from: '#312e81', via: '#3730a3', to: '#4338ca',
    spine: '#1e1b4b', accent: '#a5b4fc', emoji: '🎓',
  },
};

const FALLBACK_THEMES: CoverTheme[] = [
  { from: '#1e3a5f', via: '#1d4ed8', to: '#312e81', spine: '#0c1429', accent: '#60a5fa', emoji: '📖' },
  { from: '#064e3b', via: '#065f46', to: '#047857', spine: '#022c22', accent: '#34d399', emoji: '📗' },
  { from: '#4c0519', via: '#9f1239', to: '#be123c', spine: '#1f0a13', accent: '#fb7185', emoji: '📕' },
  { from: '#78350f', via: '#92400e', to: '#b45309', spine: '#3b1407', accent: '#fbbf24', emoji: '📙' },
  { from: '#1e1b4b', via: '#312e81', to: '#4338ca', spine: '#0f0d26', accent: '#818cf8', emoji: '📘' },
  { from: '#134e4a', via: '#0f766e', to: '#0d9488', spine: '#042f2e', accent: '#2dd4bf', emoji: '📓' },
  { from: '#3b0764', via: '#581c87', to: '#6b21a8', spine: '#1a033a', accent: '#c084fc', emoji: '📔' },
  { from: '#0c1014', via: '#1f2937', to: '#374151', spine: '#030507', accent: '#9ca3af', emoji: '📒' },
];

function getTheme(id: string | number, category?: string): CoverTheme {
  if (category && CATEGORY_THEMES[category]) return CATEGORY_THEMES[category];
  const hash = String(id || 'x').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return FALLBACK_THEMES[hash % FALLBACK_THEMES.length];
}

function truncate(text: string, max: number) {
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

// ─── Composant ────────────────────────────────────────────────
interface BookCoverPlaceholderProps {
  title: string;
  author: string;
  id: string | number;
  category?: string;
  variant?: 'sm' | 'md' | 'lg';
}

export const BookCoverPlaceholder: React.FC<BookCoverPlaceholderProps> = ({
  title, author, id, category, variant = 'md',
}) => {
  const theme = getTheme(id, category);
  const isSm = variant === 'sm';
  const pageCount = isSm ? 6 : 10;

  return (
    <div className="relative w-full h-full select-none">

      {/* Ombre portée sous le livre */}
      <div
        className="absolute -bottom-1 left-[10%] right-1 h-3 rounded-full blur-md"
        style={{ background: 'rgba(0,0,0,0.45)' }}
      />

      {/* Conteneur livre : dos + couverture + tranche pages */}
      <div className="absolute inset-0 flex overflow-hidden rounded-r-[3px]">

        {/* ── Dos du livre (spine) ─────────────────────────────── */}
        <div
          className={`${isSm ? 'w-[8%]' : 'w-[10%]'} h-full flex-shrink-0 relative`}
          style={{ background: theme.spine }}
        >
          {/* Reflet brillant sur la tranche du dos */}
          <div
            className="absolute top-0 bottom-0 right-0 w-[2px]"
            style={{
              background:
                'linear-gradient(to bottom, rgba(255,255,255,0.18), rgba(255,255,255,0.04), rgba(255,255,255,0.14))',
            }}
          />
          <div
            className="absolute top-0 bottom-0 left-[30%] w-px"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          />
        </div>

        {/* ── Couverture principale ──────────────────────────────── */}
        <div
          className="flex-1 relative overflow-hidden"
          style={{
            background: `linear-gradient(145deg, ${theme.from}, ${theme.via} 55%, ${theme.to})`,
          }}
        >
          {/* Texture grille très discrète */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ opacity: 0.045 }}
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern
                id={`bg-grid-${id}`}
                width="16"
                height="16"
                patternUnits="userSpaceOnUse"
              >
                <path d="M 16 0 L 0 0 0 16" fill="none" stroke={theme.accent} strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#bg-grid-${id})`} />
          </svg>

          {/* Brillance diagonale (reflet iOS) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(130deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.06) 30%, transparent 55%)',
            }}
          />

          {/* Contenu */}
          <div className={`relative z-10 h-full flex flex-col ${isSm ? 'p-1.5' : 'p-3'}`}>

            {/* Haut : emoji + points déco */}
            <div className={`flex justify-between items-start ${isSm ? 'mb-1' : 'mb-2'}`}>
              <span className={`${isSm ? 'text-[9px]' : 'text-sm'} opacity-40`}>{theme.emoji}</span>
              {!isSm && (
                <div className="flex gap-[3px] mt-0.5">
                  {[0.4, 0.25, 0.15].map((o, i) => (
                    <div
                      key={i}
                      className="w-[3px] h-[3px] rounded-full"
                      style={{ background: theme.accent, opacity: o }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Centre : titre */}
            <div className="flex-1 flex items-center">
              <div className="w-full">
                <div
                  className={`${isSm ? 'w-4 h-[1.5px] mb-1' : 'w-7 h-[2px] mb-2'} rounded-full`}
                  style={{ background: theme.accent, opacity: 0.75 }}
                />
                <h4
                  className={`font-bold text-white leading-snug ${isSm ? 'text-[7px] line-clamp-3' : 'text-[11px] line-clamp-5'}`}
                  style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                >
                  {isSm ? truncate(title, 30) : title}
                </h4>
              </div>
            </div>

            {/* Bas : auteur + badge BiblioTech */}
            <div className={`${isSm ? 'mt-1' : 'mt-2'} space-y-1`}>
              <div
                className="w-full h-px rounded-full"
                style={{
                  background: `linear-gradient(to right, ${theme.accent}70, transparent)`,
                }}
              />
              <p
                className={`text-white/55 uppercase tracking-widest font-medium truncate ${isSm ? 'text-[5px]' : 'text-[8px]'}`}
              >
                {isSm ? truncate(author, 18) : truncate(author, 28)}
              </p>
              {!isSm && (
                <div
                  className="inline-flex px-1.5 py-0.5 rounded-sm"
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: `1px solid ${theme.accent}25`,
                  }}
                >
                  <span
                    className="text-[5px] uppercase tracking-[0.2em] font-bold"
                    style={{ color: `${theme.accent}80` }}
                  >
                    BiblioTech
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Vignette bas (assombrit le bas de la couverture) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(to top, rgba(0,0,0,0.38) 0%, transparent 45%)',
            }}
          />
        </div>

        {/* ── Tranche pages (côté droit) ────────────────────────── */}
        <div
          className={`${isSm ? 'w-[4px]' : 'w-[6px]'} h-full flex-shrink-0 flex flex-col relative overflow-hidden`}
          style={{ background: '#e5ddd0' }}
        >
          {Array.from({ length: pageCount }).map((_, i) => (
            <div
              key={i}
              className="flex-1"
              style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}
            />
          ))}
          {/* Ombre interne côté pages */}
          <div
            className="absolute inset-y-0 left-0 w-[2px]"
            style={{
              background:
                'linear-gradient(to right, rgba(0,0,0,0.18), transparent)',
            }}
          />
        </div>
      </div>
    </div>
  );
};
