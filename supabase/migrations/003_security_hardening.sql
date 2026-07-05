-- BiblioTech - Security hardening for client-facing RLS policies.

-- Profiles: users can edit only non-privileged profile fields.
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id
  ) WITH CHECK (
    auth.uid() = id
    AND email = (SELECT p.email FROM public.profiles p WHERE p.id = auth.uid())
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
    AND plan = (SELECT p.plan FROM public.profiles p WHERE p.id = auth.uid())
    AND wallet_balance = (SELECT p.wallet_balance FROM public.profiles p WHERE p.id = auth.uid())
    AND is_active = (SELECT p.is_active FROM public.profiles p WHERE p.id = auth.uid())
    AND referral_code IS NOT DISTINCT FROM (SELECT p.referral_code FROM public.profiles p WHERE p.id = auth.uid())
    AND referred_by IS NOT DISTINCT FROM (SELECT p.referred_by FROM public.profiles p WHERE p.id = auth.uid())
    AND trial_ends_at IS NOT DISTINCT FROM (SELECT p.trial_ends_at FROM public.profiles p WHERE p.id = auth.uid())
  );

-- Borrows: users may create/select their borrows, but lifecycle and penalties are server/admin controlled.
DROP POLICY IF EXISTS borrows_update ON public.borrows;
CREATE POLICY borrows_update_admin ON public.borrows
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

-- Reading progress: keep ownership stable on upserts/updates.
DROP POLICY IF EXISTS reading_progress_update ON public.reading_progress;
CREATE POLICY reading_progress_update ON public.reading_progress
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Book notes: keep ownership stable on edits.
DROP POLICY IF EXISTS book_notes_update ON public.book_notes;
CREATE POLICY book_notes_update ON public.book_notes
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Community membership: users cannot grant themselves moderator/admin on arbitrary communities.
DROP POLICY IF EXISTS community_members_insert ON public.community_members;
CREATE POLICY community_members_insert ON public.community_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (
      role = 'member'
      OR (
        role = 'admin'
        AND EXISTS (
          SELECT 1 FROM public.communities c
          WHERE c.id = community_id AND c.createur_id = auth.uid()
        )
      )
    )
  );

-- Marketplace listings: sellers cannot transfer ownership during an update.
DROP POLICY IF EXISTS marketplace_listings_update ON public.marketplace_listings;
CREATE POLICY marketplace_listings_update ON public.marketplace_listings
  FOR UPDATE USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);
