
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
  'Roman': {
    from: '#D2B48C', via: '#b3906a', to: '#8B4513',
    spine: '#5d2e0d', accent: '#FFF8DC', emoji: '📖',
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
          className="flex-1 relative overflow-hidden flex flex-col"
          style={{
            background: `linear-gradient(150deg, ${theme.from}, ${theme.to})`,
          }}
        >
          {/* Brillance douce de gauche à droite (Effet de volume du livre) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, rgba(255,255,255,0.15) 0%, transparent 15%, transparent 85%, rgba(0,0,0,0.15) 100%)',
            }}
          />

          {/* Espace vide en haut */}
          <div className={`${isSm ? 'h-4' : 'h-10'}`}></div>

          {/* Bande de texte (titre et auteur) */}
          <div className="w-full relative z-10" style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}>
             <div className={`${isSm ? 'px-2 py-1.5' : 'px-4 py-4'}`}>
               <h4 
                 className={`font-bold leading-snug uppercase text-sans ${isSm ? 'text-[7px] line-clamp-3' : 'text-sm line-clamp-4'}`}
                 style={{ color: theme.spine }}
               >
                 {title}
               </h4>
               <p 
                 className={`${isSm ? 'mt-0.5 text-[6px]' : 'mt-1 text-[11px]'} font-normal`}
                 style={{ color: theme.spine, opacity: 0.9 }}
               >
                 {author}
               </p>
             </div>
          </div>

          {/* Décoratif au centre/bas */}
          <div className="absolute bottom-0 right-0 left-0 flex justify-center items-end pointer-events-none" style={{ opacity: 0.45 }}>
            <svg 
              className={`transform ${isSm ? 'translate-y-1' : 'translate-y-2'}`}
              width={isSm ? "90%" : "85%"} 
              height="auto" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke={theme.accent} 
              strokeWidth={isSm ? "0.4" : "0.25"}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {category?.includes('Informatique') ? (
                <>
                  <circle cx="12" cy="12" r="2.5" />
                  <ellipse cx="12" cy="12" rx="11" ry="4" transform="rotate(45 12 12)" />
                  <ellipse cx="12" cy="12" rx="11" ry="4" transform="rotate(-45 12 12)" />
                  <ellipse cx="12" cy="12" rx="11" ry="4" transform="rotate(90 12 12)" />
                </>
              ) : (
                <path d="M12 22C12 22 11 16 7 14C3 12 2 8 2 8C2 8 6 9 9 11C11.5 12.6 12 16 12 16M12 22C12 22 13 16 17 14C21 12 22 8 22 8C22 8 18 9 15 11C12.5 12.6 12 16 12 16M12 22C12 22 9 17 9 12C9 7 12 2 12 2C12 2 15 7 15 12C15 17 12 22 12 22Z" />
              )}
            </svg>
          </div>
          
          {/* Ombre et finition sur les bords de la couverture */}
          <div className="absolute inset-0 pointer-events-none shadow-[inset_0_-10px_20px_rgba(0,0,0,0.1)]" />
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
