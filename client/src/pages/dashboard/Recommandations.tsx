import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BookMarked, BookOpen, Loader2, Sparkles, Star, TrendingUp } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { FavoritesButton } from '@/components/features/FavoritesButton';
import { RatingStars } from '@/components/features/RatingStars';
import { BookCoverPlaceholder } from '@/components/features/BookCoverPlaceholder';
import { BookViewer } from '@/components/features/BookViewer';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import type { GoogleBook } from '@/services/googleBooksService';
import {
  borrowBookInSupabase,
  fetchActiveBorrowedBookIds,
  fetchPersonalizedSupabaseRecommendations,
  type RecommendedBook,
} from '@/services/booksSupabase';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function Recommandations() {
  const { showToast } = useToast();
  const { user, isInitializing } = useAuth();
  const [books, setBooks] = useState<RecommendedBook[]>([]);
  const [borrowedBookIds, setBorrowedBookIds] = useState<Set<string>>(new Set());
  const [selectedBook, setSelectedBook] = useState<GoogleBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);

  useEffect(() => {
    if (isInitializing) return;

    if (!user?.id) {
      setBooks([]);
      setBorrowedBookIds(new Set());
      setLoading(false);
      return;
    }

    let cancelled = false;
    const userId = user.id;
    const preferredCategories = user.preferredCategories;

    async function load() {
      setLoading(true);
      setRecommendationError(null);

      try {
        const [results, borrowedIds] = await Promise.all([
          fetchPersonalizedSupabaseRecommendations(userId, preferredCategories),
          fetchActiveBorrowedBookIds(userId),
        ]);

        if (cancelled) return;
        setBooks(results);
        setBorrowedBookIds(borrowedIds);
      } catch (err) {
        if (cancelled) return;
        if (import.meta.env.DEV) console.error('Erreur recommandations Supabase:', err);
        setBooks([]);
        setBorrowedBookIds(new Set());
        setRecommendationError(
          err instanceof Error ? err.message : 'Impossible de charger vos recommandations Supabase.',
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isInitializing, user?.id, user?.preferredCategories]);

  const handleBorrow = async (book: GoogleBook) => {
    if (!user?.id) {
      showToast('Connecte-toi pour emprunter un livre.', 'warning');
      return;
    }

    if (borrowedBookIds.has(book.id)) {
      showToast(`"${book.title}" est deja emprunte`, 'warning');
      return;
    }

    try {
      await borrowBookInSupabase(user.id, book.id);
      setBorrowedBookIds(prev => new Set(prev).add(book.id));
      setBooks(prev => prev.filter(item => item.id !== book.id));
      window.dispatchEvent(new Event('borrowsUpdated'));
      showToast(`Vous avez emprunte "${book.title}" avec succes !`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur', 'error');
    }
  };

  return (
    <DashboardLayout>
      <motion.div className="space-y-8" variants={containerVariants} initial="hidden" animate="visible">
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">Recommandations personnalisees</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Decouvrez des livres selectionnes depuis votre catalogue Supabase
          </p>
        </motion.div>

        <motion.div variants={itemVariants}>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex gap-3">
            <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Recommandations Supabase
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Ces recommandations sont generees avec vos emprunts Supabase et vos preferences de categories.
              </p>
            </div>
          </div>
        </motion.div>

        {recommendationError && (
          <motion.div
            variants={itemVariants}
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200"
          >
            Recommandations indisponibles : {recommendationError}
          </motion.div>
        )}

        {!loading && !user?.id && (
          <motion.div variants={itemVariants} className="rounded-xl border border-border bg-card px-5 py-8 text-center">
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="font-bold text-foreground">Connectez-vous pour voir vos recommandations</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Les suggestions sont basees sur vos emprunts Supabase.
            </p>
          </motion.div>
        )}

        <BookViewer book={selectedBook} onClose={() => setSelectedBook(null)} onBorrow={handleBorrow} />

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
        ) : user?.id && books.length > 0 ? (
          <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" variants={containerVariants}>
            {books.map((book, index) => {
              const displayRating = Math.round((book.rating || 0) * 10) / 10;

              return (
                <motion.div key={book.id} variants={itemVariants}>
                  <Card hoverable>
                    <CardBody className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Badge variant="primary" size="sm">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          {book.matchScore}% match
                        </Badge>
                        <FavoritesButton bookId={index + 1} bookTitle={book.title} />
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedBook(book)}
                        className="block w-full h-48 rounded-lg overflow-hidden bg-muted text-left"
                      >
                        <BookCoverPlaceholder
                          title={book.title}
                          author={book.authors.join(', ')}
                          id={book.id}
                          category={book.category}
                        />
                      </button>

                      <div>
                        <h3 className="font-bold text-foreground mb-1 line-clamp-2">{book.title}</h3>
                        <p className="text-sm text-muted-foreground">{book.authors.join(', ')}</p>
                      </div>

                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">
                          <span className="font-semibold">Pourquoi ?</span> {book.reason}
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" size="sm">{book.category}</Badge>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                          <span className="text-sm font-semibold text-foreground">{displayRating.toFixed(1)}</span>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-2">Votre note</p>
                        <RatingStars bookId={index + 1} bookTitle={book.title} />
                      </div>

                      <button
                        onClick={() => handleBorrow(book)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:shadow-md transition-all duration-200"
                      >
                        <BookMarked className="w-4 h-4" />
                        {borrowedBookIds.has(book.id) ? 'Deja emprunte' : 'Emprunter'}
                      </button>
                    </CardBody>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        ) : user?.id ? (
          <motion.div variants={itemVariants} className="rounded-xl border border-border bg-card px-5 py-10 text-center">
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="font-bold text-foreground">Aucune recommandation disponible</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Ajoutez plus de livres publies dans Supabase ou empruntez quelques livres pour enrichir les suggestions.
            </p>
          </motion.div>
        ) : null}

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="border-b bg-gradient-to-r from-primary/10 to-accent/10">
              <h3 className="text-lg font-bold text-foreground">Comment ameliorons-nous vos recommandations ?</h3>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Vos emprunts</h4>
                  <p className="text-sm text-muted-foreground">
                    Nous analysons les categories et auteurs des livres que vous avez empruntes.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Vos preferences</h4>
                  <p className="text-sm text-muted-foreground">
                    Vos categories favorites influencent le score de correspondance.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Le catalogue</h4>
                  <p className="text-sm text-muted-foreground">
                    Seuls les livres publies dans Supabase sont recommandes.
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
