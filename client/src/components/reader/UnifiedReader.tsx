import React, { useState, useEffect, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import ePub, { Book, Rendition, Contents } from 'epubjs';
import type { NavItem } from 'epubjs/types/navigation';
import type { PackagingMetadataObject } from 'epubjs/types/packaging';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Settings2,
  List, Bookmark, BookmarkCheck, Search, X, Type, Minus, Plus,
  AlignLeft, AlignJustify, Columns, FileText, RotateCcw,
  Highlighter, Loader2, AlertCircle, Fingerprint,
  Sun, Moon, ScrollText, BookOpen, Clock, Volume2, VolumeX,
  PlayCircle, StopCircle, Copy, Share2, MessageSquare, StickyNote
} from 'lucide-react';
import { useSpeech } from '@/hooks/useSpeech';
import DictionaryPanel from './DictionaryPanel';
import AnnotationsPanel from './AnnotationsPanel';
import BookmarksPanel from './BookmarksPanel';
import {
  getEpubAnnotations, saveEpubAnnotation, deleteEpubAnnotation, updateAnnotationNote,
  getEpubBookmarks, saveEpubBookmark, deleteEpubBookmark,
  saveEpubProgress, getEpubProgress,
} from '@/services/epubService';
import {
  useReadingPreferences, READING_THEMES, READING_FONTS, READING_MARGINS,
  type ReadingTheme, type ReadingFont, type ReadingMargin,
} from '@/hooks/useReadingPreferences';

// Configurer le worker PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// ─── Types ────────────────────────────────────────────────
export interface UnifiedReaderHandle {
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
  getCurrentPage: () => number;
  getNumPages: () => number;
}

interface UnifiedReaderProps {
  /** URL du fichier (PDF ou EPUB) */
  src: string;
  /** Type de document */
  format: 'pdf' | 'epub';
  /** ID du livre en base */
  bookId: string;
  /** ID de l'utilisateur connecté */
  userId?: string;
  /** Email pour le watermark DRM */
  userEmail?: string;
  /** Position initiale (page pour PDF) */
  initialPage?: number;
  /** Position initiale (epubcfi pour EPUB) */
  initialCfi?: string;
  /** Callback retour à la bibliothèque */
  onBack?: () => void;
  /** Callback quand la position change */
  onLocationChange?: (cfi: string, page: number, total: number, pct: number) => void;
  /** Callback quand le document est chargé */
  onDocumentLoad?: (total: number) => void;
  /** Callback pour le texte de page (TTS) */
  onPageTextChange?: (text: string) => void;
  /** Titre du livre (affiché dans le header) */
  bookTitle?: string;
  /** Auteur du livre */
  bookAuthor?: string;
}

interface TocItem {
  id: string;
  label: string;
  href: string;
  level: number;
  subitems: TocItem[];
}

interface AnnotationData {
  id: string;
  cfi: string;
  text: string;
  color: string;
  note?: string;
  chapter?: string;
  createdAt: Date;
}

interface BookmarkData {
  id: string;
  cfi: string;
  label: string;
  createdAt: Date;
}

interface PDFHighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface PDFHighlight {
  id: string;
  page: number;
  text: string;
  color: string;
  note?: string;
  rects: PDFHighlightRect[];
  createdAt: Date;
}

const HIGHLIGHT_COLORS = [
  { name: 'Jaune', value: '#FDE68A', emoji: '🟡' },
  { name: 'Vert', value: '#A7F3D0', emoji: '🟢' },
  { name: 'Bleu', value: '#BFDBFE', emoji: '🔵' },
  { name: 'Rose', value: '#FBCFE8', emoji: '🩷' },
  { name: 'Orange', value: '#FED7AA', emoji: '🟠' },
];

// ─── Helper TOC ───────────────────────────────────────────
function parseToc(items: NavItem[], level = 0): TocItem[] {
  return items.map(item => ({
    id: item.id,
    label: item.label.trim(),
    href: item.href,
    level,
    subitems: item.subitems ? parseToc(item.subitems, level + 1) : [],
  }));
}

function findTocItemByHref(items: TocItem[], href: string): TocItem | null {
  for (const item of items) {
    if (href.includes(item.href) || item.href.includes(href)) return item;
    const found = findTocItemByHref(item.subitems, href);
    if (found) return found;
  }
  return null;
}

