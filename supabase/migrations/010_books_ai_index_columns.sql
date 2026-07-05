-- ============================================================
-- BiblioTech - Ensure book columns used by reader and BibliAI
-- ============================================================

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS read_url TEXT,
  ADD COLUMN IF NOT EXISTS extract TEXT;
