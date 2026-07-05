-- ============================================================
-- BiblioTech - Books catalogue API support and reviews
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS filiere TEXT,
  ADD COLUMN IF NOT EXISTS type_acces TEXT,
  ADD COLUMN IF NOT EXISTS prix_location_7j INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prix_location_30j INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS note_moyenne NUMERIC(3,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nb_emprunts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nb_vues INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT false;

UPDATE public.books
SET
  type_acces = COALESCE(type_acces, type::TEXT),
  prix_location_7j = CASE
    WHEN prix_location_7j = 0 THEN COALESCE(prix_location, 0)
    ELSE prix_location_7j
  END,
  prix_location_30j = CASE
    WHEN prix_location_30j = 0 THEN GREATEST(COALESCE(prix_location, 0) * 3, COALESCE(prix_location, 0))
    ELSE prix_location_30j
  END,
  filiere = COALESCE(filiere, sous_categorie)
WHERE type_acces IS NULL
   OR prix_location_7j = 0
   OR prix_location_30j = 0
   OR filiere IS NULL;

UPDATE public.books b
SET nb_emprunts = counts.total
FROM (
  SELECT book_id, COUNT(*)::INTEGER AS total
  FROM public.borrows
  GROUP BY book_id
) counts
WHERE counts.book_id = b.id;

CREATE TABLE IF NOT EXISTS public.book_reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id     UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note        INTEGER NOT NULL CHECK (note BETWEEN 1 AND 5),
  commentaire TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (book_id, user_id)
);

COMMENT ON TABLE public.book_reviews IS 'Avis utilisateurs sur les livres du catalogue';

CREATE INDEX IF NOT EXISTS idx_books_catalogue_priority
  ON public.books (categorie, featured, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_books_featured
  ON public.books (featured)
  WHERE featured = true;

CREATE INDEX IF NOT EXISTS idx_books_filiere
  ON public.books (filiere);

CREATE INDEX IF NOT EXISTS idx_books_type_acces
  ON public.books (type_acces);

CREATE INDEX IF NOT EXISTS idx_books_note_moyenne
  ON public.books (note_moyenne DESC);

CREATE INDEX IF NOT EXISTS idx_books_nb_emprunts
  ON public.books (nb_emprunts DESC);

CREATE INDEX IF NOT EXISTS idx_books_nb_vues
  ON public.books (nb_vues DESC);

CREATE INDEX IF NOT EXISTS idx_books_catalogue_full_text_fr
  ON public.books
  USING gin (to_tsvector(
    'french',
    coalesce(titre, '') || ' ' ||
    coalesce(auteur, '') || ' ' ||
    coalesce(description, '') || ' ' ||
    coalesce(categorie, '') || ' ' ||
    coalesce(filiere, '')
  ));

CREATE INDEX IF NOT EXISTS idx_books_catalogue_trgm_description
  ON public.books
  USING gin (description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_book_reviews_book_id
  ON public.book_reviews (book_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_book_reviews_user_id
  ON public.book_reviews (user_id);

ALTER TABLE public.book_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS book_reviews_select ON public.book_reviews;
CREATE POLICY book_reviews_select ON public.book_reviews
  FOR SELECT USING (true);

DROP POLICY IF EXISTS book_reviews_insert ON public.book_reviews;
CREATE POLICY book_reviews_insert ON public.book_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS book_reviews_update ON public.book_reviews;
CREATE POLICY book_reviews_update ON public.book_reviews
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS book_reviews_delete ON public.book_reviews;
CREATE POLICY book_reviews_delete ON public.book_reviews
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'super_admin')
    )
  );

DROP TRIGGER IF EXISTS trg_book_reviews_updated_at ON public.book_reviews;
CREATE TRIGGER trg_book_reviews_updated_at
  BEFORE UPDATE ON public.book_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION public.refresh_book_review_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_book_id UUID;
BEGIN
  target_book_id := COALESCE(NEW.book_id, OLD.book_id);

  UPDATE public.books b
  SET note_moyenne = COALESCE((
    SELECT ROUND(AVG(r.note)::NUMERIC, 2)
    FROM public.book_reviews r
    WHERE r.book_id = target_book_id
  ), 0)
  WHERE b.id = target_book_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_book_reviews_refresh_stats ON public.book_reviews;
CREATE TRIGGER trg_book_reviews_refresh_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.book_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.refresh_book_review_stats();

CREATE OR REPLACE FUNCTION public.increment_book_borrow_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.books
  SET nb_emprunts = COALESCE(nb_emprunts, 0) + 1
  WHERE id = NEW.book_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_borrows_increment_book_count ON public.borrows;
CREATE TRIGGER trg_borrows_increment_book_count
  AFTER INSERT ON public.borrows
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_book_borrow_count();

