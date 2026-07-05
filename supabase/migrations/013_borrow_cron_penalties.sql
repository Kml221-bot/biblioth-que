-- ============================================================
-- BiblioTech - Automatic borrow reminders, penalties and quotas
-- ============================================================

ALTER TABLE public.borrows
  ADD COLUMN IF NOT EXISTS rappel_j3_envoye BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rappel_j1_envoye BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS penalty_stage INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS emprunts_restants INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS wave_auto_debit_token TEXT;

ALTER TABLE public.penalties
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_borrows_reminders_due
  ON public.borrows (statut, fin_prevue, rappel_j3_envoye, rappel_j1_envoye);

CREATE INDEX IF NOT EXISTS idx_penalties_borrow_pending
  ON public.penalties (borrow_id, statut);

DROP TRIGGER IF EXISTS trg_penalties_updated_at ON public.penalties;
CREATE TRIGGER trg_penalties_updated_at
  BEFORE UPDATE ON public.penalties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
