import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { WifiOff, BookOpen, Trash2, Loader2 } from 'lucide-react';
import { useLocation } from 'wouter';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  listOfflineReaderBooks,
  removeOfflineReaderBook,
  type OfflineReaderBookMeta,
} from '@/services/offlineReader';

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function OfflineLibrary() {
  const [, setLocation] = useLocation();
  const [books, setBooks] = useState<OfflineReaderBookMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const list = await listOfflineReaderBooks();
    setBooks(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    window.addEventListener('offlineReaderUpdated', load);
    return () => window.removeEventListener('offlineReaderUpdated', load);
  }, [load]);

  const handleRemove = async (bookId: string) => {
    await removeOfflineReaderBook(bookId);
    setBooks(prev => prev.filter(b => b.id !== bookId));
  };

  const handleRead = (bookId: string) => {
    setLocation(`/lecture?id=${encodeURIComponent(bookId)}&source=offline`);
  };

  const totalSize = books.reduce((sum, b) => sum + b.size_bytes, 0);

  return (
    <DashboardLayout>
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <WifiOff className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Bibliothèque hors-ligne</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {books.length} livre{books.length !== 1 ? 's' : ''} téléchargé{books.length !== 1 ? 's' : ''}
              {totalSize > 0 && ` · ${formatSize(totalSize)}`}
            </p>
          </div>
        </div>

        {/* Info */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
          Les livres téléchargés sont chiffrés localement et restent accessibles sans connexion pendant 30 jours.
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-20 bg-card border border-border rounded-2xl">
            <WifiOff className="w-14 h-14 mx-auto mb-4 text-muted-foreground/20" />
            <p className="text-lg font-semibold text-foreground mb-1">Aucun livre téléchargé</p>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Ouvre un livre dans le catalogue et clique sur le bouton "Hors-ligne" pour le télécharger.
            </p>
            <button
              onClick={() => setLocation('/catalogue')}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Parcourir le catalogue
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {books.map(book => {
              const days = daysUntil(book.token_expires_at);
              const progress = book.total_pages > 0
                ? Math.round((book.current_page / book.total_pages) * 100)
                : 0;
              const isExpiringSoon = days <= 3;

              return (
                <motion.div
                  key={book.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 hover:border-primary/30 transition-colors"
                >
                  {/* Couverture */}
                  <div className="w-12 h-16 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {book.cover_url ? (
                      <img src={book.cover_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <BookOpen className="w-5 h-5 text-primary/40" />
                    )}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{book.titre}</p>
                    <p className="text-sm text-muted-foreground truncate">{book.auteur}</p>

                    {/* Barre de progression */}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {progress}% · {formatSize(book.size_bytes)}
                      </span>
                    </div>

                    <p className={`text-xs mt-1 ${isExpiringSoon ? 'text-amber-500 font-medium' : 'text-muted-foreground'}`}>
                      {days <= 0
                        ? 'Expire aujourd\'hui'
                        : `Expire dans ${days} jour${days > 1 ? 's' : ''}`}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleRead(book.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      Lire
                    </button>
                    <button
                      onClick={() => handleRemove(book.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
