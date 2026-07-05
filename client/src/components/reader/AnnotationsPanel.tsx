// ============================================================
// BiblioTech — Panneau d'annotations EPUB
// Liste tous les surlignages et notes, organisés par chapitre
// ============================================================

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Search, Download, Trash2, MessageSquare,
  Highlighter, ChevronRight, FileText
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────
interface AnnotationData {
  id: string;
  cfi: string;
  text: string;
  color: string;
  note?: string;
  chapter?: string;
  createdAt: Date;
}

interface AnnotationsPanelProps {
  annotations: AnnotationData[];
  isOpen: boolean;
  onClose: () => void;
  onGoToAnnotation: (cfi: string) => void;
  onDeleteAnnotation: (id: string) => void;
  onAddNote: (id: string, note: string) => void;
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
export default function AnnotationsPanel({
  annotations,
  isOpen,
  onClose,
  onGoToAnnotation,
  onDeleteAnnotation,
  onAddNote,
  theme,
}: AnnotationsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [filterColor, setFilterColor] = useState<string | null>(null);

  // Filtrer et grouper par chapitre
  const filteredAnnotations = useMemo(() => {
    let result = annotations;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        a => a.text.toLowerCase().includes(query) ||
             a.note?.toLowerCase().includes(query) ||
             a.chapter?.toLowerCase().includes(query)
      );
    }

    if (filterColor) {
      result = result.filter(a => a.color === filterColor);
    }

    return result;
  }, [annotations, searchQuery, filterColor]);

  // Grouper par chapitre
  const grouped = useMemo(() => {
    const groups: Record<string, AnnotationData[]> = {};
    for (const a of filteredAnnotations) {
      const chapter = a.chapter || 'Sans chapitre';
      if (!groups[chapter]) groups[chapter] = [];
      groups[chapter].push(a);
    }
    return groups;
  }, [filteredAnnotations]);

  // Couleurs uniques utilisées
  const usedColors = useMemo(() => {
    return Array.from(new Set(annotations.map(a => a.color)));
  }, [annotations]);

  // Export en texte brut
  const exportAsText = () => {
    let text = '📚 Mes annotations\n\n';
    for (const [chapter, anns] of Object.entries(grouped)) {
      text += `━━━ ${chapter} ━━━\n\n`;
      for (const a of anns) {
        text += `"${a.text}"\n`;
        if (a.note) text += `📝 Note : ${a.note}\n`;
        text += `${new Date(a.createdAt).toLocaleDateString('fr-FR')}\n\n`;
      }
    }

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'annotations-bibliotech.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Sauvegarder une note
  const saveNote = (id: string) => {
    if (noteText.trim()) {
      onAddNote(id, noteText.trim());
    }
    setEditingNoteId(null);
    setNoteText('');
  };

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
            className="fixed top-0 bottom-0 right-0 z-[61] w-96 max-w-[90vw] overflow-y-auto"
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
                    Annotations
                  </h3>
                  <p className="text-xs" style={{ color: theme.mutedText }}>
                    {annotations.length} annotation{annotations.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {annotations.length > 0 && (
                    <button
                      onClick={exportAsText}
                      className="p-2 rounded-lg transition-colors hover:bg-black/5"
                      title="Exporter les annotations"
                    >
                      <Download size={18} style={{ color: theme.accent }} />
                    </button>
                  )}
                  <button onClick={onClose} className="p-2 rounded-lg transition-colors hover:bg-black/5">
                    <X size={18} style={{ color: theme.mutedText }} />
                  </button>
                </div>
              </div>

              {/* Recherche */}
              {annotations.length > 0 && (
                <div className="relative mb-3">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: theme.mutedText }}
                  />
                  <input
                    type="text"
                    placeholder="Rechercher dans les annotations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl text-sm border outline-none"
                    style={{
                      backgroundColor: `${theme.text}08`,
                      borderColor: theme.headerBorder,
                      color: theme.text,
                    }}
                  />
                </div>
              )}

              {/* Filtres par couleur */}
              {usedColors.length > 1 && (
                <div className="flex items-center gap-1.5 mb-4">
                  <button
                    onClick={() => setFilterColor(null)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all`}
                    style={{
                      backgroundColor: !filterColor ? `${theme.accent}20` : 'transparent',
                      color: !filterColor ? theme.accent : theme.mutedText,
                      border: `1px solid ${!filterColor ? theme.accent : theme.headerBorder}`,
                    }}
                  >
                    Tout
                  </button>
                  {usedColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setFilterColor(filterColor === color ? null : color)}
                      className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                      style={{
                        backgroundColor: color,
                        borderColor: filterColor === color ? theme.accent : 'transparent',
                        transform: filterColor === color ? 'scale(1.15)' : undefined,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Liste des annotations */}
              {annotations.length === 0 ? (
                <div className="text-center py-12">
                  <Highlighter size={40} className="mx-auto mb-3 opacity-20" style={{ color: theme.mutedText }} />
                  <p className="text-sm font-medium" style={{ color: theme.text }}>
                    Aucune annotation
                  </p>
                  <p className="text-xs mt-1" style={{ color: theme.mutedText }}>
                    Sélectionnez du texte pour surligner
                  </p>
                </div>
              ) : filteredAnnotations.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm" style={{ color: theme.mutedText }}>
                    Aucun résultat pour « {searchQuery} »
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(grouped).map(([chapter, anns]) => (
                    <div key={chapter}>
                      <p
                        className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1"
                        style={{ color: theme.mutedText }}
                      >
                        <FileText size={12} />
                        {chapter}
                      </p>
                      <div className="space-y-2">
                        {anns.map((annotation) => (
                          <div
                            key={annotation.id}
                            className="group rounded-xl p-3 transition-all cursor-pointer hover:shadow-sm"
                            style={{
                              backgroundColor: `${annotation.color}15`,
                              border: `1px solid ${annotation.color}30`,
                            }}
                            onClick={() => onGoToAnnotation(annotation.cfi)}
                          >
                            {/* Barre de couleur */}
                            <div className="flex items-start gap-2">
                              <div
                                className="w-1 rounded-full flex-shrink-0 self-stretch"
                                style={{ backgroundColor: annotation.color }}
                              />
                              <div className="flex-1 min-w-0">
                                {/* Texte surligné */}
                                <p
                                  className="text-sm leading-relaxed"
                                  style={{ color: theme.text }}
                                >
                                  « {annotation.text} »
                                </p>

                                {/* Note */}
                                {annotation.note && (
                                  <div
                                    className="mt-2 flex items-start gap-1.5 text-xs"
                                    style={{ color: theme.mutedText }}
                                  >
                                    <MessageSquare size={12} className="mt-0.5 flex-shrink-0" />
                                    <span>{annotation.note}</span>
                                  </div>
                                )}

                                {/* Formulaire de note */}
                                {editingNoteId === annotation.id && (
                                  <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                                    <textarea
                                      value={noteText}
                                      onChange={(e) => setNoteText(e.target.value)}
                                      placeholder="Ajouter une note..."
                                      className="w-full px-3 py-2 rounded-lg text-xs border outline-none resize-none"
                                      style={{
                                        backgroundColor: theme.bg,
                                        borderColor: theme.headerBorder,
                                        color: theme.text,
                                      }}
                                      rows={2}
                                      autoFocus
                                    />
                                    <div className="flex items-center gap-2 mt-1">
                                      <button
                                        onClick={() => saveNote(annotation.id)}
                                        className="px-3 py-1 rounded-lg text-xs font-medium text-white"
                                        style={{ backgroundColor: theme.accent }}
                                      >
                                        Enregistrer
                                      </button>
                                      <button
                                        onClick={() => { setEditingNoteId(null); setNoteText(''); }}
                                        className="text-xs"
                                        style={{ color: theme.mutedText }}
                                      >
                                        Annuler
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Actions */}
                                <div className="flex items-center justify-between mt-2">
                                  <span className="text-xs" style={{ color: theme.mutedText }}>
                                    {new Date(annotation.createdAt).toLocaleDateString('fr-FR', {
                                      day: 'numeric',
                                      month: 'short',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {editingNoteId !== annotation.id && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingNoteId(annotation.id);
                                          setNoteText(annotation.note || '');
                                        }}
                                        className="p-1 rounded transition-colors hover:bg-black/10"
                                        title="Ajouter une note"
                                      >
                                        <MessageSquare size={12} style={{ color: theme.mutedText }} />
                                      </button>
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onGoToAnnotation(annotation.cfi);
                                      }}
                                      className="p-1 rounded transition-colors hover:bg-black/10"
                                      title="Aller à cette annotation"
                                    >
                                      <ChevronRight size={12} style={{ color: theme.accent }} />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteAnnotation(annotation.id);
                                      }}
                                      className="p-1 rounded transition-colors hover:bg-red-100"
                                      title="Supprimer"
                                    >
                                      <Trash2 size={12} className="text-red-400" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
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
