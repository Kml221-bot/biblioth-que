import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface FavoritesButtonProps {
  bookId: number;
  bookTitle: string;
  initialFavorite?: boolean;
  onToggle?: (isFavorite: boolean) => void;
}

export const FavoritesButton: React.FC<FavoritesButtonProps> = ({
  bookId,
  bookTitle,
  initialFavorite = false,
  onToggle,
}) => {
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const { showToast } = useToast();

  const handleToggle = () => {
    const newState = !isFavorite;
    setIsFavorite(newState);

    if (newState) {
      showToast(`"${bookTitle}" ajouté aux favoris`, 'success');
    } else {
      showToast(`"${bookTitle}" retiré des favoris`, 'info');
    }

    onToggle?.(newState);
  };

  return (
    <motion.button
      onClick={handleToggle}
      className={`p-2 rounded-lg transition-all duration-200 ${
        isFavorite
          ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
          : 'bg-muted text-muted-foreground hover:bg-muted/80'
      }`}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        initial={false}
        animate={{ scale: isFavorite ? [1, 1.3, 1] : 1 }}
        transition={{ duration: 0.3 }}
      >
        <Heart
          className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`}
        />
      </motion.div>
    </motion.button>
  );
};
