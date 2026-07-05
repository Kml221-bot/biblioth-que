-- Ajoute l'URL de lecture externe intégrée dans BiblioTech.
ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS read_url TEXT;
