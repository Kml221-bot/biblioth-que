-- ============================================================
-- BiblioTech — Migration: EPUB Reader & Gamification
-- Ajoute le support EPUB (epubcfi), enrichit les stats utilisateur,
-- crée les tables reading_progress et user_reading_preferences
-- ============================================================

-- ─── 1. Enrichir book_notes avec les champs EPUB ──────────
ALTER TABLE public.book_notes
  ADD COLUMN IF NOT EXISTS epubcfi TEXT,
  ADD COLUMN IF NOT EXISTS selected_text TEXT,
  ADD COLUMN IF NOT EXISTS chapter_label TEXT;

-- Index pour recherche par epubcfi
CREATE INDEX IF NOT EXISTS idx_book_notes_epubcfi
  ON public.book_notes (book_id, epubcfi)
  WHERE epubcfi IS NOT NULL;

-- ─── 2. Enrichir user_stats avec gamification ─────────────
ALTER TABLE public.user_stats
  ADD COLUMN IF NOT EXISTS best_streak INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS biblio_coins INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weekly_goal_minutes INTEGER DEFAULT 60,
  ADD COLUMN IF NOT EXISTS weekly_progress_min INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS freeze_used_this_week BOOLEAN DEFAULT FALSE;

-- Mettre à jour best_streak = streak_jours pour les données existantes
UPDATE public.user_stats
  SET best_streak = streak_jours
  WHERE best_streak = 0 AND streak_jours > 0;

-- ─── 3. Créer table reading_progress ──────────────────────
CREATE TABLE IF NOT EXISTS public.reading_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  current_page INTEGER DEFAULT 1,
  total_pages INTEGER DEFAULT 0,
  pourcentage_lu DECIMAL(5,2) DEFAULT 0.00,
  temps_lecture_minutes INTEGER DEFAULT 0,
  epubcfi TEXT,
  chapitres_lus INTEGER DEFAULT 0,
  derniere_lecture TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, book_id)
);

-- Index pour requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_reading_progress_user_last_read
  ON public.reading_progress (user_id, derniere_lecture DESC);

-- ─── 4. Créer table user_reading_preferences ──────────────
CREATE TABLE IF NOT EXISTS public.user_reading_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'sepia',
  font_family TEXT DEFAULT 'jakarta',
  font_size INTEGER DEFAULT 18,
  line_height DECIMAL(3,1) DEFAULT 1.8,
  margin TEXT DEFAULT 'normal',
  justified BOOLEAN DEFAULT TRUE,
  brightness DECIMAL(3,2) DEFAULT 1.00,
  reading_mode TEXT DEFAULT 'paginated',
  auto_night BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 5. RLS (Row Level Security) ─────────────────────────
-- reading_progress
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own reading progress" ON public.reading_progress;
CREATE POLICY "Users can view own reading progress"
  ON public.reading_progress FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own reading progress" ON public.reading_progress;
CREATE POLICY "Users can insert own reading progress"
  ON public.reading_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own reading progress" ON public.reading_progress;
CREATE POLICY "Users can update own reading progress"
  ON public.reading_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- user_reading_preferences
ALTER TABLE public.user_reading_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own reading prefs" ON public.user_reading_preferences;
CREATE POLICY "Users can view own reading prefs"
  ON public.user_reading_preferences FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own reading prefs" ON public.user_reading_preferences;
CREATE POLICY "Users can insert own reading prefs"
  ON public.user_reading_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own reading prefs" ON public.user_reading_preferences;
CREATE POLICY "Users can update own reading prefs"
  ON public.user_reading_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- ─── 6. Fonction updated_at automatique ───────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers updated_at
DROP TRIGGER IF EXISTS set_reading_progress_updated_at ON public.reading_progress;
CREATE TRIGGER set_reading_progress_updated_at
  BEFORE UPDATE ON public.reading_progress
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_user_reading_prefs_updated_at ON public.user_reading_preferences;
CREATE TRIGGER set_user_reading_prefs_updated_at
  BEFORE UPDATE ON public.user_reading_preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─── 7. Seed les badges par défaut ────────────────────────
INSERT INTO public.badges (code, nom, description, type) VALUES
  ('first-read',  'Premier pas',  'Lire un premier livre',        'lecture'),
  ('streak-3',    'Régulier',     'Streak de 3 jours',            'streak'),
  ('streak-7',    'Habitué',      'Streak de 7 jours',            'streak'),
  ('streak-30',   'Passionné',    'Streak de 30 jours',           'streak'),
  ('pages-100',   'Explorateur',  'Lire 100 pages',               'lecture'),
  ('pages-500',   'Aventurier',   'Lire 500 pages',               'lecture'),
  ('books-5',     'Bibliophile',  'Terminer 5 livres',            'lecture'),
  ('books-10',    'Dévoreur',     'Terminer 10 livres',           'lecture'),
  ('night-owl',   'Hibou',        'Lire après minuit',            'special'),
  ('note-taker',  'Annotateur',   'Créer 20 annotations',         'social')
ON CONFLICT (code) DO NOTHING;
