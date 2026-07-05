-- ============================================================
-- BiblioTech - BibliAI contextual tutor page text index
-- ============================================================

CREATE TABLE IF NOT EXISTS public.book_page_texts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id       UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  page_number   INTEGER NOT NULL CHECK (page_number >= 1),
  content       TEXT NOT NULL,
  source        TEXT DEFAULT 'manual',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (book_id, page_number)
);

CREATE INDEX IF NOT EXISTS idx_book_page_texts_book_page
  ON public.book_page_texts (book_id, page_number);

CREATE INDEX IF NOT EXISTS idx_book_page_texts_full_text_fr
  ON public.book_page_texts
  USING gin (to_tsvector('french', coalesce(content, '')));

ALTER TABLE public.book_page_texts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS book_page_texts_select ON public.book_page_texts;
CREATE POLICY book_page_texts_select ON public.book_page_texts
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.books b
      WHERE b.id = book_page_texts.book_id
        AND b.status = 'publie'
    )
  );

DROP POLICY IF EXISTS book_page_texts_manage_admin ON public.book_page_texts;
CREATE POLICY book_page_texts_manage_admin ON public.book_page_texts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'super_admin')
    )
  );

DROP TRIGGER IF EXISTS trg_book_page_texts_updated_at ON public.book_page_texts;
CREATE TRIGGER trg_book_page_texts_updated_at
  BEFORE UPDATE ON public.book_page_texts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
