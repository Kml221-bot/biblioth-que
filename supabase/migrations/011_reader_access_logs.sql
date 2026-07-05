-- ============================================================
-- BiblioTech - Secure reader access and offline download logs
-- ============================================================

CREATE TABLE IF NOT EXISTS public.reader_access_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  book_id     UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  action      TEXT NOT NULL CHECK (action IN ('signed_url', 'offline_token', 'offline_download')),
  metadata    JSONB DEFAULT '{}',
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reader_access_logs_user_book
  ON public.reader_access_logs (user_id, book_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reader_access_logs_action
  ON public.reader_access_logs (action, created_at DESC);

ALTER TABLE public.reader_access_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reader_access_logs_select ON public.reader_access_logs;
CREATE POLICY reader_access_logs_select ON public.reader_access_logs
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'super_admin')
    )
  );