// ─── Composant Principal ──────────────────────────────────
const UnifiedReader = forwardRef<UnifiedReaderHandle, UnifiedReaderProps>(function UnifiedReader({
  src,
  format,
  bookId,
  userId,
  userEmail,
  initialPage = 1,
  initialCfi,
  onBack,
  onLocationChange,
  onDocumentLoad,
  onPageTextChange,
  bookTitle,
  bookAuthor,
}, ref) {

  // ─── Préférences de lecture partagées ─────────────────
  const {
    preferences, setTheme, setFont, setFontSize, setLineHeight,
    setMargin, setBrightness, toggleJustified, toggleMode,
    currentTheme, currentFont, currentMargin, resetDefaults,
  } = useReadingPreferences();

  // ─── État UI ─────────────────────────────────────────
  const [showUI, setShowUI] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showDictionary, setShowDictionary] = useState(false);
  const [dictionaryWord, setDictionaryWord] = useState('');
  const [showGoToPage, setShowGoToPage] = useState(false);
  const [goToPageInput, setGoToPageInput] = useState('');

  // ─── État document ───────────────────────────────────
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [percentage, setPercentage] = useState(0);
  const [currentCfi, setCurrentCfi] = useState(initialCfi || '');
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  // EPUB-specific
  const [metadata, setMetadata] = useState<PackagingMetadataObject | null>(null);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [currentChapter, setCurrentChapter] = useState('');
  const viewerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);

  // PDF-specific
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [viewMode, setViewMode] = useState<'single' | 'scroll' | 'double'>('single');
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 800);

  // Annotations
  const [annotations, setAnnotations] = useState<AnnotationData[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkData[]>([]);
  const [highlights, setHighlights] = useState<PDFHighlight[]>([]);
  const [dbLoaded, setDbLoaded] = useState(false);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Contexte menu / sélection
  const [selectedText, setSelectedText] = useState('');
  const [selectedCfi, setSelectedCfi] = useState('');
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [pdfContextMenu, setPdfContextMenu] = useState<{
    x: number; y: number; text: string; page: number;
  } | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  // Recherche EPUB
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ cfi: string; excerpt: string }>>([]);

  // TTS
  const { isSpeaking, isSupported: speechSupported, speak, stop: stopSpeech } = useSpeech();
  const [isAutoRead, setIsAutoRead] = useState(false);
  const autoReadRef = useRef(false);
  const awaitingAutoSpeakRef = useRef(false);

  // ─── Auto-save progression EPUB ──────────────────────
  const saveProgressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (format !== 'epub' || !userId || !bookId || !currentCfi || totalPages === 0) return;
    if (saveProgressTimeoutRef.current) clearTimeout(saveProgressTimeoutRef.current);
    saveProgressTimeoutRef.current = setTimeout(() => {
      saveEpubProgress(userId, bookId, { currentPage, totalPages, percentage, epubcfi: currentCfi });
    }, 5000);
    return () => { if (saveProgressTimeoutRef.current) clearTimeout(saveProgressTimeoutRef.current); };
  }, [format, userId, bookId, currentCfi, currentPage, totalPages, percentage]);

  // ─── Charger annotations & marque-pages UNIQUEMENT quand nécessaire ──────────────
  useEffect(() => {
    // ⚡ OPTIMISATION: Ne charger les annotations que si l'utilisateur ouvre le panneau
    if (!userId || !bookId || dbLoaded) return;
    // Ne pas charger automatiquement, attendre que showAnnotations ou showBookmarks soit true
    if (!showAnnotations && !showBookmarks) return;

    async function loadFromDB() {
      try {
        const [dbAnnotations, dbBookmarks, dbProgress] = await Promise.all([
          getEpubAnnotations(userId!, bookId),
          getEpubBookmarks(userId!, bookId),
          format === 'epub' ? getEpubProgress(userId!, bookId) : null,
        ]);
        if (dbAnnotations.length > 0) {
          if (format === 'epub') {
            setAnnotations(dbAnnotations);
          } else {
            // PDF annotations
            const pdfAnnots: PDFHighlight[] = dbAnnotations
              .filter(a => a.cfi?.startsWith('pdf:page:'))
              .map(a => {
                try {
                  const parts = a.cfi.split(':');
                  const page = parseInt(parts[2], 10);
                  const rects: PDFHighlightRect[] = JSON.parse(parts.slice(3).join(':'));
                  return { id: a.id, page, text: a.text, color: a.color, note: a.note, rects, createdAt: a.createdAt };
                } catch { return null; }
              })
              .filter(Boolean) as PDFHighlight[];
            setHighlights(pdfAnnots);
          }
        }
        if (dbBookmarks.length > 0) setBookmarks(dbBookmarks);
        if (format === 'epub' && dbProgress?.epubcfi && !initialCfi && renditionRef.current) {
          renditionRef.current.display(dbProgress.epubcfi);
        }
        setDbLoaded(true);
      } catch (err) {
        console.error('Erreur chargement données DB:', err);
        setDbLoaded(true);
      }
    }
    loadFromDB();
  }, [userId, bookId, dbLoaded, initialCfi, format, showAnnotations, showBookmarks]);

  // ═══════════════════════════════════════════════════════
  // ███ PDF ENGINE ████████████████████████████████████████
  // ═══════════════════════════════════════════════════════

  const onPdfLoadSuccess = useCallback(({ numPages: total }: { numPages: number }) => {
    setNumPages(total);
    setTotalPages(total);
    setIsLoading(false);
    onDocumentLoad?.(total);
  }, [onDocumentLoad]);

  const onPdfLoadError = useCallback((err: Error) => {
    console.error('Erreur chargement PDF:', err);
    setError('Impossible de charger le document PDF.');
    setIsLoading(false);
  }, []);

  const goToPdfPage = useCallback((page: number) => {
    const p = Math.max(1, Math.min(page, numPages));
    setCurrentPage(p);
    setPercentage(numPages > 0 ? Math.round((p / numPages) * 100) : 0);
    onLocationChange?.('', p, numPages, numPages > 0 ? p / numPages : 0);
    
    if (viewMode === 'scroll') {
      const pageEl = pageRefs.current.get(p);
      if (pageEl && scrollRef.current) {
        scrollRef.current.scrollTo({ top: pageEl.offsetTop - 20, behavior: 'smooth' });
      }
    }
  }, [numPages, onLocationChange, viewMode]);

  const handlePdfScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (viewMode !== 'scroll' || numPages === 0) return;
    const container = e.currentTarget;
    const scrollY = container.scrollTop;
    const containerCenter = scrollY + container.clientHeight / 2;

    let closestPage = currentPage;
    let minDistance = Infinity;

    pageRefs.current.forEach((el, p) => {
      const top = el.offsetTop;
      const height = el.clientHeight;
      const center = top + height / 2;
      const distance = Math.abs(center - containerCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestPage = p;
      }
    });

    if (closestPage !== currentPage) {
      setCurrentPage(closestPage);
      setPercentage(Math.round((closestPage / numPages) * 100));
      onLocationChange?.('', closestPage, numPages, closestPage / numPages);
    }
  }, [viewMode, numPages, currentPage, onLocationChange]);

  const pdfNextPage = useCallback(() => {
    goToPdfPage(viewMode === 'double' ? Math.min(currentPage + 2, numPages) : currentPage + 1);
  }, [goToPdfPage, currentPage, numPages, viewMode]);

  const pdfPrevPage = useCallback(() => {
    goToPdfPage(viewMode === 'double' ? Math.max(currentPage - 2, 1) : currentPage - 1);
  }, [goToPdfPage, currentPage, viewMode]);

  const zoomIn = useCallback(() => setScale(s => Math.min(3, +(s + 0.25).toFixed(2))), []);
  const zoomOut = useCallback(() => setScale(s => Math.max(0.5, +(s - 0.25).toFixed(2))), []);
  const resetZoom = useCallback(() => setScale(1.0), []);

  // Extraction texte PDF
  const extractTextFromDOM = useCallback((pageEl: HTMLDivElement | null) => {
    if (!onPageTextChange || !pageEl) return;
    const timer = setTimeout(() => {
      const textLayer = pageEl.querySelector('.react-pdf__Page__textContent');
      const text = textLayer ? (textLayer.textContent || '').replace(/\s+/g, ' ').trim() : '';
      onPageTextChange(text);
    }, 300);
    return () => clearTimeout(timer);
  }, [onPageTextChange]);

  // ContainerWidth responsive
  useEffect(() => {
    if (format !== 'pdf') return;
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) setContainerWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [format]);

  const pageWidth = useMemo(() => {
    const maxWidth = viewMode === 'double'
      ? (containerWidth - 48) / 2
      : containerWidth * 0.92;
    return maxWidth * scale;
  }, [containerWidth, scale, viewMode]);

  // PDF annotations — sélection de texte
  const handlePdfMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) return;
    const text = selection.toString().trim();
    if (text.length < 2) return;
    const range = selection.getRangeAt(0);
    let selectedPage = currentPage;
    pageRefs.current.forEach((el, p) => {
      if (el.contains(range.startContainer)) selectedPage = p;
    });
    setPdfContextMenu({ x: e.clientX, y: e.clientY - 12, text, page: selectedPage });
  }, [currentPage]);

  const addPdfHighlight = useCallback((color: string, note?: string) => {
    if (!pdfContextMenu) return;
    const selection = window.getSelection();
    const pageEl = pageRefs.current.get(pdfContextMenu.page);
    let rects: PDFHighlightRect[] = [];
    if (selection && selection.rangeCount && pageEl) {
      const pageRect = pageEl.getBoundingClientRect();
      const clientRects = Array.from(selection.getRangeAt(0).getClientRects());
      rects = clientRects.filter(r => r.width > 2).map(r => ({
        top: ((r.top - pageRect.top) / pageRect.height) * 100,
        left: ((r.left - pageRect.left) / pageRect.width) * 100,
        width: (r.width / pageRect.width) * 100,
        height: (r.height / pageRect.height) * 100,
      }));
      selection.removeAllRanges();
    }
    const highlight: PDFHighlight = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15), page: pdfContextMenu.page, text: pdfContextMenu.text,
      color, note, rects, createdAt: new Date(),
    };
    setHighlights(prev => [...prev, highlight]);
    setPdfContextMenu(null);
    setNoteInput('');
    setShowNoteInput(false);
    if (userId && bookId) {
      saveEpubAnnotation(userId, bookId, {
        cfi: `pdf:page:${pdfContextMenu.page}:${JSON.stringify(rects)}`,
        text: pdfContextMenu.text, color, note, page: pdfContextMenu.page,
      });
    }
  }, [pdfContextMenu, userId, bookId]);

  const removePdfHighlight = useCallback((id: string) => {
    setHighlights(prev => prev.filter(h => h.id !== id));
    deleteEpubAnnotation(id);
  }, []);

  // ═══════════════════════════════════════════════════════
  // ███ EPUB ENGINE ██████████████████████████████████████
  // ═══════════════════════════════════════════════════════

  const applyEpubTheme = useCallback((rendition: Rendition, prefs: typeof preferences) => {
    const theme = READING_THEMES[prefs.theme];
    const font = READING_FONTS[prefs.font];
    const margin = READING_MARGINS[prefs.margin];
    rendition.themes.default({
      'body': {
        'background-color': `${theme.bg} !important`,
        'color': `${theme.text} !important`,
        'font-family': `${font.css} !important`,
        'font-size': `${prefs.fontSize}px !important`,
        'line-height': `${prefs.lineHeight} !important`,
        'text-align': prefs.justified ? 'justify !important' : 'left !important',
        'padding': `0 ${margin.value}px !important`,
        'transition': 'background-color 0.3s ease, color 0.3s ease',
      },
      'p': {
        'font-family': `${font.css} !important`,
        'font-size': `${prefs.fontSize}px !important`,
        'line-height': `${prefs.lineHeight} !important`,
      },
      'img': { 'max-width': '100% !important', 'height': 'auto !important' },
    });
  }, []);

  useEffect(() => {
    if (format !== 'epub' || !viewerRef.current) return;

    let isCancelled = false;
    let localToc: TocItem[] = [];

    async function initEpub() {
      try {
        let bookData: string | ArrayBuffer = src;
        
        // Téléchargement préalable pour éviter les bugs de epub.js avec les URLs signées / CORS
        if (typeof src === 'string' && src.startsWith('http')) {
          const res = await fetch(src);
          if (!res.ok) throw new Error(`Impossible de télécharger l'EPUB (Erreur ${res.status})`);
          bookData = await res.arrayBuffer();
        }

        if (isCancelled) return;

        const book = ePub(bookData as any);
        bookRef.current = book;

        const rendition = book.renderTo(viewerRef.current!, {
          width: '100%', height: '100%',
          flow: preferences.mode === 'paginated' ? 'paginated' : 'scrolled-doc',
          spread: 'none', snap: true,
        });
        renditionRef.current = rendition;
        applyEpubTheme(rendition, preferences);

        if (initialCfi) rendition.display(initialCfi);
        else rendition.display();

        await book.ready;
        if (isCancelled) return;

        setIsLoading(false);
        const meta = book.packaging.metadata;
        setMetadata(meta);
        
        const navigation = book.navigation;
        if (navigation?.toc) {
          localToc = parseToc(navigation.toc);
          setToc(localToc);
        }

        await book.locations.generate(1024);
        if (isCancelled) return;
        setTotalPages(book.locations.length());

        rendition.on('locationChanged', (location: any) => {
          const cfi = location.start.cfi;
          setCurrentCfi(cfi);
          setAtStart(location.atStart ?? false);
          setAtEnd(location.atEnd ?? false);
          
          let pct = 0;
          let isValidLocPct = false;

          if (location.start.percentage && location.start.percentage > 0) {
            pct = location.start.percentage;
            isValidLocPct = true;
          }

          if (!isValidLocPct && book.locations.length() > 0) {
            const locPct = book.locations.percentageFromCfi(cfi);
            if (locPct !== null && locPct > 0) {
              pct = locPct;
              isValidLocPct = true;
            }
          }

          if (!isValidLocPct) {
            const section = book.spine.get(cfi);
            if (section) {
              const index = section.index;
              const totalItems = (book.spine as any).length || (book.spine as any).spineItems?.length || 1;
              let chapterProgress = 0;
              if (location.start.displayed && location.start.displayed.total > 0) {
                // Progression à l'intérieur du chapitre
                chapterProgress = (location.start.displayed.page - 1) / location.start.displayed.total;
              }
              pct = (index + chapterProgress) / totalItems;
            }
          }

          const totalLocs = book.locations.length() || (book.spine as any).length || 1;
          const page = Math.max(1, Math.ceil(pct * totalLocs));
          setCurrentPage(page);
          setPercentage(Math.round(pct * 100));
          onLocationChange?.(cfi, page, totalLocs, pct);

          const section = book.spine.get(cfi);
          if (section) {
            const tocItem = findTocItemByHref(localToc, section.href);
            if (tocItem) setCurrentChapter(tocItem.label);
          }
        });

        rendition.on('selected', (cfi: string, Contents: any) => {
          const selection = Contents.window.getSelection();
          if (selection && selection.toString().trim()) {
            setSelectedText(selection.toString().trim());
            setSelectedCfi(cfi);
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            const iframe = viewerRef.current?.querySelector('iframe');
            const iframeRect = iframe?.getBoundingClientRect() || { left: 0, top: 0 };
            setContextMenuPos({
              x: rect.left + iframeRect.left + rect.width / 2,
              y: rect.top + iframeRect.top - 10,
            });
            setShowContextMenu(true);
          }
        });

        rendition.on('markClicked', () => setShowContextMenu(false));

        rendition.on('keyup', (e: KeyboardEvent) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') rendition.next();
          if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') rendition.prev();
        });

      } catch (err: any) {
        if (!isCancelled) {
          console.error("EPUB Load Error:", err);
          setError(`Erreur de chargement : ${err.message}`);
          setIsLoading(false);
        }
      }
    }

    initEpub();

    return () => {
      isCancelled = true;
      if (renditionRef.current) renditionRef.current.destroy();
      if (bookRef.current) bookRef.current.destroy();
      bookRef.current = null;
      renditionRef.current = null;
    };
  }, [src, format]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (format === 'epub' && renditionRef.current) applyEpubTheme(renditionRef.current, preferences);
  }, [preferences, applyEpubTheme, format]);

  // ─── EPUB Navigation ─────────────────────────────────
  const epubNext = useCallback(() => renditionRef.current?.next(), []);
  const epubPrev = useCallback(() => renditionRef.current?.prev(), []);
  const goToTocItem = useCallback((href: string) => {
    renditionRef.current?.display(href);
    setShowToc(false);
  }, []);
  const goToPercentage = useCallback((pct: number) => {
    if (!bookRef.current || !renditionRef.current) return;
    const targetPct = pct / 100;
    
    let cfi = '';
    if (bookRef.current.locations.length() > 0) {
      cfi = bookRef.current.locations.cfiFromPercentage(targetPct);
    }
    
    if (!cfi) {
      const totalItems = (bookRef.current.spine as any).length || (bookRef.current.spine as any).spineItems?.length || 1;
      const targetIndex = Math.min(Math.floor(targetPct * totalItems), totalItems - 1);
      const section = bookRef.current.spine.get(targetIndex);
      if (section) cfi = section.href;
    }
    
    if (cfi) renditionRef.current.display(cfi);
  }, []);

  // ─── EPUB Highlights ─────────────────────────────────
  const addEpubHighlight = useCallback((color: string) => {
    if (!selectedCfi || !selectedText || !renditionRef.current) return;
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    const annotation: AnnotationData = {
      id, cfi: selectedCfi, text: selectedText, color,
      chapter: currentChapter, createdAt: new Date(),
    };
    renditionRef.current.annotations.highlight(
      selectedCfi, {}, () => {}, 'hl',
      { fill: color, 'fill-opacity': '0.35', 'mix-blend-mode': 'multiply' }
    );
    setAnnotations(prev => [...prev, annotation]);
    setShowContextMenu(false);
    setSelectedText('');
    setSelectedCfi('');
    if (userId) {
      saveEpubAnnotation(userId, bookId, {
        cfi: selectedCfi, text: selectedText, color,
        chapter: currentChapter, page: currentPage,
      }).then(dbId => {
        if (dbId) setAnnotations(prev => prev.map(a => a.id === id ? { ...a, id: dbId } : a));
      });
    }
  }, [selectedCfi, selectedText, currentChapter, userId, bookId, currentPage]);

  // ─── EPUB Bookmarks ──────────────────────────────────
  const isCurrentPageBookmarked = useMemo(() => bookmarks.some(b => b.cfi === currentCfi), [bookmarks, currentCfi]);
  const toggleBookmark = useCallback(() => {
    if (isCurrentPageBookmarked) {
      const bm = bookmarks.find(b => b.cfi === currentCfi);
      setBookmarks(prev => prev.filter(b => b.cfi !== currentCfi));
      if (userId && bm) deleteEpubBookmark(bm.id);
    } else {
      const tempId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
      const bookmark: BookmarkData = { id: tempId, cfi: currentCfi, label: `${currentChapter} — Page ${currentPage}`, createdAt: new Date() };
      setBookmarks(prev => [...prev, bookmark]);
      if (userId) {
        saveEpubBookmark(userId, bookId, { cfi: currentCfi, label: bookmark.label, page: currentPage })
          .then(dbId => { if (dbId) setBookmarks(prev => prev.map(b => b.id === tempId ? { ...b, id: dbId } : b)); });
      }
    }
  }, [currentCfi, currentChapter, currentPage, isCurrentPageBookmarked, bookmarks, userId, bookId]);

  // ─── EPUB Search ─────────────────────────────────────
  const handleSearch = useCallback(async () => {
    if (!bookRef.current || !searchQuery.trim()) return;
    const results: Array<{ cfi: string; excerpt: string }> = [];
    const spine = bookRef.current.spine;
    // @ts-expect-error - epub.js types are incomplete
    for (const item of spine.items) {
      if (!item) continue;
      try {
        await item.load(bookRef.current.load.bind(bookRef.current));
        const found = await item.find(searchQuery);
        if (found?.length > 0) results.push(...found.map((r: { cfi: string; excerpt: string }) => ({ cfi: r.cfi, excerpt: r.excerpt })));
        item.unload();
      } catch { /* skip */ }
    }
    setSearchResults(results);
  }, [searchQuery]);

  // ─── Touch Gestures ──────────────────────────────────
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;
    const viewerWidth = (format === 'epub' ? viewerRef : containerRef).current?.clientWidth || 1;
    if (Math.abs(dx) > 50 && Math.abs(dy) < 80 && dt < 300) {
      if (dx < 0) format === 'epub' ? epubNext() : pdfNextPage();
      else format === 'epub' ? epubPrev() : pdfPrevPage();
      touchStartRef.current = null;
      return;
    }
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && dt < 200) {
      const tapX = touch.clientX;
      const third = viewerWidth / 3;
      if (tapX < third) format === 'epub' ? epubPrev() : pdfPrevPage();
      else if (tapX > third * 2) format === 'epub' ? epubNext() : pdfNextPage();
      else setShowUI(prev => !prev);
    }
    touchStartRef.current = null;
  }, [format, epubNext, epubPrev, pdfNextPage, pdfPrevPage]);

  // ─── Keyboard shortcuts ──────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showGoToPage || showSearch) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        format === 'epub' ? epubNext() : pdfNextPage();
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        format === 'epub' ? epubPrev() : pdfPrevPage();
      }
      if (format === 'pdf') {
        if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomIn(); }
        if (e.key === '-') { e.preventDefault(); zoomOut(); }
        if (e.key === '0') { e.preventDefault(); resetZoom(); }
      }
      if (e.key === 'Escape') {
        setShowSettings(false);
        setShowToc(false);
        setShowBookmarks(false);
        setShowAnnotations(false);
        setShowSearch(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [format, epubNext, epubPrev, pdfNextPage, pdfPrevPage, zoomIn, zoomOut, resetZoom, showGoToPage, showSearch]);

  // ─── TTS pour EPUB & PDF ─────────────────────────────
  const extractEpubPageText = useCallback((): string => {
    const iframe = viewerRef.current?.querySelector('iframe');
    return (iframe?.contentDocument?.body?.textContent || '').replace(/\s+/g, ' ').trim();
  }, []);

  const extractPdfPageText = useCallback((): string => {
    const pageEl = pageRefs.current.get(currentPage);
    if (!pageEl) return '';
    const textLayer = pageEl.querySelector('.react-pdf__Page__textContent');
    return textLayer ? (textLayer.textContent || '').replace(/\s+/g, ' ').trim() : '';
  }, [currentPage]);

  const speakCurrentEpubPage = useCallback(() => {
    const text = extractEpubPageText();
    if (!text) return;
    speak(text, {
      lang: 'fr-FR', rate: 0.9,
      onEnd: () => {
        if (!autoReadRef.current) return;
        if (atEnd) { autoReadRef.current = false; setIsAutoRead(false); return; }
        awaitingAutoSpeakRef.current = true;
        renditionRef.current?.next();
      },
    });
  }, [extractEpubPageText, speak, atEnd]);

  const speakCurrentPdfPage = useCallback(() => {
    const text = extractPdfPageText();
    if (!text) return;
    speak(text, {
      lang: 'fr-FR', rate: 0.9,
      onEnd: () => {
        if (!autoReadRef.current) return;
        if (currentPage >= numPages) {
          autoReadRef.current = false;
          setIsAutoRead(false);
          return;
        }
        awaitingAutoSpeakRef.current = true;
        goToPdfPage(currentPage + 1);
      },
    });
  }, [extractPdfPageText, speak, currentPage, numPages, goToPdfPage]);

  // Auto-read continuation for EPUB page changes
  useEffect(() => {
    if (!awaitingAutoSpeakRef.current || format !== 'epub') return;
    const timer = setTimeout(() => {
      awaitingAutoSpeakRef.current = false;
      if (autoReadRef.current) speakCurrentEpubPage();
    }, 600);
    return () => clearTimeout(timer);
  }, [currentCfi, speakCurrentEpubPage, format]);

  // Auto-read continuation for PDF page changes
  useEffect(() => {
    if (!awaitingAutoSpeakRef.current || format !== 'pdf') return;
    const timer = setTimeout(() => {
      awaitingAutoSpeakRef.current = false;
      if (autoReadRef.current) speakCurrentPdfPage();
    }, 600);
    return () => clearTimeout(timer);
  }, [currentPage, speakCurrentPdfPage, format]);

  const toggleAutoRead = useCallback(() => {
    if (isAutoRead || isSpeaking) {
      stopSpeech();
      autoReadRef.current = false;
      awaitingAutoSpeakRef.current = false;
      setIsAutoRead(false);
      return;
    }
    autoReadRef.current = true;
    setIsAutoRead(true);
    if (format === 'epub') speakCurrentEpubPage();
    else if (format === 'pdf') speakCurrentPdfPage();
  }, [isAutoRead, isSpeaking, stopSpeech, speakCurrentEpubPage, speakCurrentPdfPage, format]);

  // ─── Partage citation ────────────────────────────────
  const shareQuote = useCallback(async () => {
    if (!selectedText) return;
    const title = format === 'epub' ? metadata?.title : bookTitle;
    const author = format === 'epub' ? metadata?.creator : bookAuthor;
    const quote = `"${selectedText}"\n— ${title || 'Livre'}, ${author || ''}`;
    if (navigator.share) {
      try { await navigator.share({ text: quote }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(quote);
    }
    setShowContextMenu(false);
  }, [selectedText, metadata, format, bookTitle, bookAuthor]);

  // ─── API externe (ref) ──────────────────────────────
  useImperativeHandle(ref, () => ({
    nextPage: format === 'pdf' ? pdfNextPage : () => epubNext(),
    prevPage: format === 'pdf' ? pdfPrevPage : () => epubPrev(),
    goToPage: format === 'pdf' ? goToPdfPage : (p: number) => goToPercentage((p / totalPages) * 100),
    getCurrentPage: () => currentPage,
    getNumPages: () => format === 'pdf' ? numPages : totalPages,
  }), [format, pdfNextPage, pdfPrevPage, goToPdfPage, epubNext, epubPrev, goToPercentage, currentPage, numPages, totalPages]);

  // Pages à rendre (PDF)
  const pagesToRender = format === 'pdf' ? (
    viewMode === 'scroll'
      ? Array.from({ length: numPages }, (_, i) => i + 1)
      : viewMode === 'double'
        ? [currentPage, Math.min(currentPage + 1, numPages)].filter((v, i, a) => a.indexOf(v) === i)
        : [currentPage]
  ) : [];

  const progressPercent = format === 'pdf'
    ? (numPages > 0 ? Math.round((currentPage / numPages) * 100) : 0)
    : percentage;

  const displayTitle = format === 'epub' ? (metadata?.title || bookTitle || 'Chargement...') : (bookTitle || 'Document');
  const displayChapter = format === 'epub' ? currentChapter : `Page ${currentPage}`;

  // ─── Thème global ────────────────────────────────────
  const themeStyle = {
    backgroundColor: currentTheme.bg,
    color: currentTheme.text,
    ...(format === 'epub' ? { filter: `brightness(${preferences.brightness})` } : {}),
  };

  // ═══════════════════════════════════════════════════════
  // ███ RENDU ████████████████████████████████████████████
  // ═══════════════════════════════════════════════════════

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4" style={themeStyle}>
        <AlertCircle size={48} className="text-red-400" />
        <p className="text-red-500 font-medium text-lg">{error}</p>
        <p className="text-sm" style={{ color: currentTheme.mutedText }}>Vérifiez que le fichier est accessible.</p>
        <button onClick={onBack} className="mt-4 px-6 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: currentTheme.accent }}>
          ← Retour
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col select-none" style={themeStyle}>

      {/* ─── HEADER Readest-style ──────────────────────── */}
      <AnimatePresence>
        {showUI && (
          <motion.header
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2.5 backdrop-blur-xl border-b"
            style={{
              backgroundColor: currentTheme.headerBg,
              borderColor: currentTheme.headerBorder,
            }}
          >
            {/* Gauche : retour */}
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-70 flex-shrink-0"
              style={{ color: currentTheme.accent }}
            >
              <ArrowLeft size={18} />
              <span className="hidden sm:inline">Bibliothèque</span>
            </button>

            {/* Centre : titre + chapitre */}
            <div className="flex-1 text-center mx-4 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: currentTheme.text }}>
                {displayTitle}
              </p>
              <p className="text-xs truncate" style={{ color: currentTheme.mutedText }}>
                {displayChapter}
              </p>
            </div>

            {/* Droite : actions */}
            <div className="flex items-center gap-0.5">
              {/* TTS */}
              {speechSupported && (
                <button
                  onClick={toggleAutoRead}
                  className="p-2 rounded-lg transition-colors"
                  style={{
                    backgroundColor: isAutoRead ? currentTheme.accent : 'transparent',
                    color: isAutoRead ? '#fff' : currentTheme.accent,
                  }}
                  title={isAutoRead ? 'Arrêter la lecture' : 'Lecture vocale'}
                >
                  {isAutoRead ? <StopCircle size={17} /> : <Volume2 size={17} />}
                </button>
              )}

              {/* Recherche (EPUB) */}
              {format === 'epub' && (
                <button onClick={() => setShowSearch(true)} className="p-2 rounded-lg transition-colors hover:bg-black/5" title="Rechercher">
                  <Search size={17} style={{ color: currentTheme.accent }} />
                </button>
              )}

              {/* TOC (EPUB) */}
              {format === 'epub' && (
                <button onClick={() => setShowToc(true)} className="p-2 rounded-lg transition-colors hover:bg-black/5" title="Sommaire">
                  <List size={17} style={{ color: currentTheme.accent }} />
                </button>
              )}

              {/* Marque-page (EPUB) */}
              {format === 'epub' && (
                <button onClick={toggleBookmark} className="p-2 rounded-lg transition-colors hover:bg-black/5" title="Marque-page">
                  {isCurrentPageBookmarked
                    ? <BookmarkCheck size={17} style={{ color: currentTheme.accent }} />
                    : <Bookmark size={17} style={{ color: currentTheme.accent }} />}
                </button>
              )}

              {/* Annotations */}
              <button
                onClick={() => setShowAnnotations(true)}
                className="p-2 rounded-lg transition-colors hover:bg-black/5 relative"
                title="Annotations"
              >
                <Highlighter size={17} style={{ color: currentTheme.accent }} />
                {(annotations.length > 0 || highlights.length > 0) && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                    style={{ backgroundColor: currentTheme.accent }}>
                    {annotations.length + highlights.length > 9 ? '9+' : annotations.length + highlights.length}
                  </span>
                )}
              </button>

              {/* Paramètres */}
              <button onClick={() => setShowSettings(s => !s)} className="p-2 rounded-lg transition-colors hover:bg-black/5" title="Paramètres">
                <Settings2 size={17} style={{ color: currentTheme.accent }} />
              </button>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* ─── ZONE DE LECTURE ───────────────────────────── */}
      {format === 'epub' ? (
        /* EPUB renderer */
        <div
          className="flex-1 w-full overflow-hidden flex justify-center"
          style={{ paddingTop: showUI ? 52 : 0, paddingBottom: showUI && totalPages > 0 ? 52 : 0, transition: 'padding 0.2s ease' }}
        >
          <div
            ref={viewerRef}
            className="h-full w-full"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            style={{ touchAction: 'pan-y', maxWidth: 900 }}
          />
        </div>
      ) : (
        /* PDF renderer */
        <div
          ref={containerRef}
          className="flex-1 flex flex-col overflow-hidden"
          style={{ ...themeStyle, paddingTop: showUI ? 52 : 0, paddingBottom: showUI && totalPages > 0 ? 52 : 0, transition: 'padding 0.2s ease' }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Barre de contrôles PDF */}
          <AnimatePresence>
            {showUI && (
              <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -50, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 border-b"
                style={{
                  backgroundColor: currentTheme.headerBg,
                  borderColor: currentTheme.headerBorder,
                }}
              >
                <div className="flex items-center gap-1.5">
                  <button onClick={pdfPrevPage} disabled={currentPage <= 1}
                    className="p-1.5 rounded-lg transition-all disabled:opacity-20 hover:scale-105"
                    style={{ color: currentTheme.accent }}>
                    <ChevronLeft size={16} />
                  </button>
                  <button onClick={() => setShowGoToPage(true)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
                    style={{ backgroundColor: `${currentTheme.text}08`, color: currentTheme.text }}>
                    <span>{currentPage}</span>
                    <span style={{ color: currentTheme.mutedText }}>/ {numPages}</span>
                  </button>
                  <button onClick={pdfNextPage} disabled={currentPage >= numPages}
                    className="p-1.5 rounded-lg transition-all disabled:opacity-20 hover:scale-105"
                    style={{ color: currentTheme.accent }}>
                    <ChevronRight size={16} />
                  </button>
                </div>

                <div className="w-px h-5 mx-1" style={{ backgroundColor: currentTheme.headerBorder }} />

                <div className="flex items-center gap-1">
                  <button onClick={zoomOut} className="p-1.5 rounded-lg hover:bg-black/5" style={{ color: currentTheme.text }}>
                    <ZoomOut size={15} />
                  </button>
                  <button onClick={resetZoom} className="px-2 py-1 rounded-lg text-xs font-mono hover:bg-black/5"
                    style={{ color: currentTheme.mutedText }}>
                    {Math.round(scale * 100)}%
                  </button>
                  <button onClick={zoomIn} className="p-1.5 rounded-lg hover:bg-black/5" style={{ color: currentTheme.text }}>
                    <ZoomIn size={15} />
                  </button>
                </div>

                <div className="w-px h-5 mx-1" style={{ backgroundColor: currentTheme.headerBorder }} />

                <button
                  onClick={() => setViewMode(viewMode === 'single' ? 'scroll' : viewMode === 'scroll' ? 'double' : 'single')}
                  className="p-1.5 rounded-lg hover:bg-black/5"
                  style={{ color: currentTheme.accent }}
                  title={viewMode === 'single' ? 'Mode défilement' : viewMode === 'scroll' ? 'Double page' : 'Page unique'}>
                  {viewMode === 'single' ? <FileText size={15} /> : viewMode === 'scroll' ? <Columns size={15} /> : <FileText size={15} />}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Document PDF */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-auto flex justify-center"
            style={{ scrollBehavior: 'smooth' }}
            onScroll={handlePdfScroll}
            onMouseUp={handlePdfMouseUp}
            onClick={() => { if (pdfContextMenu) setPdfContextMenu(null); }}
          >
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 size={32} className="animate-spin" style={{ color: currentTheme.accent }} />
                <p className="text-sm" style={{ color: currentTheme.mutedText }}>Chargement du PDF...</p>
              </div>
            )}
            <Document
              file={src}
              onLoadSuccess={onPdfLoadSuccess}
              onLoadError={onPdfLoadError}
              loading={null}
              className={`flex ${viewMode === 'scroll' ? 'flex-col items-center' : 'flex-row items-start justify-center'} gap-4 py-4`}
            >
              {pagesToRender.map((p) => (
                <div key={p} className="relative group" ref={el => { if (el) pageRefs.current.set(p, el); else pageRefs.current.delete(p); }}>
                  <Page
                    pageNumber={p}
                    width={pageWidth}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    onRenderSuccess={() => {
                      if (p === currentPage) extractTextFromDOM(pageRefs.current.get(p) ?? null);
                    }}
                    className="shadow-xl rounded-lg overflow-hidden transition-shadow hover:shadow-2xl"
                    loading={
                      <div className="flex items-center justify-center rounded-lg animate-pulse"
                        style={{ width: pageWidth, height: pageWidth * 1.41, backgroundColor: `${currentTheme.text}08` }}>
                        <Loader2 size={24} className="animate-spin" style={{ color: currentTheme.mutedText }} />
                      </div>
                    }
                  />
                  {/* Surlignages PDF */}
                  {highlights.filter(h => h.page === p).map(h => (
                    <React.Fragment key={h.id}>
                      {h.rects.map((rect, ri) => (
                        <div key={ri} className="absolute pointer-events-none rounded-sm"
                          style={{
                            top: `${rect.top}%`, left: `${rect.left}%`,
                            width: `${rect.width}%`, height: `${rect.height}%`,
                            backgroundColor: h.color, opacity: 0.4, mixBlendMode: 'multiply',
                          }} />
                      ))}
                    </React.Fragment>
                  ))}
                  {/* Watermark DRM */}
                  {userEmail && (
                    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden rounded-lg" style={{ opacity: 0.04 }}>
                      <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-16 -rotate-45"
                        style={{ fontSize: '14px', color: currentTheme.text, fontFamily: 'monospace' }}>
                        {Array.from({ length: 12 }, (_, i) => <span key={i} className="whitespace-nowrap">{userEmail}</span>)}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </Document>
          </div>
        </div>
      )}

      {/* ─── Navigation latérale (desktop) ────────────── */}
      {format === 'epub' && (
        <>
          <button onClick={() => epubPrev()} disabled={atStart}
            className="hidden md:flex fixed left-3 top-1/2 -translate-y-1/2 z-40 w-10 h-10 items-center justify-center rounded-full transition-all hover:scale-110 disabled:opacity-0"
            style={{ backgroundColor: `${currentTheme.text}10`, color: currentTheme.text }}>
            <ChevronLeft size={22} />
          </button>
          <button onClick={() => epubNext()} disabled={atEnd}
            className="hidden md:flex fixed right-3 top-1/2 -translate-y-1/2 z-40 w-10 h-10 items-center justify-center rounded-full transition-all hover:scale-110 disabled:opacity-0"
            style={{ backgroundColor: `${currentTheme.text}10`, color: currentTheme.text }}>
            <ChevronRight size={22} />
          </button>
        </>
      )}
      {format === 'pdf' && viewMode !== 'scroll' && (
        <>
          <button onClick={pdfPrevPage} disabled={currentPage <= 1}
            className="hidden md:flex fixed left-3 top-1/2 -translate-y-1/2 z-40 w-10 h-10 items-center justify-center rounded-full transition-all hover:scale-110 disabled:opacity-0"
            style={{ backgroundColor: `${currentTheme.text}10`, color: currentTheme.text }}>
            <ChevronLeft size={22} />
          </button>
          <button onClick={pdfNextPage} disabled={currentPage >= numPages}
            className="hidden md:flex fixed right-3 top-1/2 -translate-y-1/2 z-40 w-10 h-10 items-center justify-center rounded-full transition-all hover:scale-110 disabled:opacity-0"
            style={{ backgroundColor: `${currentTheme.text}10`, color: currentTheme.text }}>
            <ChevronRight size={22} />
          </button>
        </>
      )}

      {/* ─── FOOTER Readest-style ─────────────────────── */}
      <AnimatePresence>
        {showUI && totalPages > 0 && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-0 left-0 right-0 z-50 px-4 py-2.5 backdrop-blur-xl border-t"
            style={{ backgroundColor: currentTheme.headerBg, borderColor: currentTheme.headerBorder }}
          >
            <input
              type="range"
              min={format === 'epub' ? 0 : 1}
              max={format === 'epub' ? 100 : numPages}
              value={format === 'epub' ? percentage : currentPage}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (format === 'epub') goToPercentage(val);
                else goToPdfPage(val);
              }}
              className="w-full h-1 rounded-full appearance-none cursor-pointer mb-1.5"
              style={{
                background: `linear-gradient(to right, ${currentTheme.accent} ${progressPercent}%, ${currentTheme.headerBorder} ${progressPercent}%)`,
              }}
            />
            <div className="flex items-center justify-between text-xs" style={{ color: currentTheme.mutedText }}>
              <span>
                {format === 'pdf' ? `Page ${currentPage} / ${numPages}` : `${percentage}%`}
              </span>
              <span>{progressPercent}% lu</span>
              {userEmail && format === 'pdf' && (
                <div className="flex items-center gap-1" style={{ color: currentTheme.accent }}>
                  <Fingerprint size={11} />
                  <span>Protégé</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════ */}
      {/* ███ PANNEAUX OVERLAY ████████████████████████████ */}
      {/* ═══════════════════════════════════════════════════ */}

      {/* ─── Panneau Paramètres ───────────────────────── */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/30" onClick={() => setShowSettings(false)} />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[61] max-h-[70vh] overflow-y-auto rounded-t-3xl shadow-2xl"
              style={{ backgroundColor: currentTheme.bg, borderTop: `1px solid ${currentTheme.headerBorder}` }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full" style={{ backgroundColor: currentTheme.headerBorder }} />
              </div>

              <div className="px-6 pb-8 space-y-6">
                <p className="text-lg font-bold" style={{ color: currentTheme.text }}>Paramètres de lecture</p>

                {/* Thèmes */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: currentTheme.mutedText }}>Thème</p>
                  <div className="flex gap-2 flex-wrap">
                    {(Object.entries(READING_THEMES) as [ReadingTheme, typeof currentTheme][]).map(([key, t]) => (
                      <button key={key} onClick={() => setTheme(key)}
                        className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all"
                        style={{
                          backgroundColor: preferences.theme === key ? `${t.accent}15` : 'transparent',
                          border: `2px solid ${preferences.theme === key ? t.accent : 'transparent'}`,
                        }}>
                        <div className="w-8 h-8 rounded-full border" style={{ backgroundColor: t.bg, borderColor: t.headerBorder }} />
                        <span className="text-[10px] font-medium" style={{ color: currentTheme.text }}>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Taille police */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: currentTheme.mutedText }}>
                    Taille du texte — {preferences.fontSize}px
                  </p>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setFontSize(preferences.fontSize - 1)} className="p-2 rounded-lg" style={{ backgroundColor: `${currentTheme.text}08` }}>
                      <Minus size={16} style={{ color: currentTheme.text }} />
                    </button>
                    <input type="range" min={12} max={32} value={preferences.fontSize}
                      onChange={e => setFontSize(Number(e.target.value))}
                      className="flex-1 h-1 rounded-full appearance-none"
                      style={{ accentColor: currentTheme.accent }} />
                    <button onClick={() => setFontSize(preferences.fontSize + 1)} className="p-2 rounded-lg" style={{ backgroundColor: `${currentTheme.text}08` }}>
                      <Plus size={16} style={{ color: currentTheme.text }} />
                    </button>
                  </div>
                </div>

                {/* Polices */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: currentTheme.mutedText }}>Police</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.entries(READING_FONTS) as [ReadingFont, typeof currentFont][]).map(([key, f]) => (
                      <button key={key} onClick={() => setFont(key)}
                        className="px-3 py-2 rounded-xl text-xs font-medium transition-all"
                        style={{
                          fontFamily: f.css,
                          backgroundColor: preferences.font === key ? currentTheme.accent : `${currentTheme.text}08`,
                          color: preferences.font === key ? '#fff' : currentTheme.text,
                        }}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Interligne */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: currentTheme.mutedText }}>
                    Interligne — {preferences.lineHeight.toFixed(1)}
                  </p>
                  <input type="range" min={1.2} max={2.5} step={0.1} value={preferences.lineHeight}
                    onChange={e => setLineHeight(Number(e.target.value))}
                    className="w-full h-1 rounded-full appearance-none"
                    style={{ accentColor: currentTheme.accent }} />
                </div>

                {/* Marges */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: currentTheme.mutedText }}>Marges</p>
                  <div className="flex gap-2">
                    {(Object.entries(READING_MARGINS) as [ReadingMargin, typeof currentMargin][]).map(([key, m]) => (
                      <button key={key} onClick={() => setMargin(key)}
                        className="flex-1 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                        style={{
                          backgroundColor: preferences.margin === key ? currentTheme.accent : `${currentTheme.text}08`,
                          color: preferences.margin === key ? '#fff' : currentTheme.text,
                        }}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Options */}
                <div className="flex gap-2">
                  <button onClick={toggleJustified}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all"
                    style={{
                      backgroundColor: preferences.justified ? currentTheme.accent : `${currentTheme.text}08`,
                      color: preferences.justified ? '#fff' : currentTheme.text,
                    }}>
                    <AlignJustify size={14} /> Justifié
                  </button>
                  {format === 'epub' && (
                    <button onClick={toggleMode}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all"
                      style={{
                        backgroundColor: preferences.mode === 'scroll' ? currentTheme.accent : `${currentTheme.text}08`,
                        color: preferences.mode === 'scroll' ? '#fff' : currentTheme.text,
                      }}>
                      <ScrollText size={14} /> Défilement
                    </button>
                  )}
                  <button onClick={resetDefaults}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all"
                    style={{ backgroundColor: `${currentTheme.text}08`, color: currentTheme.mutedText }}>
                    <RotateCcw size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── Table des matières (EPUB) ────────────────── */}
      <AnimatePresence>
        {showToc && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/30" onClick={() => setShowToc(false)} />
            <motion.div
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 left-0 bottom-0 z-[61] w-80 max-w-[85vw] shadow-2xl overflow-y-auto"
              style={{ backgroundColor: currentTheme.bg, borderRight: `1px solid ${currentTheme.headerBorder}` }}
            >
              <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: currentTheme.headerBorder }}>
                <p className="text-sm font-bold" style={{ color: currentTheme.text }}>Sommaire</p>
                <button onClick={() => setShowToc(false)} className="p-1.5 rounded-lg hover:bg-black/5">
                  <X size={18} style={{ color: currentTheme.mutedText }} />
                </button>
              </div>
              <div className="py-2">
                {toc.length === 0 ? (
                  <p className="px-4 py-8 text-sm text-center" style={{ color: currentTheme.mutedText }}>
                    Pas de table des matières
                  </p>
                ) : (
                  toc.map(item => (
                    <TocEntry key={item.id} item={item} onSelect={goToTocItem} theme={currentTheme} />
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── Recherche (EPUB) ─────────────────────────── */}
      <AnimatePresence>
        {showSearch && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/30" onClick={() => setShowSearch(false)} />
            <motion.div
              initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }}
              className="fixed top-0 left-0 right-0 z-[61] shadow-2xl max-h-[60vh] overflow-hidden flex flex-col"
              style={{ backgroundColor: currentTheme.bg, borderBottom: `1px solid ${currentTheme.headerBorder}` }}
            >
              <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: currentTheme.headerBorder }}>
                <Search size={16} style={{ color: currentTheme.mutedText }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSearch(); if (e.key === 'Escape') setShowSearch(false); }}
                  placeholder="Rechercher dans le livre..."
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{ color: currentTheme.text }}
                  autoFocus
                />
                <button onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }} className="p-1.5 rounded-lg hover:bg-black/5">
                  <X size={16} style={{ color: currentTheme.mutedText }} />
                </button>
              </div>
              <div className="overflow-y-auto">
                {searchResults.map((r, i) => (
                  <button key={i} onClick={() => { renditionRef.current?.display(r.cfi); setShowSearch(false); }}
                    className="w-full text-left px-4 py-3 text-sm border-b hover:bg-black/5 transition-colors"
                    style={{ borderColor: currentTheme.headerBorder, color: currentTheme.text }}>
                    <span dangerouslySetInnerHTML={{ __html: r.excerpt.replace(
                      new RegExp(`(${searchQuery})`, 'gi'),
                      `<mark style="background:${currentTheme.accent}40;padding:1px 2px;border-radius:2px">$1</mark>`
                    )}} />
                  </button>
                ))}
                {searchResults.length === 0 && searchQuery && (
                  <p className="px-4 py-8 text-sm text-center" style={{ color: currentTheme.mutedText }}>
                    Appuie sur Entrée pour rechercher
                  </p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── Annotations Panel ────────────────────────── */}
      <AnimatePresence>
        {showAnnotations && format === 'epub' && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/30" onClick={() => setShowAnnotations(false)} />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 z-[61] w-80 max-w-[85vw] shadow-2xl overflow-y-auto"
              style={{ backgroundColor: currentTheme.bg, borderLeft: `1px solid ${currentTheme.headerBorder}` }}>
              <AnnotationsPanel
                annotations={annotations}
                isOpen={true}
                onGoToAnnotation={(cfi: string) => { renditionRef.current?.display(cfi); setShowAnnotations(false); }}
                onDeleteAnnotation={(id: string) => {
                  renditionRef.current?.annotations.remove(annotations.find(a => a.id === id)?.cfi || '', 'highlight');
                  setAnnotations(prev => prev.filter(a => a.id !== id));
                  deleteEpubAnnotation(id);
                }}
                onAddNote={(id: string, note: string) => {
                  setAnnotations(prev => prev.map(a => a.id === id ? { ...a, note } : a));
                  updateAnnotationNote(id, note);
                }}
                onClose={() => setShowAnnotations(false)}
                theme={currentTheme}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── Bookmarks Panel ──────────────────────────── */}
      <AnimatePresence>
        {showBookmarks && format === 'epub' && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/30" onClick={() => setShowBookmarks(false)} />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 z-[61] w-80 max-w-[85vw] shadow-2xl overflow-y-auto"
              style={{ backgroundColor: currentTheme.bg, borderLeft: `1px solid ${currentTheme.headerBorder}` }}>
              <BookmarksPanel
                bookmarks={bookmarks}
                isOpen={true}
                onGoToBookmark={(cfi: string) => { renditionRef.current?.display(cfi); setShowBookmarks(false); }}
                onDeleteBookmark={(id: string) => {
                  setBookmarks(prev => prev.filter(b => b.id !== id));
                  deleteEpubBookmark(id);
                }}
                onClose={() => setShowBookmarks(false)}
                theme={currentTheme}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── Context Menu (EPUB selection) ────────────── */}
      <AnimatePresence>
        {showContextMenu && format === 'epub' && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed z-[70] rounded-2xl shadow-2xl overflow-hidden"
            style={{
              left: Math.max(16, Math.min(contextMenuPos.x - 130, window.innerWidth - 280)),
              top: Math.max(16, contextMenuPos.y - 110),
              backgroundColor: currentTheme.headerBg,
              border: `1px solid ${currentTheme.headerBorder}`,
              minWidth: 260,
            }}
            onMouseDown={e => e.stopPropagation()}
          >
            <div className="px-3 pt-2 pb-1">
              <p className="text-xs truncate max-w-[220px]" style={{ color: currentTheme.mutedText }}>
                "{selectedText.slice(0, 60)}{selectedText.length > 60 ? '…' : ''}"
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-2 border-b" style={{ borderColor: currentTheme.headerBorder }}>
              {HIGHLIGHT_COLORS.map(c => (
                <button key={c.value} onClick={() => addEpubHighlight(c.value)}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                  style={{ backgroundColor: c.value }} title={c.name}>
                  <Highlighter size={13} className="text-gray-600" />
                </button>
              ))}
            </div>
            <div className="flex items-center gap-0.5 px-2 py-1.5">
              <button onClick={shareQuote} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors hover:bg-black/5"
                style={{ color: currentTheme.text }}>
                <Share2 size={13} /> Partager
              </button>
              <button onClick={() => { navigator.clipboard.writeText(selectedText); setShowContextMenu(false); }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors hover:bg-black/5"
                style={{ color: currentTheme.text }}>
                <Copy size={13} /> Copier
              </button>
              <button onClick={() => { setDictionaryWord(selectedText); setShowDictionary(true); setShowContextMenu(false); }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors hover:bg-black/5"
                style={{ color: currentTheme.text }}>
                <BookOpen size={13} /> Définition
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Context Menu (PDF selection) ─────────────── */}
      <AnimatePresence>
        {pdfContextMenu && format === 'pdf' && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed z-[70] rounded-2xl shadow-2xl overflow-hidden"
            style={{
              left: Math.max(16, Math.min(pdfContextMenu.x - 130, window.innerWidth - 280)),
              top: Math.max(16, pdfContextMenu.y - 110),
              backgroundColor: currentTheme.headerBg,
              border: `1px solid ${currentTheme.headerBorder}`,
              minWidth: 260,
            }}
            onMouseDown={e => e.stopPropagation()}
          >
            <div className="px-3 pt-2 pb-1">
              <p className="text-xs truncate max-w-[220px]" style={{ color: currentTheme.mutedText }}>
                "{pdfContextMenu.text.slice(0, 60)}{pdfContextMenu.text.length > 60 ? '…' : ''}"
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-2 border-b" style={{ borderColor: currentTheme.headerBorder }}>
              {HIGHLIGHT_COLORS.map(c => (
                <button key={c.value} onClick={() => addPdfHighlight(c.value, noteInput || undefined)}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                  style={{ backgroundColor: c.value }} title={c.name}>
                  <Highlighter size={13} className="text-gray-600" />
                </button>
              ))}
            </div>
            <div className="flex items-center gap-0.5 px-2 py-1.5">
              <button onClick={() => { navigator.clipboard.writeText(pdfContextMenu.text); setPdfContextMenu(null); }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors hover:bg-black/5"
                style={{ color: currentTheme.text }}>
                <Copy size={13} /> Copier
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Modal Aller à la page (PDF) ──────────────── */}
      <AnimatePresence>
        {showGoToPage && format === 'pdf' && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/40" onClick={() => setShowGoToPage(false)} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[61] p-6 rounded-2xl shadow-2xl w-72"
              style={{ backgroundColor: currentTheme.bg, border: `1px solid ${currentTheme.headerBorder}` }}
            >
              <p className="text-sm font-semibold mb-3" style={{ color: currentTheme.text }}>Aller à la page</p>
              <input
                type="number" min={1} max={numPages}
                placeholder={`1 - ${numPages}`}
                value={goToPageInput}
                onChange={e => setGoToPageInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const p = parseInt(goToPageInput);
                    if (p >= 1 && p <= numPages) { goToPdfPage(p); setShowGoToPage(false); setGoToPageInput(''); }
                  }
                  if (e.key === 'Escape') { setShowGoToPage(false); setGoToPageInput(''); }
                }}
                className="w-full px-4 py-2.5 rounded-xl text-center text-lg font-medium border outline-none"
                style={{ backgroundColor: `${currentTheme.text}08`, borderColor: currentTheme.headerBorder, color: currentTheme.text }}
                autoFocus
              />
              <div className="flex gap-2 mt-3">
                <button onClick={() => { setShowGoToPage(false); setGoToPageInput(''); }}
                  className="flex-1 py-2 rounded-xl text-sm font-medium" style={{ color: currentTheme.mutedText }}>
                  Annuler
                </button>
                <button onClick={() => {
                  const p = parseInt(goToPageInput);
                  if (p >= 1 && p <= numPages) { goToPdfPage(p); setShowGoToPage(false); setGoToPageInput(''); }
                }}
                  className="flex-1 py-2 rounded-xl text-sm font-medium text-white"
                  style={{ backgroundColor: currentTheme.accent }}>
                  Aller
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── Dictionnaire ─────────────────────────────── */}
      <AnimatePresence>
        {showDictionary && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/30" onClick={() => setShowDictionary(false)} />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[61] max-h-[60vh] overflow-y-auto rounded-t-3xl shadow-2xl"
              style={{ backgroundColor: currentTheme.bg, borderTop: `1px solid ${currentTheme.headerBorder}` }}
            >
              <DictionaryPanel word={dictionaryWord} isOpen={true} onClose={() => setShowDictionary(false)} theme={currentTheme} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── Loading overlay ──────────────────────────── */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4"
            style={{ backgroundColor: currentTheme.bg }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            >
              <Loader2 size={36} style={{ color: currentTheme.accent }} />
            </motion.div>
            <p className="text-sm font-medium" style={{ color: currentTheme.mutedText }}>
              {format === 'epub' ? 'Ouverture du livre...' : 'Chargement du document...'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// ─── Sous-composant : entrée TOC récursive ────────────────
function TocEntry({ item, onSelect, theme, depth = 0 }: {
  item: TocItem;
  onSelect: (href: string) => void;
  theme: typeof READING_THEMES.light;
  depth?: number;
}) {
  return (
    <>
      <button
        onClick={() => onSelect(item.href)}
        className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-black/5"
        style={{
          paddingLeft: `${16 + depth * 16}px`,
          color: theme.text,
        }}
      >
        {item.label}
      </button>
      {item.subitems.map(sub => (
        <TocEntry key={sub.id} item={sub} onSelect={onSelect} theme={theme} depth={depth + 1} />
      ))}
    </>
  );
}

export default UnifiedReader;
