import React from 'react';
import { motion } from 'framer-motion';
import { Star, BookOpen, Heart, ArrowRight, Sparkles } from 'lucide-react';
import { CatalogueBook, PersonalizedRec } from '@/services/aiService';
import { Badge } from '@/components/ui/Badge';
import { BookCoverPlaceholder } from '@/components/features/BookCoverPlaceholder';

interface AIRecommendationsProps {
  books: CatalogueBook[];
}

export const AIRecommendations: React.FC<AIRecommendationsProps> = ({ books }) => {
  if (!books || books.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="ml-11 mt-2"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {books.map((book, index) => (
          <motion.div
            key={book.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: index * 0.1 }}
            className="p-3 rounded-xl border border-border bg-card hover:shadow-md transition-all duration-200 cursor-pointer group"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-14 rounded-md overflow-hidden flex-shrink-0 bg-muted shadow-sm">
                <BookCoverPlaceholder title={book.title} author={book.author} id={String(book.id)} variant="sm" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                  {book.title}
                </h4>
                <p className="text-xs text-muted-foreground truncate">{book.author}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    <span className="text-xs font-medium text-foreground">{book.rating}</span>
                  </div>
                  <Badge
                    variant={book.available ? 'success' : 'danger'}
                    size="sm"
                  >
                    {book.available ? 'Disponible' : 'Indisponible'}
                  </Badge>
                </div>
                {book.description && (
                  <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                    {book.description}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

// ─── Section "Parce que vous aimez X → voici Y" ───────────────
interface PersonalizedRecsProps {
  recommendations: PersonalizedRec[];
}

export const PersonalizedRecommendations: React.FC<PersonalizedRecsProps> = ({ recommendations }) => {
  if (!recommendations || recommendations.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="ml-11 mt-3"
    >
      <div className="ai-personalized-header">
        <Sparkles className="w-4 h-4 text-purple-500" />
        <span>Recommandations personnalisées</span>
      </div>
      <div className="space-y-2 mt-2">
        {recommendations.map((rec, index) => (
          <motion.div
            key={rec.book.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 * index }}
            className="ai-personalized-card group"
          >
            <div className="ai-personalized-because">
              <Heart className="w-3 h-3 text-rose-500 fill-rose-500 flex-shrink-0" />
              <span>Parce que vous aimez <strong>{rec.because}</strong></span>
              <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            </div>
            <div className="flex items-start gap-3 mt-2">
              <div className="w-10 h-14 rounded-md overflow-hidden flex-shrink-0 bg-muted shadow-sm">
                <BookCoverPlaceholder title={rec.book.title} author={rec.book.author} id={String(rec.book.id)} variant="sm" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                  {rec.book.title}
                </h4>
                <p className="text-xs text-muted-foreground truncate">{rec.book.author}</p>
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 italic line-clamp-2">
                  {rec.reason}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    <span className="text-xs font-medium text-foreground">{rec.book.rating}</span>
                  </div>
                  <Badge variant={rec.book.available ? 'success' : 'danger'} size="sm">
                    {rec.book.available ? 'Disponible' : 'Indisponible'}
                  </Badge>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
