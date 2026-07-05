// ============================================================
// BiblioTech — Panneau des marque-pages EPUB
// Liste des marque-pages avec navigation et gestion
// ============================================================

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bookmark, Trash2, ChevronRight } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────
interface BookmarkData {
  id: string;
  cfi: string;
  label: string;
  createdAt: Date;
}

interface BookmarksPanelProps {
  bookmarks: BookmarkData[];
  isOpen: boolean;
  onClose: () => void;
  onGoToBookmark: (cfi: string) => void;
  onDeleteBookmark: (id: string) => void;
  theme: {
    bg: string;
    text: string;
    headerBg: string;
    headerBorder: string;
    accent: string;
    mutedText: string;
  };
}

// ─── Composant principal ──────────────────────────────────
export default function BookmarksPanel({
  bookmarks,
  isOpen,
  onClose,
  onGoToBookmark,
  onDeleteBookmark,
  theme,
}: BookmarksPanelProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-0 bottom-0 right-0 z-[61] w-80 max-w-[85vw] overflow-y-auto"
            style={{
              backgroundColor: theme.bg,
              borderLeft: `1px solid ${theme.headerBorder}`,
            }}
          >
            <div className="px-4 py-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: theme.text }}>
                    Marque-pages
                  </h3>
                  <p className="text-xs" style={{ color: theme.mutedText }}>
                    {bookmarks.length} marque-page{bookmarks.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <button onClick={onClose} className="p-2 rounded-lg transition-colors hover:bg-black/5">
                  <X size={18} style={{ color: theme.mutedText }} />
                </button>
              </div>

              {/* Liste */}
              {bookmarks.length === 0 ? (
                <div className="text-center py-12">
                  <Bookmark size={40} className="mx-auto mb-3 opacity-20" style={{ color: theme.mutedText }} />
                  <p className="text-sm font-medium" style={{ color: theme.text }}>
                    Aucun marque-page
                  </p>
                  <p className="text-xs mt-1" style={{ color: theme.mutedText }}>
                    Appuyez sur 🔖 pour en ajouter un
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {bookmarks
                    .slice()
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((bookmark) => (
                      <div
                        key={bookmark.id}
                        className="group flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all hover:shadow-sm"
                        style={{
                          backgroundColor: `${theme.accent}08`,
                          border: `1px solid ${theme.headerBorder}`,
                        }}
                        onClick={() => onGoToBookmark(bookmark.cfi)}
                      >
                        <Bookmark
                          size={18}
                          className="flex-shrink-0"
                          style={{ color: theme.accent }}
                          fill={theme.accent}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: theme.text }}>
                            {bookmark.label}
                          </p>
                          <p className="text-xs" style={{ color: theme.mutedText }}>
                            {new Date(bookmark.createdAt).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onGoToBookmark(bookmark.cfi);
                            }}
                            className="p-1 rounded transition-colors hover:bg-black/10"
                          >
                            <ChevronRight size={14} style={{ color: theme.accent }} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteBookmark(bookmark.id);
                            }}
                            className="p-1 rounded transition-colors hover:bg-red-100"
                          >
                            <Trash2 size={14} className="text-red-400" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
