import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, ExternalLink, BookOpen, Loader2, BookText, Volume2, Square, Download, WifiOff, Trash2, Globe, ShoppingCart } from 'lucide-react';
import { useSpeechContext } from '@/contexts/SpeechContext';
import { useSpeech } from '@/hooks/useSpeech';
import { useLocation } from 'wouter';
import { Badge } from '@/components/ui/Badge';
import { BookCoverPlaceholder } from './BookCoverPlaceholder';
import type { GoogleBook } from '@/services/googleBooksService';
import { downloadBookForOffline, isOfflineReaderBookAvailable, removeOfflineReaderBook } from '@/services/offlineReader';
import { supabase } from '@/lib/supabase';

interface BookViewerProps {
  book: GoogleBook | null;
  onClose: () => void;
  onBorrow: (book: GoogleBook) => void;
}



/**
 * Nettoie le synopsis Google Books des balises HTML dangereuses
 */
function cleanDescription(html: string): string {
  // Limiter la longueur et nettoyer les balisesrisquées
  const div = document.createElement('div');
  div.innerHTML = html;
  const text = div.textContent || div.innerText || '';
  return text.length > 500 ? text.substring(0, 500) + '...' : text;
}

function isPdfUrl(url?: string): boolean {
  return !!url && /\.pdf(\?|$)/i.test(url);
}

