-- ============================================================
-- BiblioTech - Full-text search and anonymized analytics
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS public.search_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash      TEXT NOT NULL,
  query_length    INTEGER NOT NULL DEFAULT 0,
  filters         JSONB NOT NULL DEFAULT '{}',
  results_count   INTEGER NOT NULL DEFAULT 0,
  ip_hash         TEXT,
  user_agent_hash TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.search_logs IS 'Journaux anonymises des recherches catalogue';

CREATE INDEX IF NOT EXISTS idx_books_full_text_fr
  ON public.books
  USING gin (to_tsvector('french', coalesce(titre, '') || ' ' || coalesce(auteur, '') || ' ' || coalesce(description, '')));

CREATE INDEX IF NOT EXISTS idx_books_trgm_titre
  ON public.books
  USING gin (titre gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_books_trgm_auteur
  ON public.books
  USING gin (auteur gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_search_logs_created_at
  ON public.search_logs (created_at);

CREATE OR REPLACE FUNCTION public.search_books(
  p_query TEXT,
  p_categorie TEXT DEFAULT NULL,
  p_filiere TEXT DEFAULT NULL,
  p_type_acces TEXT DEFAULT NULL,
  p_prix_max INTEGER DEFAULT NULL,
  p_sort TEXT DEFAULT 'pertinence',
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  titre TEXT,
  auteur TEXT,
  categorie TEXT,
  sous_categorie TEXT,
  description TEXT,
  prix_achat INTEGER,
  prix_location INTEGER,
  type TEXT,
  format TEXT,
  pdf_url TEXT,
  read_url TEXT,
  cover_url TEXT,
  pages_count INTEGER,
  langue TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ,
  popularity BIGINT,
  note NUMERIC,
  rank REAL,
  similarity_score REAL
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
      b.sous_categorie,
      b.description,
      b.prix_achat,
      b.prix_location,
      b.type::TEXT AS type,
      b.format::TEXT AS format,
      b.pdf_url,
      b.read_url,
      b.cover_url,
      b.pages_count,
      b.langue,
      b.tags,
      b.created_at,
      COUNT(br.id)::BIGINT AS popularity,
      0::NUMERIC AS note,
      CASE
        WHEN normalized_query = '' THEN 0::REAL
        ELSE ts_rank_cd(
          to_tsvector('french', concat_ws(' ', b.titre, b.auteur, b.description)),
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
      END AS similarity_score
    FROM public.books b
    LEFT JOIN public.borrows br ON br.book_id = b.id
    WHERE b.status = 'publie'
      AND (
        normalized_query = ''
        OR to_tsvector('french', concat_ws(' ', b.titre, b.auteur, b.description)) @@ ts_query
        OR lower(b.titre) % normalized_query
        OR lower(b.auteur) % normalized_query
        OR lower(coalesce(b.description, '')) % normalized_query
        OR lower(b.titre) ILIKE '%' || normalized_query || '%'
        OR lower(b.auteur) ILIKE '%' || normalized_query || '%'
      )
      AND (p_categorie IS NULL OR b.categorie = p_categorie)
      AND (
        p_filiere IS NULL
        OR b.sous_categorie ILIKE '%' || p_filiere || '%'
        OR b.categorie ILIKE '%' || p_filiere || '%'
        OR b.tags && ARRAY[p_filiere]
      )
      AND (p_type_acces IS NULL OR b.type::TEXT = p_type_acces)
      AND (
        p_prix_max IS NULL
        OR coalesce(b.prix_achat, 0) <= p_prix_max
        OR coalesce(b.prix_location, 0) <= p_prix_max
      )
    GROUP BY b.id
  )
  SELECT *
  FROM scored
  ORDER BY
    CASE WHEN p_sort IN ('popularite', 'popularité', 'popularity') THEN popularity END DESC NULLS LAST,
    CASE WHEN p_sort = 'note' THEN note END DESC NULLS LAST,
    CASE WHEN p_sort = 'date' THEN created_at END DESC NULLS LAST,
    CASE WHEN p_sort NOT IN ('popularite', 'popularité', 'popularity', 'note', 'date') THEN (rank + similarity_score) END DESC NULLS LAST,
    titre ASC
  LIMIT LEAST(GREATEST(coalesce(p_limit, 20), 1), 50)
  OFFSET GREATEST(coalesce(p_offset, 0), 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.search_book_suggestions(
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
