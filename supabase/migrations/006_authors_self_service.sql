-- ============================================================
-- BiblioTech - Author self-service workspace
-- ============================================================

ALTER TABLE public.author_profiles
  ADD COLUMN IF NOT EXISTS statut TEXT NOT NULL DEFAULT 'pending'
    CHECK (statut IN ('pending', 'approved', 'rejected', 'suspended')),
  ADD COLUMN IF NOT EXISTS identity_document_url TEXT,
  ADD COLUMN IF NOT EXISTS identity_document_path TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS author_profile_id UUID REFERENCES public.author_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS extract TEXT;

CREATE TABLE IF NOT EXISTS public.author_withdrawals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_profile_id     UUID NOT NULL REFERENCES public.author_profiles(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  montant               INTEGER NOT NULL CHECK (montant >= 1000),
  provider              payment_provider DEFAULT 'naboopay',
  wave_number           TEXT NOT NULL,
  statut                TEXT NOT NULL DEFAULT 'pending'
                        CHECK (statut IN ('pending', 'processing', 'paid', 'failed', 'cancelled')),
  reference_externe     TEXT,
  metadata              JSONB DEFAULT '{}',
  requested_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at          TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  target_type TEXT,
  target_id   UUID,
  metadata    JSONB DEFAULT '{}',
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_author_profiles_user_id ON public.author_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_author_profiles_statut ON public.author_profiles (statut);
CREATE INDEX IF NOT EXISTS idx_books_author_profile_id ON public.books (author_profile_id);
CREATE INDEX IF NOT EXISTS idx_author_withdrawals_author_profile_id ON public.author_withdrawals (author_profile_id);
CREATE INDEX IF NOT EXISTS idx_author_withdrawals_statut ON public.author_withdrawals (statut);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON public.admin_notifications (created_at);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_read_at ON public.admin_notifications (read_at);

ALTER TABLE public.author_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS author_withdrawals_select ON public.author_withdrawals;
CREATE POLICY author_withdrawals_select ON public.author_withdrawals
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS author_withdrawals_insert ON public.author_withdrawals;
CREATE POLICY author_withdrawals_insert ON public.author_withdrawals
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS admin_notifications_select ON public.admin_notifications;
CREATE POLICY admin_notifications_select ON public.admin_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'super_admin')
    )
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('author-documents', 'author-documents', false, 10485760, ARRAY['image/jpeg', 'image/png', 'application/pdf']),
  ('author-books', 'author-books', false, 52428800, ARRAY['application/pdf', 'application/epub+zip']),
  ('book-covers', 'book-covers', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;
