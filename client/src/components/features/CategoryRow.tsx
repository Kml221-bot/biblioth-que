import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BookCard } from './BookCard';
import type { GoogleBook } from '@/services/googleBooksService';

interface CategoryRowProps {
  title: string;
  emoji: string;
  books: GoogleBook[];
  selectedBook: GoogleBook | null;
  onSelectBook: (book: GoogleBook) => void;
  onBorrowBook: (book: GoogleBook) => void;
  isLoading?: boolean;
  offlineBookIds?: Set<string>;
}

export const CategoryRow: React.FC<CategoryRowProps> = ({
  title,
  emoji,
  books,
  selectedBook,
  onSelectBook,
  onBorrowBook,
  isLoading = false,
  offlineBookIds = new Set(),
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    updateScrollButtons();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', updateScrollButtons, { passive: true });
      return () => el.removeEventListener('scroll', updateScrollButtons);
    }
  }, [books]);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.7;
    el.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{emoji}</span>
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[200px] sm:w-[220px] rounded-xl bg-muted animate-pulse"
            >
              <div className="h-[280px] sm:h-[300px] bg-muted-foreground/10 rounded-t-xl" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-muted-foreground/10 rounded w-3/4" />
                <div className="h-3 bg-muted-foreground/10 rounded w-1/2" />
                <div className="h-3 bg-muted-foreground/10 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (books.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      {/* Category Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{emoji}</span>
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          <span className="text-sm text-muted-foreground ml-2">
            {books.length} livres
          </span>
        </div>
      </div>

      {/* Scrollable Row */}
      <div className="relative group/row">
        {/* Left Arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-0 bottom-0 z-10 w-12 flex items-center justify-center bg-gradient-to-r from-background via-background/80 to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity duration-200"
          >
            <div className="p-2 rounded-full bg-card shadow-lg border border-border hover:bg-muted transition-colors">
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </div>
          </button>
        )}

        {/* Right Arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-0 bottom-0 z-10 w-12 flex items-center justify-center bg-gradient-to-l from-background via-background/80 to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity duration-200"
          >
            <div className="p-2 rounded-full bg-card shadow-lg border border-border hover:bg-muted transition-colors">
              <ChevronRight className="w-5 h-5 text-foreground" />
            </div>
          </button>
        )}

        {/* Books Scroll Container */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4 scrollbar-hidden"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              isSelected={selectedBook?.id === book.id}
              onSelect={onSelectBook}
              onBorrow={onBorrowBook}
              offlineAvailable={offlineBookIds.has(book.id)}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};
