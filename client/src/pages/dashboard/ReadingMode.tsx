
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ZoomIn, ZoomOut, Moon, Sun, BookOpen,
  ChevronLeft, ChevronRight, Maximize2, Minimize2,
  FileText, Globe, Bookmark, Volume2, VolumeX, Settings2,
  StickyNote, MessageSquare, Clock, Save, Loader2, Download, WifiOff, Bot,
  PlayCircle, StopCircle
} from 'lucide-react';
import { AIChat } from '@/components/ai/AIChat';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useSpeech } from '@/hooks/useSpeech';
import { useSpeechContext } from '@/contexts/SpeechContext';
import { supabase } from '@/lib/supabase';
import UnifiedReader, { type UnifiedReaderHandle } from '@/components/reader/UnifiedReader';
import { MOCK_BOOKS } from '@/data/mockBooks';
import type { GoogleBook } from '@/services/googleBooksService';
import {
  getReadingProgress,
  saveReadingProgress,
  startReadingSession,
  endReadingSession,
  saveBookNote,
  getBookNotes,
  deleteBookNote,
} from '@/services/readingProgressService';
import { isOfflineReaderBookAvailable, getOfflineReaderBook, updateOfflineReaderProgress } from '@/services/offlineReader';
import { getCachedSignedUrl, setCachedSignedUrl } from '@/services/readerCache';
import { addBorrow, isBookBorrowed } from '@/services/borrowStore';

// ─── Paramètres lecture ───────────────────────────────────
interface ReadingSettings {
  fontSize: number;
  lineHeight: number;
  theme: 'dark' | 'sepia' | 'light';
  fontFamily: 'serif' | 'sans' | 'mono';
  isSpeaking: boolean;
}

interface BookData {
  id: string;
  titre: string;
  auteur: string;
  categorie: string;
  description: string | null;
  pdf_url: string | null;
  read_url?: string | null;
  extract?: string | null;
  cover_url: string | null;
  pages_count: number;
  format: string;
  source?: 'supabase' | 'catalogue';
}

interface NoteData {
  id: string;
  page: number;
  contenu: string;
  type: string;
  couleur: string;
  created_at: string;
}

const THEMES = {
  dark:  { bg: 'bg-slate-900', text: 'text-slate-100', header: 'bg-slate-800/95 border-slate-700', bar: 'bg-slate-700' },
  sepia: { bg: 'bg-amber-50',  text: 'text-stone-800',  header: 'bg-amber-100/95 border-amber-200', bar: 'bg-amber-200' },
  light: { bg: 'bg-white',     text: 'text-slate-900',  header: 'bg-gray-50/95 border-gray-200',    bar: 'bg-gray-200' },
};

const FONTS: Record<string, string> = { serif: 'font-serif', sans: 'font-sans', mono: 'font-mono' };
const READING_MODE_BOOK_STORAGE_KEY = 'bibliotech:reading-mode-book';

type ReadingModeTab = 'pdf' | 'epub' | 'online' | 'extract' | 'chapter' | 'notes';

function isPdfUrl(url?: string | null): boolean {
  return !!url && /\.pdf(\?|$)/i.test(url);
}

function isEpubUrl(url?: string | null): boolean {
  if (!url) return false;
  // Détecte .epub, .epub.images (Gutenberg), .epub.noimages
  return /\.epub(\.images?|\.noimages)?(\?|$)/i.test(url);
}

function getEpubProxyUrl(url: string): string {
  // Toujours charger via le proxy pour éviter les CORS et suivre les redirections
  return `/api/reader/proxy?url=${encodeURIComponent(url)}`;
}

function getExternalReadUrl(book: BookData): string | null {
  if (book.read_url) return book.read_url;
  if (book.pdf_url && !isPdfUrl(book.pdf_url)) return book.pdf_url;
  return null;
}

function getExternalHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function getInternalReaderUrl(url: string): string {
  return `/api/reader/proxy?url=${encodeURIComponent(url)}`;
}

