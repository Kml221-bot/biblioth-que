CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_books_search_fulltext
  ON public.books USING gin (
    to_tsvector(
      'french',
      coalesce(titre, '') || ' ' ||
      coalesce(auteur, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(categorie, '')
    )
  );

CREATE INDEX IF NOT EXISTS idx_books_titre_trgm
  ON public.books USING gin (titre gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_books_auteur_trgm
  ON public.books USING gin (auteur gin_trgm_ops);
