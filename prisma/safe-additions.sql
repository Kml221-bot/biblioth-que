CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

DO $$
BEGIN
  CREATE TYPE public.user_status AS ENUM ('active', 'suspended', 'deleted');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE public.book_status ADD VALUE IF NOT EXISTS 'pending';
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE public.borrow_status ADD VALUE IF NOT EXISTS 'lost';
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE public.transaction_status ADD VALUE IF NOT EXISTS 'canceled';
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status public.user_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS anonymized_at timestamptz;

UPDATE public.profiles
SET status = CASE WHEN is_active THEN 'active'::public.user_status ELSE 'suspended'::public.user_status END
WHERE status IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique ON public.profiles (email);

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS reviews_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

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

ALTER TABLE public.book_notes
  ADD COLUMN IF NOT EXISTS likes_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

ALTER TABLE public.book_notes
  ALTER COLUMN contenu DROP NOT NULL;

ALTER TABLE public.book_notes
  DROP CONSTRAINT IF EXISTS book_notes_couleur_allowed;

CREATE TABLE IF NOT EXISTS public.book_note_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES public.book_notes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT book_note_likes_note_id_user_id_key UNIQUE (note_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_book_note_likes_user_id ON public.book_note_likes (user_id);

ALTER TABLE public.book_page_texts
  ADD COLUMN IF NOT EXISTS metadata jsonb;

ALTER TABLE public.borrows
  ADD COLUMN IF NOT EXISTS page_actuelle integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS pourcentage_lu numeric(5, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nb_renouvellements integer NOT NULL DEFAULT 0;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS emprunts_restants integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS starts_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS ends_at timestamptz;

ALTER TABLE public.subscriptions
  ALTER COLUMN fin DROP NOT NULL,
  ALTER COLUMN montant_mensuel SET DEFAULT 0,
  ALTER COLUMN montant_mensuel DROP NOT NULL;

UPDATE public.subscriptions
SET starts_at = COALESCE(starts_at, debut),
    ends_at = COALESCE(ends_at, fin),
    status = COALESCE(status, statut, 'active');

ALTER TABLE public.user_stats
  ADD COLUMN IF NOT EXISTS id uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS livres_lus integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_jours integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS categories_favorites text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_read_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS user_stats_id_unique ON public.user_stats (id);

CREATE TABLE IF NOT EXISTS public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  contenu text NOT NULL,
  status text NOT NULL DEFAULT 'published',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_posts_community_created_at
  ON public.community_posts (community_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_posts_author_id
  ON public.community_posts (author_id);

CREATE TABLE IF NOT EXISTS public.marketplace_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_messages_listing_created_at
  ON public.marketplace_messages (listing_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketplace_messages_receiver_read_at
  ON public.marketplace_messages (receiver_id, read_at);

CREATE TABLE IF NOT EXISTS public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  nom text NOT NULL,
  description text NOT NULL,
  type text NOT NULL,
  icon_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_badges_type ON public.badges (type);

CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_badges_user_id_badge_id_key UNIQUE (user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON public.user_badges (badge_id);

CREATE TABLE IF NOT EXISTS public.affiliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  code text NOT NULL,
  reward_fcfa integer NOT NULL DEFAULT 0,
  rewarded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliations_referrer_id ON public.affiliations (referrer_id);
CREATE INDEX IF NOT EXISTS idx_affiliations_code ON public.affiliations (code);

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  priority integer NOT NULL DEFAULT 2,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_status
  ON public.support_tickets (user_id, status);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status_priority
  ON public.support_tickets (status, priority);