function getExternalReadUrl(book: GoogleBook): string | undefined {
  return book.readUrl || (book.pdfUrl && !isPdfUrl(book.pdfUrl) ? book.pdfUrl : undefined);
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

export const BookViewer: React.FC<BookViewerProps> = ({ book, onClose, onBorrow }) => {
  const [, setLocation] = useLocation();
  const viewerRef = useRef<HTMLDivElement>(null);
  const { isSpeaking, speakBook, stop, isSupported } = useSpeech();
  const globalSpeech = useSpeechContext();
  const [iframeLoading, setIframeLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'synopsis' | 'preview'>('synopsis');

  // ── Hors-ligne ─────────────────────────────────────────────
  const [isOffline, setIsOffline] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [offlineError, setOfflineError] = useState<string | null>(null);

  // ── Paiement ───────────────────────────────────────────────
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const handlePayment = async (type: 'buy') => {
    if (!book) return;
    setIsProcessingPayment(true);
    try {
      // Rafraîchir la session pour éviter un token expiré
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        window.location.href = '/login';
        return;
      }

      // Forcer un refresh si le token expire dans moins de 60 secondes
      const expiresAt = session.expires_at ?? 0;
      const now = Math.floor(Date.now() / 1000);
      let accessToken = session.access_token;
      if (expiresAt - now < 60) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        if (refreshed.session?.access_token) {
          accessToken = refreshed.session.access_token;
        }
      }

      // Convertir en enum backend (BUY, BORROW...)
      const paymentType = type.toUpperCase();

      const res = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ type: paymentType, bookId: book.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.message || json.data?.message || "Erreur lors de l'initiation du paiement.");
        return;
      }
      // Le backend retourne { success, data: { paymentUrl } } via ResponseDto
      const paymentUrl = json.data?.paymentUrl ?? json.paymentUrl ?? json.payment_url;
      if (paymentUrl) {
        window.location.href = paymentUrl;
      }
    } catch (err) {
      console.error(err);
      alert('Erreur réseau. Veuillez réessayer.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const openInReadingMode = (targetBook: GoogleBook) => {
    try {
      sessionStorage.setItem('bibliotech:reading-mode-book', JSON.stringify(targetBook));
    } catch (error) {
      console.warn('Impossible de préparer le livre pour le mode lecture:', error);
    }

    setLocation(`/lecture?id=${encodeURIComponent(targetBook.id)}&source=catalogue`);
  };

  useEffect(() => {
    if (book) {
      setIframeLoading(false);
      setActiveTab('synopsis');
      setOfflineError(null);
      viewerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      isOfflineReaderBookAvailable(book.id).then(setIsOffline);
    }
  }, [book]);

  const handleDownloadOffline = async () => {
    if (!book) return;
    setIsDownloading(true);
    setOfflineError(null);
    try {
      await downloadBookForOffline(book);
      setIsOffline(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('OFFLINE_PLAN_REQUIRED')) {
        setOfflineError('Plan Étudiant ou Premium requis.');
      } else if (msg.includes('BOOK_ACCESS_DENIED')) {
        setOfflineError('Emprunt ou abonnement actif requis.');
      } else if (msg.includes('BOOK_STORAGE_MISSING') || msg.includes('BOOK_NOT_FOUND')) {
        setOfflineError('Ce livre n\'est pas disponible hors-ligne.');
      } else {
        setOfflineError('Erreur téléchargement. Réessaie.');
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRemoveOffline = async () => {
    if (!book) return;
    await removeOfflineReaderBook(book.id);
    setIsOffline(false);
  };


  const externalReadUrl = book ? getExternalReadUrl(book) : undefined;

  return (
    <AnimatePresence>
      {book && (
        <motion.div
          ref={viewerRef}
          initial={{ opacity: 0, y: 30, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -20, height: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="overflow-hidden"
        >
          <div className="rounded-2xl border border-primary/20 bg-card shadow-2xl shadow-primary/5 overflow-hidden">
            {/* Header Bar */}
            <div className="flex items-center justify-between px-6 py-4 bg-primary/5 border-b border-border">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-foreground">Détails du livre</h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 p-6">
              {/* Cover + Actions */}
              <div className="flex-shrink-0 flex flex-col items-center gap-4">
                <div className="w-[180px] h-[270px] rounded-xl overflow-hidden shadow-2xl bg-muted border border-primary/10">
                  <BookCoverPlaceholder title={book.title} author={book.authors.join(', ')} id={book.id} category={book.category} variant="lg" />
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 w-full max-w-[180px]">

                  {/* Boutons de lecture */}
                  {(externalReadUrl || book.pdfUrl || book.extract || book.type === 'payant') && (
                    <div className="grid gap-2">
                      {book.type === 'payant' && book.prix_achat && book.prix_achat > 0 && (
                        <button
                          onClick={() => handlePayment('buy')}
                          disabled={isProcessingPayment}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 transition-colors text-sm shadow-md"
                        >
                          {isProcessingPayment ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <ShoppingCart className="w-4 h-4" />
                          )}
                          Acheter ({book.prix_achat.toLocaleString('fr-FR')} F)
                        </button>
                      )}

                      {((book.pdfUrl && isPdfUrl(book.pdfUrl)) || externalReadUrl) ? (
                        <button
                          onClick={() => openInReadingMode(book)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors text-sm"
                        >
                          <BookText className="w-4 h-4" />
                          {book.type === 'payant' ? 'Lire (si accès)' : 'Lire'}
                        </button>
                      ) : null}

                      {book.pdfUrl && (
                        <a
                          href={getDownloadUrl(book.pdfUrl, book.title)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-border text-foreground font-medium rounded-lg hover:bg-muted transition-colors text-sm"
                        >
                          <Download className="w-4 h-4" />
                          Telecharger
                        </a>
                      )}

                      {!book.readUrl && !isPdfUrl(book.pdfUrl) && book.extract && (
                        <button
                          onClick={() => openInReadingMode(book)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors text-sm"
                        >
                          <BookText className="w-4 h-4" />
                          Voir le résumé
                        </button>
                      )}
                    </div>
                  )}

                  {/* Écouter en arrière-plan — persiste entre les pages */}
                  {globalSpeech.isSupported && (
                    <button
                      onClick={() => {
                        if (globalSpeech.track?.bookId === book.id) {
                          globalSpeech.stop();
                        } else {
                          globalSpeech.play({
                            bookId: book.id,
                            title: book.title,
                            author: book.authors.join(', '),
                            text: book.extract || book.description || book.title,
                          });
                        }
                      }}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-2 font-semibold rounded-lg transition-colors text-sm ${
                        globalSpeech.track?.bookId === book.id
                          ? 'bg-amber-500 text-white hover:bg-amber-600'
                          : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200'
                      }`}
                      title="Écouter le synopsis — continue en arrière-plan"
                    >
                      {globalSpeech.track?.bookId === book.id
                        ? <><Square className="w-4 h-4" /> Arrêter</>
                        : <><Volume2 className="w-4 h-4" /> 🎧 Écouter</>}
                    </button>
                  )}

                  {book.previewLink && (
                    <a
                      href={book.previewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-border text-foreground font-medium rounded-lg hover:bg-muted transition-colors text-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Aperçu Google
                    </a>
                  )}

                  {/* Bouton hors-ligne */}
                  <div className="pt-1 border-t border-border/40">
                    <button
                      onClick={isOffline ? handleRemoveOffline : handleDownloadOffline}
                      disabled={isDownloading}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-2 font-medium rounded-lg text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                        isOffline
                          ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200/60 dark:border-red-800/60'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80 border border-border'
                      }`}
                    >
                      {isDownloading
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Téléchargement...</>
                        : isOffline
                          ? <><Trash2 className="w-4 h-4" /> Supprimer hors-ligne</>
                          : <><WifiOff className="w-4 h-4" /> Hors-ligne</>}
                    </button>
                    {offlineError && (
                      <p className="text-xs text-red-500 dark:text-red-400 mt-1 text-center">{offlineError}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="flex-1 space-y-4 min-w-0">
                {/* Title */}
                <div>
                  <h2 className="text-2xl font-bold text-foreground leading-tight mb-1">
                    {book.title}
                  </h2>
                  <p className="text-base text-muted-foreground">
                    par <span className="font-medium text-foreground">{book.authors.join(', ')}</span>
                  </p>
                </div>

                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant={book.available ? 'success' : 'warning'} size="sm">
                    {book.available ? 'Disponible' : 'Indisponible'}
                  </Badge>
                  <Badge variant="secondary" size="sm">
                    {book.category}
                  </Badge>
                  {book.publishedYear > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {book.publishedYear}
                    </span>
                  )}
                  {book.pageCount > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {book.pageCount} pages
                    </span>
                  )}
                </div>

                {/* Rating */}
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          i < Math.floor(book.rating)
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-muted-foreground/30'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-semibold text-foreground">
                    {(Math.round(book.rating * 10) / 10).toFixed(1)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ({book.ratingsCount} avis)
                  </span>
                </div>

                {/* Tabs for Synopsis and Wikipedia */}
                <div>
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <button
                      onClick={() => setActiveTab('synopsis')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                        activeTab === 'synopsis'
                          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      <BookOpen className="w-4 h-4" />
                      Synopsis
                    </button>

                    {book.previewLink && (
                      <button
                        onClick={() => {
                          setActiveTab('preview');
                        }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                          activeTab === 'preview'
                            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        <ExternalLink className="w-4 h-4" />
                        Aperçu
                      </button>
                    )}

                  </div>

                  {/* Content based on active tab */}
                  <div className="relative min-h-[150px]">

                    {activeTab === 'synopsis' && (
                      <div className="text-sm text-muted-foreground leading-relaxed max-h-[250px] overflow-y-auto pr-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {book.description ? cleanDescription(book.description) : 'Aucune description disponible pour ce livre.'}
                      </div>
                    )}

                    {activeTab === 'preview' && book.previewLink && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="p-6 rounded-xl border-2 border-dashed border-primary/20 bg-primary/5 text-center space-y-4">
                          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                            <BookOpen className="w-8 h-8 text-primary" />
                          </div>
                          <div className="space-y-2">
                            <h4 className="font-bold text-foreground text-lg">Aperçu interactif disponible</h4>
                            <p className="text-sm text-muted-foreground max-w-md mx-auto">
                              Pour des raisons de sécurité, Google Books ne permet pas l'affichage direct de l'aperçu à l'intérieur de l'application.
                            </p>
                          </div>
                          <a
                            href={book.previewLink.replace('http://', 'https://')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200"
                          >
                            <ExternalLink className="w-5 h-5" />
                            Ouvrir l'aperçu Google Books
                          </a>
                          <p className="text-[10px] text-muted-foreground italic">
                            S'ouvrira dans un nouvel onglet sécurisé
                          </p>
                        </div>
                      </div>
                    )}


                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
