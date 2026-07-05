-- ============================================================
-- BiblioTech - Intelligent borrows system
-- ============================================================

ALTER TABLE public.borrows
  ADD COLUMN IF NOT EXISTS duree_jours INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS prix_location_fcfa INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS renewal_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS renewal_paid_fcfa INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_borrows_user_status_due
  ON public.borrows (user_id, statut, fin_prevue DESC);

CREATE INDEX IF NOT EXISTS idx_borrows_book_status_due
  ON public.borrows (book_id, statut, fin_prevue DESC);

CREATE TABLE IF NOT EXISTS public.book_reservations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  book_id     UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  statut      TEXT NOT NULL DEFAULT 'pending'
              CHECK (statut IN ('pending', 'fulfilled', 'cancelled', 'expired')),
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_book_reservations_book_status
  ON public.book_reservations (book_id, statut, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_book_reservations_user_status
  ON public.book_reservations (user_id, statut, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_book_reservations_one_pending
  ON public.book_reservations (user_id, book_id)
  WHERE statut = 'pending';

CREATE TABLE IF NOT EXISTS public.user_stats (
  user_id            UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_emprunts     INTEGER NOT NULL DEFAULT 0,
  total_livres_lus   INTEGER NOT NULL DEFAULT 0,
  pages_lues         INTEGER NOT NULL DEFAULT 0,
  minutes_lecture    INTEGER NOT NULL DEFAULT 0,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.book_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS book_reservations_select ON public.book_reservations;
CREATE POLICY book_reservations_select ON public.book_reservations
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS book_reservations_insert ON public.book_reservations;
CREATE POLICY book_reservations_insert ON public.book_reservations
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS book_reservations_update ON public.book_reservations;
CREATE POLICY book_reservations_update ON public.book_reservations
  FOR UPDATE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS user_stats_select ON public.user_stats;
CREATE POLICY user_stats_select ON public.user_stats
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS user_stats_insert ON public.user_stats;
CREATE POLICY user_stats_insert ON public.user_stats
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_stats_update ON public.user_stats;
CREATE POLICY user_stats_update ON public.user_stats
  FOR UPDATE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'super_admin')
    )
  );

DROP TRIGGER IF EXISTS trg_book_reservations_updated_at ON public.book_reservations;
CREATE TRIGGER trg_book_reservations_updated_at
  BEFORE UPDATE ON public.book_reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION public.touch_user_stats_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_stats_updated_at ON public.user_stats;
CREATE TRIGGER trg_user_stats_updated_at
  BEFORE UPDATE ON public.user_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_user_stats_updated_at();