CREATE OR REPLACE FUNCTION public.increment_book_view_count(p_book_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE public.books
  SET nb_vues = COALESCE(nb_vues, 0) + 1
  WHERE id = p_book_id
  RETURNING nb_vues INTO new_count;

  RETURN COALESCE(new_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.books_catalogue_search(
  p_query TEXT,
  p_categorie TEXT DEFAULT NULL,
  p_filiere TEXT DEFAULT NULL,
  p_type_acces TEXT DEFAULT NULL,
  p_statut TEXT DEFAULT 'publie',
  p_featured BOOLEAN DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  titre TEXT,
  auteur TEXT,
  categorie TEXT,
  prix_achat INTEGER,
  prix_location_7j INTEGER,
  prix_location_30j INTEGER,
  cover_url TEXT,
  note_moyenne NUMERIC,
  nb_emprunts INTEGER,
  type_acces TEXT,
  statut TEXT,
  featured BOOLEAN,
  rank REAL,
  similarity_score REAL,
  category_priority INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  normalized_query TEXT := lower(trim(coalesce(p_query, '')));
  ts_query tsquery;
BEGIN
  IF normalized_query <> '' THEN
    ts_query := websearch_to_tsquery('french', normalized_query);
  END IF;

  RETURN QUERY
  WITH scored AS (
    SELECT
      b.id,
      b.titre,
      b.auteur,
      b.categorie,
      b.prix_achat,
      b.prix_location_7j,
      b.prix_location_30j,
      b.cover_url,
      b.note_moyenne,
      b.nb_emprunts,
      COALESCE(b.type_acces, b.type::TEXT) AS type_acces,
      b.status::TEXT AS statut,
      b.featured,
      CASE
        WHEN normalized_query = '' THEN 0::REAL
        ELSE ts_rank_cd(
          to_tsvector('french', concat_ws(' ', b.titre, b.auteur, b.description, b.categorie, b.filiere)),
          ts_query
        )
      END AS rank,
      CASE
        WHEN normalized_query = '' THEN 0::REAL
        ELSE GREATEST(
          similarity(lower(b.titre), normalized_query),
          similarity(lower(b.auteur), normalized_query),
          similarity(lower(coalesce(b.description, '')), normalized_query)
        )
      END AS similarity_score,
      CASE b.categorie
        WHEN 'Informatique & Cybersécurité' THEN 1
        WHEN 'Développement Personnel' THEN 2
        WHEN 'Littérature Africaine & Sénégalaise' THEN 3
        WHEN 'Économie & Business' THEN 4
        WHEN 'Dark Romance' THEN 5
        WHEN 'Manga & BD' THEN 6
        WHEN 'Droit & Sciences Politiques' THEN 7
        ELSE 99
      END AS category_priority,
      b.created_at
    FROM public.books b
    WHERE (p_statut IS NULL OR b.status::TEXT = p_statut)
      AND (p_categorie IS NULL OR b.categorie = p_categorie)
      AND (
        p_filiere IS NULL
        OR b.filiere ILIKE '%' || p_filiere || '%'
        OR b.sous_categorie ILIKE '%' || p_filiere || '%'
        OR b.tags && ARRAY[p_filiere]
      )
      AND (p_type_acces IS NULL OR COALESCE(b.type_acces, b.type::TEXT) = p_type_acces)
      AND (p_featured IS NULL OR b.featured = p_featured)
      AND (
        normalized_query = ''
        OR to_tsvector('french', concat_ws(' ', b.titre, b.auteur, b.description, b.categorie, b.filiere)) @@ ts_query
        OR lower(b.titre) % normalized_query
        OR lower(b.auteur) % normalized_query
        OR lower(coalesce(b.description, '')) % normalized_query
        OR lower(b.titre) ILIKE '%' || normalized_query || '%'
        OR lower(b.auteur) ILIKE '%' || normalized_query || '%'
        OR lower(coalesce(b.description, '')) ILIKE '%' || normalized_query || '%'
      )
  )
  SELECT *
  FROM scored
  ORDER BY
    CASE WHEN normalized_query <> '' THEN (rank + similarity_score) END DESC NULLS LAST,
    category_priority ASC,
    featured DESC,
    nb_emprunts DESC,
    note_moyenne DESC,
    created_at DESC
  LIMIT LEAST(GREATEST(coalesce(p_limit, 20), 1), 100)
  OFFSET GREATEST(coalesce(p_offset, 0), 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.books_catalogue_suggestions(
  p_query TEXT,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  value TEXT,
  type TEXT,
  score REAL
)
LANGUAGE sql
STABLE
AS $$
  WITH normalized AS (
    SELECT lower(trim(coalesce(p_query, ''))) AS q
  ),
  candidates AS (
    SELECT DISTINCT b.titre AS value, 'title'::TEXT AS type, similarity(lower(b.titre), n.q) AS score
    FROM public.books b, normalized n
    WHERE b.status = 'publie'
      AND n.q <> ''
      AND (lower(b.titre) % n.q OR lower(b.titre) ILIKE '%' || n.q || '%')

    UNION ALL

    SELECT DISTINCT b.auteur AS value, 'author'::TEXT AS type, similarity(lower(b.auteur), n.q) AS score
    FROM public.books b, normalized n
    WHERE b.status = 'publie'
      AND n.q <> ''
      AND (lower(b.auteur) % n.q OR lower(b.auteur) ILIKE '%' || n.q || '%')
  )
  SELECT value, type, score
  FROM candidates
  WHERE value IS NOT NULL AND value <> ''
  ORDER BY score DESC, value ASC
  LIMIT LEAST(GREATEST(coalesce(p_limit, 5), 1), 5);
$$;
