import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, Loader2, BookOpen } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { BookCard } from '@/components/features/BookCard';
import { BookViewer } from '@/components/features/BookViewer';
import { CategoryRow } from '@/components/features/CategoryRow';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/useToast';
import { bookCategories } from '@/data/booksData';
import type { GoogleBook } from '@/services/googleBooksService';
import { borrowBookInSupabase, fetchPublishedBooks, groupBooksByCategory, searchPublishedBooks } from '@/services/booksSupabase';
import { searchBooksViaNestJS } from '@/services/nestBooksAdapter';
import { listOfflineReaderBookIds } from '@/services/offlineReader';
import { useAuth } from '@/hooks/useAuth';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const } },
};

export default function Catalogue() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<GoogleBook | null>(null);
  const [booksByCategory, setBooksByCategory] = useState<Record<string, GoogleBook[]>>({});
  const [searchResults, setSearchResults] = useState<GoogleBook[]>([]);
  const [loadingCategories, setLoadingCategories] = useState<Record<string, boolean>>({});
  const [catalogueError, setCatalogueError] = useState<string | null>(null);
  const [allBooks, setAllBooks] = useState<GoogleBook[]>([]);
  const [offlineBookIds, setOfflineBookIds] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const { user } = useAuth();
  const { showToast } = useToast();
  const debouncedSearch = useDebounce(searchQuery, 400);

  useEffect(() => {
    let cancelled = false;
    
    async function loadBooks() {
      setLoadingCategories(Object.fromEntries(bookCategories.map(cat => [cat.id, true])));
      setCatalogueError(null);

      try {
        const books = await fetchPublishedBooks();
        if (cancelled) return;
        setAllBooks(books);
        setBooksByCategory(groupBooksByCategory(books));
      } catch (err) {
        if (cancelled) return;
        if (import.meta.env.DEV) console.error('Erreur chargement catalogue Supabase:', err);
        setAllBooks([]);
        setBooksByCategory({});
        setCatalogueError(err instanceof Error ? err.message : 'Impossible de charger les livres depuis Supabase.');
      } finally {
        if (!cancelled) setLoadingCategories({});
      }
    }
    
    loadBooks();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadOfflineIndicators() {
      try {
        const ids = await listOfflineReaderBookIds();
        if (!cancelled) setOfflineBookIds(new Set(ids));
      } catch {
        if (!cancelled) setOfflineBookIds(new Set());
      }
    }

    loadOfflineIndicators();
    window.addEventListener('offlineReaderUpdated', loadOfflineIndicators);
    return () => {
      cancelled = true;
      window.removeEventListener('offlineReaderUpdated', loadOfflineIndicators);
    };
  }, []);

  useEffect(() => {
    if (!debouncedSearch.trim()) { setSearchResults([]); setIsSearching(false); return; }
    const doSearch = async () => {
      setIsSearching(true);
      try {
        // Recherche via NestJS API en priorité, fallback Supabase
        const nestResults = await searchBooksViaNestJS(debouncedSearch);
        if (nestResults.length > 0) {
          setSearchResults(nestResults);
        } else {
          setSearchResults(await searchPublishedBooks(debouncedSearch));
        }
      }
      catch {
        setSearchResults([]);
        showToast('Erreur lors de la recherche', 'error');
      }
      finally { setIsSearching(false); }
    };
    doSearch();
  }, [debouncedSearch, showToast]);

  const handleSelectBook = useCallback((book: GoogleBook) => {
    setSelectedBook(prev => prev?.id === book.id ? null : book);
  }, []);

  const handleBorrow = useCallback(async (book: GoogleBook) => {
    if (!user?.id) {
      showToast('Connecte-toi pour emprunter un livre.', 'warning');
      return;
    }

    try {
      await borrowBookInSupabase(user.id, book.id);
      showToast(`Vous avez emprunté "${book.title}" avec succès ! 📚`, 'success');
      window.dispatchEvent(new Event('borrowsUpdated'));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur', 'error');
    }
  }, [showToast, user?.id]);

  const isSearchActive = debouncedSearch.trim().length > 0;
  const totalBooks = allBooks.length;
  const preferredCategories = user?.preferredCategories || [];
  const preferredCategorySet = new Set(preferredCategories);
  const preferredBooks = allBooks
    .filter(book => preferredCategorySet.has(book.category || ''))
    .slice(0, 18);
  const knownCategoryLabels = new Set(bookCategories.map(cat => cat.label));
  const extraCategories = Object.keys(booksByCategory)
    .filter(category => !knownCategoryLabels.has(category))
    .map(category => ({ id: category, label: category, emoji: '📚', query: category }));
  const orderedCategories = [...bookCategories, ...extraCategories].sort((a, b) => {
    const preferredA = preferredCategories.indexOf(a.label);
    const preferredB = preferredCategories.indexOf(b.label);
    if (preferredA !== -1 || preferredB !== -1) {
      return (preferredA === -1 ? 99 : preferredA) - (preferredB === -1 ? 99 : preferredB);
    }
    return 0;
  });
  const displayCategories = selectedCategory
    ? bookCategories.filter(c => c.id === selectedCategory)
    : orderedCategories;

  return (
    <DashboardLayout>
      <motion.div className="space-y-8" variants={containerVariants} initial="hidden" animate="visible">
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-primary/10 rounded-xl"><BookOpen className="w-6 h-6 text-primary" /></div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground">Catalogue</h1>
              <p className="text-sm text-muted-foreground mt-1">{totalBooks > 0 ? `${totalBooks} livres disponibles` : 'Chargement du catalogue...'}</p>
            </div>
          </div>
        </motion.div>

        {catalogueError && (
          <motion.div variants={itemVariants} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
            Livres Supabase indisponibles pour le moment : {catalogueError}
          </motion.div>
        )}

        <motion.div variants={itemVariants}>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input type="text" placeholder="Rechercher un livre par titre, auteur..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-12 py-3.5 rounded-xl border border-border/60 bg-card hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200 text-foreground placeholder:text-muted-foreground" />
            {isSearching && <Loader2 className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary animate-spin" />}
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-2 mb-3">
            <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-muted-foreground">Catégories</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hidden">
            <button onClick={() => setSelectedCategory(null)} className={`flex-shrink-0 px-4 py-2 rounded-full font-medium transition-all duration-200 text-sm ${selectedCategory === null ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'bg-muted text-foreground hover:bg-muted/80'}`}>🌐 Toutes</button>
            {bookCategories.map((cat) => (
              <button key={cat.id} onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full font-medium transition-all duration-200 text-sm whitespace-nowrap ${selectedCategory === cat.id ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'bg-muted text-foreground hover:bg-muted/80'}`}>
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>
        </motion.div>

        <BookViewer book={selectedBook} onClose={() => setSelectedBook(null)} onBorrow={handleBorrow} />

        {isSearchActive && (
          <motion.div variants={itemVariants} className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">Résultats pour "{debouncedSearch}" ({searchResults.length})</h2>
            {isSearching ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
            ) : searchResults.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {searchResults.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    isSelected={selectedBook?.id === book.id}
                    onSelect={handleSelectBook}
                    onBorrow={handleBorrow}
                    offlineAvailable={offlineBookIds.has(book.id)}
                  />
                ))}
              </div>
            ) : <p className="text-center py-12 text-muted-foreground">Aucun résultat trouvé</p>}
          </motion.div>
        )}

        {!isSearchActive && (
          <motion.div variants={containerVariants} className="space-y-10">
            {totalBooks === 0 && !catalogueError && !Object.keys(loadingCategories).length ? (
              <div className="text-center py-16 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucun livre publié dans Supabase pour le moment.</p>
              </div>
            ) : (
              <>
                {!selectedCategory && preferredBooks.length > 0 && (
                  <CategoryRow title="Selection pour toi" emoji="*" books={preferredBooks}
                    selectedBook={selectedBook} onSelectBook={handleSelectBook} onBorrowBook={handleBorrow} isLoading={false} offlineBookIds={offlineBookIds} />
                )}
                {displayCategories.map((cat) => (
                  <CategoryRow key={cat.id} title={cat.label} emoji={cat.emoji} books={booksByCategory[cat.label] || []}
                    selectedBook={selectedBook} onSelectBook={handleSelectBook} onBorrowBook={handleBorrow} isLoading={loadingCategories[cat.id]} offlineBookIds={offlineBookIds} />
                ))}
              </>
            )}
          </motion.div>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