function getDownloadUrl(url: string, title: string): string {
  let extension = '.pdf';
  try {
    const match = new URL(url).pathname.match(/\.[a-z0-9]{2,8}$/i);
    extension = match ? match[0] : extension;
  } catch {
    extension = /\.pdf(\?|$)/i.test(url) ? '.pdf' : extension;
  }

  const filename = `${title || 'bibliotech-document'}${extension}`;
  return `/api/reader/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
}

function getStoredCatalogueBook(bookId: string): GoogleBook | null {
  try {
    const raw = sessionStorage.getItem(READING_MODE_BOOK_STORAGE_KEY);
    const stored = raw ? (JSON.parse(raw) as GoogleBook) : null;
    if (stored?.id === bookId) return stored;
  } catch (error) {
    if (import.meta.env.DEV) console.warn('Impossible de lire le livre mis en cache pour le mode lecture:', error);
  }

  return MOCK_BOOKS.find(candidate => candidate.id === bookId) || null;
}

function mapCatalogueBook(book: GoogleBook): BookData {
  const pdfUrl = isPdfUrl(book.pdfUrl) ? book.pdfUrl! : null;
  const readUrl = book.readUrl || (!isPdfUrl(book.pdfUrl) ? book.pdfUrl : null) || null;

  return {
    id: book.id,
    titre: book.title,
    auteur: book.authors.join(', '),
    categorie: book.category,
    description: book.extract || book.description || null,
    pdf_url: pdfUrl,
    read_url: readUrl,
    extract: book.extract || null,
    cover_url: book.cover || null,
    pages_count: book.pageCount || 0,
    format: pdfUrl ? 'pdf' : isEpubUrl(book.pdfUrl) ? 'epub' : readUrl ? 'web' : 'extrait',
    source: 'catalogue',
  };
}

function normalizeDatabaseBook(data: BookData & { readUrl?: string | null }): BookData {
  return {
    ...data,
    read_url: data.read_url ?? data.readUrl ?? null,
    extract: data.extract ?? null,
    source: 'supabase',
  };
}

function getDefaultMode(book: BookData, hasChapter = false): ReadingModeTab {
  if (isEpubUrl(book.pdf_url)) return 'epub';
  if (isPdfUrl(book.pdf_url)) return 'pdf';
  // read_url peut être un EPUB Gutenberg (.epub.images)
  if (book.read_url && isEpubUrl(book.read_url)) return 'epub';
  if (getExternalReadUrl(book)) return 'online';
  if (hasChapter) return 'chapter';
  return 'extract';
}

// ─── Composant principal ──────────────────────────────────
export default function ReadingMode() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [settings, setSettings] = useState<ReadingSettings>({
    fontSize: 17, lineHeight: 1.8,
    theme: 'sepia', fontFamily: 'serif', isSpeaking: false,
  });
  const [mode, setMode] = useState<ReadingModeTab>('pdf');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [externalLoading, setExternalLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPageText, setCurrentPageText] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);
  const { isSpeaking: speechIsSpeaking, isSupported: speechSupported, speak, stop } = useSpeech();
  const globalSpeech = useSpeechContext();
  const [speechNotice, setSpeechNotice] = useState<string | null>(null);

  // Données du livre
  const [book, setBook] = useState<BookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Notes
  const [notes, setNotes] = useState<NoteData[]>([]);
  const [newNote, setNewNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);
  const [signedEpubUrl, setSignedEpubUrl] = useState<string | null>(null);
  const [savedEpubCfi, setSavedEpubCfi] = useState<string | undefined>(undefined);
  const [offlineBlobUrl, setOfflineBlobUrl] = useState<string | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const pendingSpeechRef = useRef(false);

  // Auto-lecture page par page
  const [isAutoRead, setIsAutoRead] = useState(false);
  const autoReadRef = useRef(false);
  const awaitingNextPageSpeakRef = useRef(false);
  const unifiedReaderRef = useRef<UnifiedReaderHandle>(null);

  // Session de lecture
  const sessionIdRef = useRef<string | null>(null);
  const sessionStartRef = useRef<number>(Date.now());

  // Récupérer le livre et le chapitre depuis les params URL / sessionStorage
  const params = new URLSearchParams(window.location.search);
  const bookId = params.get('id');
  const source = params.get('source');

  const [storedChapter] = useState<{ id: string; titre: string; ordre: number; description?: string | null } | null>(() => {
    try {
      const raw = sessionStorage.getItem('bibliotech:reading-chapter');
      if (!raw) return null;
      const ch = JSON.parse(raw);
      sessionStorage.removeItem('bibliotech:reading-chapter');
      return ch;
    } catch { return null; }
  });

  const theme = THEMES[settings.theme];

  // Charger le livre depuis Supabase
  useEffect(() => {
    if (!bookId) { setLoading(false); return; }

    async function loadBook() {
      // ⚡ OPTIMISATION: Charger en parallèle le livre, la progression, les notes et le mode offline
      const loadPromises = [];

      // 1. Charger le livre
      const bookPromise = (async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from('books')
          .select('*')
          .eq('id', bookId!)
          .single();

        if (error || !data) {
          const catalogueBook = source === 'catalogue' ? getStoredCatalogueBook(bookId!) : null;
          if (catalogueBook) {
            return mapCatalogueBook(catalogueBook);
          }
          if (import.meta.env.DEV) console.error('Livre non trouvé:', error);
          return null;
        }

        return normalizeDatabaseBook(data as BookData & { readUrl?: string | null });
      })();

      loadPromises.push(bookPromise);

      // 2. Charger progression (si utilisateur connecté)
      if (user?.id) {
        const progressPromise = getReadingProgress(user.id, bookId as string).catch(() => null);
        loadPromises.push(progressPromise);
      } else {
        loadPromises.push(Promise.resolve(null));
      }

      // 3. Charger notes (si utilisateur connecté)
      if (user?.id) {
        const notesPromise = getBookNotes(user.id, bookId as string).catch(() => []);
        loadPromises.push(notesPromise);
      } else {
        loadPromises.push(Promise.resolve([]));
      }

      // 4. Vérifier disponibilité offline
      const offlinePromise = isOfflineReaderBookAvailable(bookId as string).catch(() => false);
      loadPromises.push(offlinePromise);

      // Exécuter toutes les requêtes en parallèle
      const [loadedBook, prog, loadedNotes, offlineAvailable] = await Promise.all(loadPromises);

      if (!loadedBook) {
        setLoading(false);
        return;
      }

      setBook(loadedBook);
      setTotalPages(loadedBook.pages_count || prog?.totalPages || 0);
      setMode(getDefaultMode(loadedBook, !!storedChapter));

      // Ajout automatique aux lectures en cours
      try {
        if (!isBookBorrowed(loadedBook.id)) {
          addBorrow({
            id: loadedBook.id,
            title: loadedBook.titre || 'Livre inconnu',
            author: loadedBook.auteur || 'Auteur inconnu',
            cover: loadedBook.cover_image || loadedBook.image_url || '',
            category: loadedBook.categorie || 'Non classé',
          });
        }
      } catch (err) {
        if (import.meta.env.DEV) console.warn('Erreur lors de l\'ajout automatique aux lectures:', err);
      }

      // Appliquer la progression si disponible
      if (prog) {
        setCurrentPage(prog.currentPage || 1);
        setTotalPages(prog.totalPages || 0);
        setProgress(prog.percentageLu || 0);
      }

      // Appliquer les notes
      if (loadedNotes && Array.isArray(loadedNotes)) {
        setNotes(loadedNotes as NoteData[]);
      }

      setLoading(false);
    }

    loadBook();
  }, [bookId, source, user?.id]);

  // ⚡ OPTIMISATION: Vérifier le cache avant de faire la requête + timeout
  useEffect(() => {
    let cancelled = false;

    async function loadSignedUrl() {
      setSignedPdfUrl(null);
      setSignedEpubUrl(null);
      if (!book || book.source !== 'supabase' || !book.pdf_url) return;

      // ⚡ Vérifier d'abord le cache
      const cachedUrl = getCachedSignedUrl(book.id);
      if (cachedUrl) {
        if (!cancelled) {
          if (isEpubUrl(book.pdf_url)) {
            setSignedEpubUrl(cachedUrl);
          } else {
            setSignedPdfUrl(cachedUrl);
          }
        }
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        // ⚡ Ajouter timeout de 5 secondes pour éviter l'attente infinie
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`/api/reader/${encodeURIComponent(book.id)}/url`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.message || payload?.error || 'READER_URL_FAILED');
        if (!cancelled) {
          // ⚡ Mettre en cache l'URL signée
          setCachedSignedUrl(book.id, payload.url, payload.expiresAt, payload.sessionId, payload.accessReason);
          
          if (isEpubUrl(book.pdf_url)) {
            setSignedEpubUrl(payload.url || null);
          } else {
            setSignedPdfUrl(payload.url || null);
          }
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          if (import.meta.env.DEV) console.warn('Timeout chargement URL signée - utilisation du mode offline si disponible');
          if (!cancelled) setError('Connexion lente - essaie le mode hors-ligne si disponible');
        } else {
          if (import.meta.env.DEV) console.error('Erreur URL signee lecteur:', error);
          if (!cancelled) setError(error.message || 'Impossible de charger le document');
        }
      }
    }

    loadSignedUrl();
    return () => { cancelled = true; };
  }, [book]);

  // Charger le contenu offline depuis IndexedDB si disponible
  useEffect(() => {
    if (!bookId) return;
    let url: string | null = null;

    async function loadOffline() {
      const available = await isOfflineReaderBookAvailable(bookId!);
      if (!available) return;

      const offlineBook = await getOfflineReaderBook(bookId!);
      if (!offlineBook) return;

      const blob = new Blob([offlineBook.data], { type: offlineBook.mime_type || 'application/pdf' });
      url = URL.createObjectURL(blob);
      setOfflineBlobUrl(url);
      setIsOfflineMode(true);

      // Si le livre n'est pas encore chargé depuis Supabase, utiliser les métadonnées offline
      setBook(prev => prev ?? {
        id: offlineBook.id,
        titre: offlineBook.titre,
        auteur: offlineBook.auteur,
        categorie: '',
        description: null,
        pdf_url: null,
        read_url: null,
        cover_url: offlineBook.cover_url,
        pages_count: offlineBook.total_pages,
        format: offlineBook.mime_type.includes('epub') ? 'epub' : 'pdf',
        source: 'supabase',
      });
    }

    loadOffline();
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [bookId]);

  // ⚡ OPTIMISATION: Supprimer le chargement séparé de progression et notes (déjà fait dans loadBook)
  // Démarrer la session de lecture
  useEffect(() => {
    if (!user?.id || !bookId || !book || book.source === 'catalogue') return;

    sessionStartRef.current = Date.now();

    startReadingSession(user.id, bookId).then(id => {
      sessionIdRef.current = id;
    });

    // Nettoyage : terminer la session quand on quitte
    return () => {
      if (sessionIdRef.current) {
        const duree = Math.round((Date.now() - sessionStartRef.current) / 60000);
        endReadingSession(sessionIdRef.current, currentPage, duree);
      }
    };
  }, [user?.id, bookId, book]);

  // Sauvegarder la progression automatiquement
  const saveProgress = useCallback(() => {
    const duree = Math.round((Date.now() - sessionStartRef.current) / 60000);
    if (isOfflineMode && bookId) {
      updateOfflineReaderProgress(bookId, currentPage, totalPages, duree);
      return;
    }
    if (!user?.id || !bookId || !book || book.source === 'catalogue') return;
    saveReadingProgress(user.id, bookId, currentPage, totalPages, duree, savedEpubCfi || null);
  }, [user?.id, bookId, book, currentPage, totalPages, savedEpubCfi, isOfflineMode]);

  // Auto-save toutes les 30 secondes
  useEffect(() => {
    const interval = setInterval(saveProgress, 30000);
    return () => clearInterval(interval);
  }, [saveProgress]);

  // Handler changement de page PDF
  const handlePageChange = useCallback((page: number, total: number) => {
    setCurrentPage(page);
    setTotalPages(total);
    setProgress(total > 0 ? Math.round((page / total) * 100) : 0);
    setCurrentPageText(''); // sera repopulé par extractTextFromDOM via onRenderSuccess
    pendingSpeechRef.current = false; // annule toute attente en cours
    setSpeechNotice(null);
  }, []);

  const handlePageTextChange = useCallback((text: string) => {
    setCurrentPageText(text);
  }, []);

  const handleDocumentLoad = useCallback((total: number) => {
    setTotalPages(total);
    if (book && book.source !== 'catalogue' && book.pages_count !== total) {
      // Mettre à jour le nombre de pages dans la DB
      (supabase as any).from('books').update({ pages_count: total }).eq('id', book.id);
    }
  }, [book]);

  // Ajouter une note
  const handleAddNote = async () => {
    setNoteError(null);
    if (!newNote.trim()) return;
    if (!user?.id) {
      setNoteError('Connecte-toi pour sauvegarder des notes.');
      return;
    }
    if (book?.source === 'catalogue') {
      setNoteError('Les notes ne sont disponibles que pour les livres de la bibliothèque (pas les livres du catalogue externe).');
      return;
    }
    if (!bookId) return;

    const note = await saveBookNote(user.id, bookId, currentPage, newNote.trim());
    if (note) {
      setNotes(prev => [...prev, note as NoteData]);
      setNewNote('');
      setShowNoteInput(false);
    } else {
      setNoteError('Erreur lors de la sauvegarde. Vérifie ta connexion et réessaie.');
    }
  };

  // Supprimer une note
  const handleDeleteNote = async (noteId: string) => {
    await deleteBookNote(noteId);
    setNotes(prev => prev.filter(n => n.id !== noteId));
  };

  // ─── Callback réutilisable : lire la page courante avec auto-avance ──────
  const speakCurrentPageWithAutoAdvance = useCallback((text: string) => {
    speak(text, {
      lang: 'fr-FR',
      rate: 0.9,
      onEnd: () => {
        if (!autoReadRef.current) return;
        const viewer = unifiedReaderRef.current;
        if (!viewer) return;
        if (viewer.getCurrentPage() >= viewer.getNumPages()) {
          // Fin du livre
          autoReadRef.current = false;
          setIsAutoRead(false);
          setSpeechNotice('Lecture terminée — fin du livre.');
          return;
        }
        awaitingNextPageSpeakRef.current = true;
        viewer.nextPage();
      },
    });
  }, [speak]);

  // Déclencher la lecture dès que le texte de page est disponible (après clic en attente OU auto-avance)
  useEffect(() => {
    const text = currentPageText.trim();
    if (!text) return;

    // Cas 1 : l'utilisateur a cliqué "Écouter" et le texte n'était pas encore prêt
    if (pendingSpeechRef.current) {
      pendingSpeechRef.current = false;
      setSpeechNotice(null);
      speakCurrentPageWithAutoAdvance(text);
      return;
    }

    // Cas 2 : auto-lecture a avancé à la page suivante et attend le texte
    if (awaitingNextPageSpeakRef.current) {
      awaitingNextPageSpeakRef.current = false;
      setSpeechNotice(null);
      speakCurrentPageWithAutoAdvance(text);
    }
  }, [currentPageText, speakCurrentPageWithAutoAdvance]);

  // Timeout 5s : si toujours vide, le PDF est probablement en image → on informe
  useEffect(() => {
    if (!pendingSpeechRef.current && !awaitingNextPageSpeakRef.current) return;
    const timer = setTimeout(() => {
      if (pendingSpeechRef.current || awaitingNextPageSpeakRef.current) {
        pendingSpeechRef.current = false;
        awaitingNextPageSpeakRef.current = false;
        autoReadRef.current = false;
        setIsAutoRead(false);
        setSpeechNotice('Ce PDF ne contient pas de texte lisible (scan ou image). La lecture vocale n\'est pas disponible.');
      }
    }, 5000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPageText]);

  // Text-to-Speech
  const toggleSpeech = () => {
    if (!speechSupported) {
      setSpeechNotice('La lecture vocale n\'est pas disponible dans ce navigateur.');
      return;
    }

    if (speechIsSpeaking) {
      stop();
      pendingSpeechRef.current = false;
      awaitingNextPageSpeakRef.current = false;
      autoReadRef.current = false;
      setIsAutoRead(false);
      setSpeechNotice(null);
      return;
    }

    if (mode === 'pdf') {
      const pageText = currentPageText.trim();
      if (pageText) {
        setSpeechNotice(null);
        speakCurrentPageWithAutoAdvance(pageText);
      } else {
        pendingSpeechRef.current = true;
        setSpeechNotice('Extraction du texte en cours…');
      }
      return;
    }

    const text = [book?.titre, book?.auteur, book?.extract || book?.description]
      .filter(Boolean)
      .join('. ');
    setSpeechNotice(null);
    if (!text) return;
    speak(text, { lang: 'fr-FR', rate: 0.9 });
  };

  useEffect(() => () => { stop(); }, [stop]);

  const toggleAutoRead = () => {
    if (mode !== 'pdf') return;
    if (isAutoRead || speechIsSpeaking) {
      stop();
      autoReadRef.current = false;
      awaitingNextPageSpeakRef.current = false;
      pendingSpeechRef.current = false;
      setIsAutoRead(false);
      setSpeechNotice(null);
      return;
    }
    autoReadRef.current = true;
    setIsAutoRead(true);
    const pageText = currentPageText.trim();
    if (pageText) {
      setSpeechNotice(null);
      speakCurrentPageWithAutoAdvance(pageText);
    } else {
      awaitingNextPageSpeakRef.current = true;
      setSpeechNotice('Extraction du texte en cours…');
    }
  };

  useEffect(() => {
    if (mode === 'online' && book && getExternalReadUrl(book)) {
      setExternalLoading(true);
    }
  }, [mode, book]);

  const adjustFont = (d: number) => setSettings(p => ({ ...p, fontSize: Math.max(12, Math.min(32, p.fontSize + d)) }));

  // Si pas de livre
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <BookOpen className="w-16 h-16 text-muted-foreground/30" />
        <p className="text-lg font-medium text-foreground">Livre non trouvé</p>
        <Link href="/catalogue" className="text-primary hover:underline">← Retour au catalogue</Link>
      </div>
    );
  }

  const externalReadUrl = getExternalReadUrl(book);
  const hasPdf = isPdfUrl(book.pdf_url);
  // EPUB peut être dans pdf_url (upload local) ou read_url (Gutenberg .epub.images)
  const hasEpub = isEpubUrl(book.pdf_url) || isEpubUrl(book.read_url);
  const hasDownloadableFile = !!book.pdf_url;
  const hasExternalReadUrl = !!externalReadUrl;
  const description = book.extract || book.description || 'Aucune description disponible.';

  // Calcul de la source PDF (utilisé dans le rendu principal)
  const isExternalPdf = !!(book.pdf_url && /^https?:\/\//i.test(book.pdf_url) && !book.pdf_url.includes('/storage/v1/object/'));
  const pdfSrc = offlineBlobUrl || signedPdfUrl || (isExternalPdf ? getInternalReaderUrl(book.pdf_url!) : null);

  // ── Mode lecteur intégré : EPUB ou PDF occupe tout l'écran ──
  if ((mode === 'epub' && hasEpub) || (mode === 'pdf' && (hasPdf || offlineBlobUrl))) {
    let readerSrc: string | null = null;
    let readerFormat: 'pdf' | 'epub' = 'pdf';

    if (mode === 'epub' && hasEpub) {
      readerFormat = 'epub';
      const rawEpubUrl = book.pdf_url || book.read_url;
      const isExternalUrl = !!rawEpubUrl && /^https?:\/\//i.test(rawEpubUrl) && !rawEpubUrl.includes('/storage/v1/object/');
      readerSrc = signedEpubUrl
        || (rawEpubUrl && (isExternalUrl || book.source !== 'supabase') ? getEpubProxyUrl(rawEpubUrl) : null);

      if (!readerSrc && book.source === 'supabase' && !isExternalUrl) {
        return (
          <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 z-50" style={{ backgroundColor: '#F4ECD8' }}>
            {error ? (
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm font-medium text-red-600">{error}</p>
                <button onClick={() => window.history.back()} className="px-4 py-2 bg-red-100 text-red-800 rounded-lg text-sm">Retour</button>
              </div>
            ) : (
              <>
                <Loader2 className="w-10 h-10 animate-spin" style={{ color: '#A0522D' }} />
                <p className="text-sm font-medium" style={{ color: '#5B4636' }}>Ouverture du livre...</p>
              </>
            )}
          </div>
        );
      }
    } else if (mode === 'pdf') {
      readerFormat = 'pdf';
      readerSrc = pdfSrc;

      if (!readerSrc) {
        return (
          <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 z-50" style={{ backgroundColor: '#F4ECD8' }}>
            {error ? (
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm font-medium text-red-600">{error}</p>
                <button onClick={() => window.history.back()} className="px-4 py-2 bg-red-100 text-red-800 rounded-lg text-sm">Retour</button>
              </div>
            ) : (
              <>
                <Loader2 className="w-10 h-10 animate-spin" style={{ color: '#A0522D' }} />
                <p className="text-sm font-medium" style={{ color: '#5B4636' }}>Préparation du document...</p>
              </>
            )}
          </div>
        );
      }
    }

    if (readerSrc) {
      return (
        <UnifiedReader
          ref={unifiedReaderRef}
          src={readerSrc}
          format={readerFormat}
          bookId={book.id}
          userId={user?.id}
          userEmail={user?.email}
          initialPage={currentPage}
          initialCfi={savedEpubCfi}
          bookTitle={book.titre}
          bookAuthor={book.auteur}
          onBack={() => window.history.back()}
          onLocationChange={(cfi, page, total, pct) => {
            setCurrentPage(page);
            setTotalPages(total);
            setProgress(Math.round(pct * 100));
            if (cfi) setSavedEpubCfi(cfi);
          }}
          onDocumentLoad={handleDocumentLoad}
          onPageTextChange={handlePageTextChange}
        />
      );
    }
  }

  // Mode online supprimé — remplacé par le lecteur unifié

  const notesForPage = notes.filter(n => n.page === currentPage);

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50' : 'min-h-screen'} ${theme.bg} ${theme.text} transition-colors duration-300 flex flex-col`}>

      {/* ── BARRE DE PROGRESSION ── */}
      <div className="fixed top-0 left-0 right-0 h-1 z-50 bg-transparent">
        <motion.div className="h-full bg-primary rounded-r-full" style={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
      </div>

      {/* ── HEADER ── */}
      <header className={`sticky top-0 z-40 border-b ${theme.header} backdrop-blur`}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">

          {/* Retour */}
          <Link href="/catalogue">
            <a className={`p-2 rounded-lg transition-colors hover:${theme.bar} flex-shrink-0`}>
              <ChevronLeft className="w-5 h-5" />
            </a>
          </Link>

          {/* Titre + auteur */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{book.titre}</p>
            <p className="text-xs opacity-60 truncate">{book.auteur} · {book.categorie}</p>
          </div>

          {/* Indicateur progression */}
          <div className="hidden md:flex items-center gap-2 text-xs">
            <Clock className="w-3.5 h-3.5 opacity-50" />
            <span className="opacity-60">Page {currentPage}/{totalPages || '?'}</span>
            <span className="text-primary font-bold">{progress}%</span>
            {isOfflineMode && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
                <WifiOff className="w-3 h-3" /> Hors-ligne
              </span>
            )}
          </div>

          {/* Contrôles droite */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Lecture vocale locale (page actuelle) */}
            <button onClick={toggleSpeech}
              className={`p-2 rounded-lg transition-colors ${speechIsSpeaking && !isAutoRead ? 'bg-primary text-primary-foreground' : `hover:${theme.bar}`}`}
              title="Lire cette page à voix haute">
              {speechIsSpeaking && !isAutoRead ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Auto-lecture page par page — PDF uniquement */}
            {mode === 'pdf' && (
              <button
                onClick={toggleAutoRead}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  isAutoRead ? 'bg-emerald-500 text-white' : `hover:${theme.bar}`
                }`}
                title={isAutoRead ? 'Arrêter l\'auto-lecture' : 'Lecture automatique page par page'}
              >
                {isAutoRead
                  ? <><StopCircle className="w-4 h-4" /> Stop</>
                  : <><PlayCircle className="w-4 h-4" /> Auto</>
                }
              </button>
            )}

            {/* Lecture audio globale — continue en arrière-plan */}
            {globalSpeech.isSupported && book && (
              <button
                onClick={() => {
                  if (globalSpeech.track?.bookId === book.id) {
                    globalSpeech.stop();
                  } else {
                    globalSpeech.play({
                      bookId: book.id,
                      title: book.titre,
                      author: book.auteur,
                      text: currentPageText || book.description || book.extract || book.titre,
                    });
                  }
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  globalSpeech.track?.bookId === book.id
                    ? 'bg-amber-500 text-white'
                    : `hover:${theme.bar}`
                }`}
                title="Écouter en arrière-plan (continue même si vous naviguez)"
              >
                🎧 {globalSpeech.track?.bookId === book.id ? 'Arrêter' : 'Écouter'}
              </button>
            )}

            {hasDownloadableFile && (
              <a
                href={getDownloadUrl(book.pdf_url!, book.titre)}
                className={`p-2 rounded-lg transition-colors hover:${theme.bar}`}
                title="Telecharger le fichier"
              >
                <Download className="w-4 h-4" />
              </a>
            )}

            {book?.source === 'supabase' && (
              <button
                onClick={() => setShowAIPanel(v => !v)}
                className={`p-2 rounded-lg transition-colors ${showAIPanel ? 'bg-purple-500 text-white' : `hover:${theme.bar}`}`}
                title="Demander à BibliAI"
              >
                <Bot className="w-4 h-4" />
              </button>
            )}

            <button onClick={() => { setShowNoteInput(v => !v); setMode('notes'); }}
              className={`p-2 rounded-lg transition-colors hover:${theme.bar}`} title="Notes">
              <StickyNote className="w-4 h-4" />
            </button>

            <button onClick={() => adjustFont(-1)} className={`p-2 rounded-lg hover:${theme.bar} transition-colors`}><ZoomOut className="w-4 h-4" /></button>
            <button onClick={() => adjustFont(1)} className={`p-2 rounded-lg hover:${theme.bar} transition-colors`}><ZoomIn className="w-4 h-4" /></button>

            <button onClick={() => setShowSettings(v => !v)}
              className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-primary text-primary-foreground' : `hover:${theme.bar}`}`}>
              <Settings2 className="w-4 h-4" />
            </button>

            <button onClick={saveProgress} className={`p-2 rounded-lg hover:${theme.bar} transition-colors`} title="Sauvegarder">
              <Save className="w-4 h-4" />
            </button>

            <button onClick={() => setIsFullscreen(v => !v)} className={`p-2 rounded-lg hover:${theme.bar} transition-colors hidden md:block`}>
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Onglets mode lecture */}
        <div className={`flex border-t ${theme.header.split(' ')[2]} max-w-5xl mx-auto px-4`}>
          {[
            ...(hasEpub ? [{ id: 'epub', label: '📚 Lire (EPUB)' }] : []),
            ...(hasPdf ? [{ id: 'pdf', label: '📄 Lire le PDF' }] : []),
            ...(storedChapter ? [{ id: 'chapter', label: `📖 Chapitre ${storedChapter.ordre}` }] : []),
            { id: 'extract', label: '📄 Description' },
            { id: 'notes', label: `📝 Notes (${notes.length})` },
          ].map(tab => (
            <button key={tab.id} onClick={() => setMode(tab.id as any)}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                mode === tab.id ? 'border-primary text-primary' : 'border-transparent opacity-60 hover:opacity-100'
              }`}>
              {tab.label}
            </button>
          ))}
          {hasExternalReadUrl && (
            <button onClick={() => setMode('online')}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                mode === 'online' ? 'border-primary text-primary' : 'border-transparent opacity-60 hover:opacity-100'
              }`}>
              En ligne
            </button>
          )}
          <div className="ml-auto py-2 text-xs opacity-50">{progress}% lu</div>
        </div>
        {speechNotice && (
          <div className="max-w-5xl mx-auto px-4 pb-2 text-xs text-amber-700 dark:text-amber-300">
            {speechNotice}
          </div>
        )}
      </header>

      {/* ── PANNEAU PARAMÈTRES ── */}
      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className={`overflow-hidden border-b ${theme.header}`}>
            <div className="max-w-5xl mx-auto px-4 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Thème */}
              <div>
                <p className="text-xs font-semibold opacity-60 mb-2">Thème</p>
                <div className="flex gap-2">
                  {(['dark','sepia','light'] as const).map(t => (
                    <button key={t} onClick={() => setSettings(p => ({...p, theme: t}))}
                      className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${settings.theme === t ? 'border-primary scale-110' : 'border-transparent'} ${t==='dark'?'bg-slate-800':t==='sepia'?'bg-amber-100':'bg-white'}`} />
                  ))}
                </div>
              </div>

              {/* Police */}
              <div>
                <p className="text-xs font-semibold opacity-60 mb-2">Police</p>
                <div className="flex gap-1">
                  {(['serif','sans','mono'] as const).map(f => (
                    <button key={f} onClick={() => setSettings(p => ({...p, fontFamily: f}))}
                      className={`px-2 py-1 rounded text-xs transition-colors ${settings.fontFamily===f ? 'bg-primary text-primary-foreground' : `${theme.bar} opacity-70 hover:opacity-100`}`}>
                      {f === 'serif' ? 'Serif' : f === 'sans' ? 'Sans' : 'Mono'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interligne */}
              <div className="col-span-2">
                <p className="text-xs font-semibold opacity-60 mb-2">Interligne : {settings.lineHeight.toFixed(1)}</p>
                <input type="range" min="1.2" max="2.4" step="0.1" value={settings.lineHeight}
                  onChange={e => setSettings(p => ({...p, lineHeight: parseFloat(e.target.value)}))}
                  className="w-full accent-primary" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CONTENU ── */}
      <div className="flex-1 overflow-hidden">

        {/* Les modes EPUB et PDF sont gérés en plein écran par UnifiedReader (voir le return anticipé ci-dessus) */}

        {/* Mode lecture en ligne supprimé — remplacé par le lecteur unifié */}

        {/* Mode Chapitre */}
        {mode === 'chapter' && storedChapter && (
          <div ref={contentRef} className="h-full overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`max-w-2xl mx-auto px-6 py-12 ${FONTS[settings.fontFamily]}`}
              style={{ fontSize: settings.fontSize, lineHeight: settings.lineHeight }}
            >
              <div className="mb-10 pb-6 border-b border-current/10">
                <p className="text-xs font-semibold uppercase tracking-widest opacity-40 mb-2">
                  {book?.categorie} · Chapitre {storedChapter.ordre}
                </p>
                <h1 className="text-2xl font-bold mb-1">{storedChapter.titre}</h1>
                <p className="opacity-60 text-base">{book?.auteur}</p>
              </div>

              {storedChapter.description ? (
                storedChapter.description.split('\n\n').map((para, i) => (
                  <motion.p
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="mb-6 text-justify hyphens-auto"
                  >
                    {para.trim()}
                  </motion.p>
                ))
              ) : (
                <div className={`p-6 rounded-2xl ${theme.bar} text-center space-y-3`}>
                  <BookOpen className="w-8 h-8 mx-auto opacity-50" />
                  <p className="font-semibold">Contenu du chapitre</p>
                  <p className="text-sm opacity-60">
                    Le texte complet de ce chapitre est disponible dans le fichier du livre.
                  </p>
                  {hasPdf && (
                    <button
                      onClick={() => setMode('pdf')}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
                    >
                      <FileText className="w-4 h-4" /> Ouvrir le PDF
                    </button>
                  )}
                  {hasExternalReadUrl && !hasPdf && (
                    <button
                      onClick={() => setMode('online')}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
                    >
                      <Globe className="w-4 h-4" /> Lire en ligne
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* Mode Description/Extrait */}
        {mode === 'extract' && (
          <div ref={contentRef} className="h-full overflow-y-auto">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className={`max-w-2xl mx-auto px-6 py-12 ${FONTS[settings.fontFamily]}`}
              style={{ fontSize: settings.fontSize, lineHeight: settings.lineHeight }}>

              {/* En-tête */}
              <div className="mb-10 pb-6 border-b border-current/10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-widest opacity-40">{book.format}</span>
                  <span className="text-xs opacity-30">·</span>
                  <span className="text-xs opacity-40">{book.categorie}</span>
                </div>
                <h1 className="text-2xl font-bold mb-1">{book.titre}</h1>
                <p className="opacity-60 text-base">{book.auteur}</p>
              </div>

              {/* Texte */}
              {description.split('\n\n').map((para, i) => (
                <motion.p key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="mb-6 text-justify hyphens-auto">
                  {para.trim()}
                </motion.p>
              ))}

              {/* CTA */}
              {hasPdf && (
                <div className={`mt-12 p-6 rounded-2xl ${theme.bar} text-center space-y-3`}>
                  <BookOpen className="w-8 h-8 mx-auto opacity-50" />
                  <p className="font-semibold">Lire le livre complet</p>
                  <button onClick={() => setMode('pdf')}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
                    <FileText className="w-4 h-4" /> Ouvrir le lecteur PDF
                  </button>
                  <a
                    href={getDownloadUrl(book.pdf_url!, book.titre)}
                    className="inline-flex items-center gap-2 px-6 py-3 border border-current/20 rounded-lg text-sm font-semibold hover:bg-background/20 transition-colors"
                  >
                    <Download className="w-4 h-4" /> Telecharger le PDF
                  </a>
                </div>
              )}

              {hasExternalReadUrl && (
                <div className={`mt-6 p-6 rounded-2xl ${theme.bar} text-center space-y-3`}>
                  <Globe className="w-8 h-8 mx-auto opacity-50" />
                  <p className="font-semibold">Lecture en ligne disponible</p>
                  <button onClick={() => setMode('online')}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
                    <Globe className="w-4 h-4" /> Ouvrir dans BiblioTech
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* Mode Notes */}
        {mode === 'notes' && (
          <div className="h-full overflow-y-auto">
            <div className="max-w-2xl mx-auto px-6 py-8 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">📝 Mes notes — {book.titre}</h2>
                <button onClick={() => setShowNoteInput(v => !v)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium">
                  <StickyNote className="w-3.5 h-3.5" /> Nouvelle note
                </button>
              </div>

              {/* Formulaire nouvelle note */}
              <AnimatePresence>
                {showNoteInput && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden">
                    <div className={`p-4 rounded-xl ${theme.bar} space-y-3`}>
                      <p className="text-xs opacity-60">Note pour la page {currentPage}</p>
                      <textarea value={newNote} onChange={e => { setNewNote(e.target.value); setNoteError(null); }}
                        placeholder="Écris ta note ici..."
                        className="w-full px-3 py-2 rounded-lg border border-current/20 bg-transparent text-sm resize-none"
                        rows={3} />
                      {noteError && (
                        <p className="text-xs text-red-500 dark:text-red-400">{noteError}</p>
                      )}
                      <div className="flex gap-2">
                        <button onClick={handleAddNote} disabled={!newNote.trim()}
                          className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium disabled:opacity-50">
                          Enregistrer
                        </button>
                        <button onClick={() => { setShowNoteInput(false); setNewNote(''); setNoteError(null); }}
                          className="px-4 py-1.5 border border-current/20 rounded-lg text-xs">
                          Annuler
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Liste des notes */}
              {notes.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm opacity-60">Aucune note pour ce livre</p>
                  <p className="text-xs opacity-40 mt-1">Ajoute des notes pendant ta lecture</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notes.map(note => (
                    <motion.div key={note.id} layout
                      className={`p-4 rounded-xl ${theme.bar} border border-current/10`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-primary">Page {note.page}</span>
                            <span className="text-xs opacity-40">
                              {new Date(note.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-sm">{note.contenu}</p>
                        </div>
                        <button onClick={() => handleDeleteNote(note.id)}
                          className="p-1 rounded text-red-400 hover:bg-red-100/20 transition-colors flex-shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Panneau BibliAI latéral */}
        <AnimatePresence>
          {showAIPanel && book?.source === 'supabase' && (
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm shadow-2xl flex flex-col"
              style={{ backgroundColor: 'var(--background)', borderLeft: '1px solid var(--border)' }}
            >
              {/* Header panneau */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0"
                style={{ backgroundColor: 'var(--card)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-500 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">BibliAI</p>
                    <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">{book.titre}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAIPanel(false)}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              {/* Chat */}
              <div className="flex-1 overflow-hidden">
                <AIChat bookId={bookId ?? undefined} compact />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fallback si aucun fichier disponible et mode lecture sélectionné */}
        {((mode === 'pdf' && !hasPdf && !offlineBlobUrl) || (mode === 'epub' && !hasEpub)) && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <FileText className="w-16 h-16 text-muted-foreground/30" />
            <p className="text-lg font-medium">Pas de fichier disponible</p>
            <p className="text-sm text-muted-foreground">Ce livre n'a pas encore de fichier associé.</p>
            <button onClick={() => setMode('extract')}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
              Voir la description
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
