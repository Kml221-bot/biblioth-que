-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 019 — Rendre tous les livres existants gratuits
-- Les livres actuellement uploadés passent en type = 'gratuit'
-- Les nouveaux livres pourront avoir leur prix configuré manuellement.
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE public.books
SET type = 'gratuit'
WHERE type != 'gratuit';

-- Confirmer le résultat
DO $$
DECLARE
  total_books INTEGER;
  free_books  INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_books FROM public.books;
  SELECT COUNT(*) INTO free_books  FROM public.books WHERE type = 'gratuit';
  RAISE NOTICE 'Migration 019 : % livres au total, % en gratuit', total_books, free_books;
END;
$$;
