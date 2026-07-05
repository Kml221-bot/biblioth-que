import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface RatingStarsProps {
  bookId: number;
  bookTitle: string;
  initialRating?: number;
  readOnly?: boolean;
  onRatingChange?: (rating: number) => void;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  bookId,
  bookTitle,
  initialRating = 0,
  readOnly = false,
  onRatingChange,
}) => {
  const [rating, setRating] = useState(initialRating);
  const [hoverRating, setHoverRating] = useState(0);
  const { showToast } = useToast();

  const handleRating = (value: number) => {
    if (readOnly) return;

    setRating(value);
    onRatingChange?.(value);
    showToast(`Vous avez noté "${bookTitle}" ${value}/5`, 'success');
  };

  const displayRating = hoverRating || rating;

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <motion.button
            key={star}
            onClick={() => handleRating(star)}
            onMouseEnter={() => !readOnly && setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            disabled={readOnly}
            className={`transition-all duration-200 ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
            whileHover={!readOnly ? { scale: 1.2 } : {}}
            whileTap={!readOnly ? { scale: 0.95 } : {}}
          >
            <Star
              className={`w-5 h-5 transition-all duration-200 ${
                star <= displayRating
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-muted-foreground'
              }`}
            />
          </motion.button>
        ))}
      </div>
      {rating > 0 && (
        <span className="text-sm font-semibold text-foreground">
          {rating}/5
        </span>
      )}
    </div>
  );
};
