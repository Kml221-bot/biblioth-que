-- ============================================================
-- BiblioTech - Notes, highlights, bookmarks, questions
-- ============================================================

ALTER TYPE note_type ADD VALUE IF NOT EXISTS 'signet';
ALTER TYPE note_type ADD VALUE IF NOT EXISTS 'question';

ALTER TABLE public.book_notes
  ADD CONSTRAINT book_notes_couleur_allowed
  CHECK (couleur IN ('jaune', 'vert', 'orange', 'violet', 'bleu', '#FFFF00'));

CREATE INDEX IF NOT EXISTS idx_book_notes_community_book
  ON public.book_notes (shared_with_community_id, book_id);

CREATE INDEX IF NOT EXISTS idx_book_notes_book_page
  ON public.book_notes (book_id, page);
