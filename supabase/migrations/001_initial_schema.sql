-- ═══════════════════════════════════════════════════════════════════════════════
-- BiblioTech — Migration initiale du schéma de la base de données
-- Plateforme SaaS de gestion de bibliothèque numérique
-- Créé le : 2026-05-19
-- ═══════════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 1 : TYPES ÉNUMÉRÉS (ENUMS)
-- Définition de tous les types personnalisés utilisés dans le schéma
-- ═══════════════════════════════════════════════════════════════════════════════

-- Rôles des utilisateurs sur la plateforme
CREATE TYPE user_role AS ENUM ('user', 'author', 'admin', 'super_admin');

-- Plans d'abonnement disponibles
CREATE TYPE subscription_plan AS ENUM ('free', 'student', 'premium', 'school');

-- Types de livres selon leur modèle de tarification
CREATE TYPE book_type AS ENUM ('gratuit', 'payant', 'premium');

-- Formats de fichier supportés pour les livres numériques
CREATE TYPE book_format AS ENUM ('pdf', 'epub', 'pdf_epub');

-- États possibles d'un livre dans le catalogue
CREATE TYPE book_status AS ENUM ('brouillon', 'publie', 'suspendu', 'archive');

-- Statuts d'un emprunt de livre
CREATE TYPE borrow_status AS ENUM ('actif', 'prolonge', 'retard', 'rendu');

-- Types de transactions financières
CREATE TYPE transaction_type AS ENUM ('achat', 'location', 'amende', 'abonnement', 'commission', 'remboursement');

-- Statuts d'une transaction financière
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- Fournisseurs de paiement mobile intégrés
CREATE TYPE payment_provider AS ENUM ('wave', 'orange_money', 'naboopay', 'free_plan');

-- Statuts d'une pénalité/amende
CREATE TYPE penalty_status AS ENUM ('pending', 'paid', 'waived');

-- Statuts d'une annonce sur la marketplace
CREATE TYPE listing_status AS ENUM ('active', 'vendu', 'suspendu');

-- Types d'annonces sur la marketplace (physique ou numérique)
CREATE TYPE listing_type AS ENUM ('physique', 'numerique');

-- Types de communautés
CREATE TYPE community_type AS ENUM ('groupe_etude', 'club_lecture');

-- Types de notes de lecture
CREATE TYPE note_type AS ENUM ('note', 'surlignage');

-- Types d'annonces administratives
CREATE TYPE announcement_type AS ENUM ('info', 'promo', 'maintenance', 'urgent');

-- Audiences cibles pour les annonces
CREATE TYPE announcement_target AS ENUM ('tous', 'etudiants', 'premium', 'auteurs');

-- Statuts d'une annonce administrative
CREATE TYPE announcement_status AS ENUM ('brouillon', 'envoye', 'programme');

-- Raisons de signalement de contenu
CREATE TYPE report_reason AS ENUM ('droits_auteur', 'contenu_inapproprie', 'spam', 'arnaque', 'autre');

-- Statuts d'un signalement
CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'resolved', 'dismissed');

-- Types de contenu pouvant être signalés
CREATE TYPE content_type_enum AS ENUM ('book', 'note', 'community', 'user', 'marketplace');


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 2 : FONCTION UTILITAIRE — Mise à jour automatique de updated_at
-- ═══════════════════════════════════════════════════════════════════════════════

-- Fonction déclencheur pour mettre à jour automatiquement la colonne updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 3 : TABLES
-- Création de toutes les tables dans l'ordre des dépendances
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- 3.1 — Profils utilisateurs (extension de auth.users)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  first_name      TEXT NOT NULL DEFAULT '',
  last_name       TEXT NOT NULL DEFAULT '',
  role            user_role NOT NULL DEFAULT 'user',
  plan            subscription_plan NOT NULL DEFAULT 'free',
  wallet_balance  INTEGER NOT NULL DEFAULT 0,           -- Solde du portefeuille en FCFA
  whatsapp_number TEXT,
  filiere         TEXT,                                  -- Filière d'études
  niveau_academique TEXT,                                -- Niveau académique (L1, L2, M1, etc.)
  universite      TEXT,                                  -- Nom de l'université
  referral_code   TEXT UNIQUE,                           -- Code de parrainage unique
  referred_by     UUID REFERENCES public.profiles(id),   -- Parrain
  avatar_url      TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  trial_ends_at   TIMESTAMPTZ,                           -- Date de fin de la période d'essai
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'Profils utilisateurs — étend la table auth.users de Supabase';
COMMENT ON COLUMN public.profiles.wallet_balance IS 'Solde du portefeuille en FCFA';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3.2 — Catalogue de livres
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.books (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre               TEXT NOT NULL,                            -- Titre du livre
  auteur              TEXT NOT NULL,                            -- Nom de l'auteur
  categorie           TEXT NOT NULL,                            -- Catégorie principale
  sous_categorie      TEXT,                                     -- Sous-catégorie optionnelle
  description         TEXT,
  prix_achat          INTEGER DEFAULT 0,                        -- Prix d'achat en FCFA
  prix_location       INTEGER DEFAULT 0,                        -- Prix de location en FCFA
  type                book_type DEFAULT 'gratuit',
  format              book_format DEFAULT 'pdf',
  pdf_url             TEXT,                                     -- URL du fichier PDF/EPUB
  read_url            TEXT,                                     -- URL de lecture externe intégrée dans BiblioTech
  cover_url           TEXT,                                     -- URL de la couverture
  watermark_enabled   BOOLEAN DEFAULT true,                     -- Filigrane activé
  pages_count         INTEGER DEFAULT 0,
  langue              TEXT DEFAULT 'fr',
  isbn                TEXT,
  editeur             TEXT,                                     -- Maison d'édition
  annee_publication   INTEGER,                                  -- Année de publication
  status              book_status DEFAULT 'publie',
  added_by            UUID REFERENCES public.profiles(id),      -- Administrateur ayant ajouté le livre
  tags                TEXT[],                                   -- Étiquettes pour la recherche
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.books IS 'Catalogue des livres numériques disponibles sur la plateforme';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3.3 — Communautés (groupes d'étude et clubs de lecture)
-- Créée avant book_notes car book_notes y fait référence
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.communities (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom               TEXT NOT NULL,                                 -- Nom de la communauté
  description       TEXT,
  type              community_type DEFAULT 'groupe_etude',
  createur_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  prive             BOOLEAN DEFAULT false,                         -- Communauté privée ou publique
  code_invitation   TEXT UNIQUE,                                   -- Code d'invitation pour les communautés privées
  membres_count     INTEGER DEFAULT 1,                             -- Compteur de membres
  max_membres       INTEGER DEFAULT 30,                            -- Nombre maximum de membres
  book_id           UUID REFERENCES public.books(id) ON DELETE SET NULL,  -- Livre en cours de discussion
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.communities IS 'Communautés — groupes d''étude et clubs de lecture';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3.4 — Emprunts de livres
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.borrows (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  book_id                       UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  debut                         TIMESTAMPTZ NOT NULL DEFAULT now(),       -- Date de début de l'emprunt
  fin_prevue                    TIMESTAMPTZ NOT NULL,                     -- Date de retour prévue
  fin_reelle                    TIMESTAMPTZ,                              -- Date de retour effective
  statut                        borrow_status DEFAULT 'actif',
  penalite_fcfa                 INTEGER DEFAULT 0,                        -- Montant de la pénalité en FCFA
  jours_retard                  INTEGER DEFAULT 0,                        -- Nombre de jours de retard
  prolongation_auto_utilisee    BOOLEAN DEFAULT false,                    -- Prolongation automatique déjà utilisée
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.borrows IS 'Suivi des emprunts de livres numériques';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3.5 — Transactions financières
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.transactions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  book_id             UUID REFERENCES public.books(id) ON DELETE SET NULL,
  type                transaction_type NOT NULL,
  montant             INTEGER NOT NULL,                             -- Montant total en FCFA
  commission_pct      NUMERIC(5,2) DEFAULT 0,                      -- Pourcentage de commission
  vendeur_recoit      INTEGER DEFAULT 0,                            -- Part du vendeur en FCFA
  plateforme_recoit   INTEGER DEFAULT 0,                            -- Part de la plateforme en FCFA
  statut              transaction_status DEFAULT 'pending',
  provider            payment_provider,
  reference_externe   TEXT,                                         -- Référence du paiement externe
  metadata            JSONB DEFAULT '{}',                           -- Données supplémentaires
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.transactions IS 'Historique de toutes les transactions financières';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3.6 — Abonnements
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan              subscription_plan NOT NULL,
  debut             TIMESTAMPTZ NOT NULL DEFAULT now(),
  fin               TIMESTAMPTZ NOT NULL,                         -- Date d'expiration
  auto_renew        BOOLEAN DEFAULT true,                         -- Renouvellement automatique
  montant_mensuel   INTEGER NOT NULL,                             -- Montant mensuel en FCFA
  statut            TEXT DEFAULT 'active'
                    CHECK (statut IN ('active', 'expired', 'cancelled')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.subscriptions IS 'Abonnements des utilisateurs aux différents plans';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3.7 — Progression de lecture
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.reading_progress (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  book_id               UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  current_page          INTEGER DEFAULT 0,
  total_pages           INTEGER DEFAULT 0,
  pourcentage_lu        NUMERIC(5,2) DEFAULT 0,                   -- Pourcentage de lecture
  temps_lecture_minutes  INTEGER DEFAULT 0,                       -- Temps total de lecture en minutes
  derniere_lecture      TIMESTAMPTZ DEFAULT now(),                 -- Dernière date de lecture
  offline_disponible    BOOLEAN DEFAULT false,                     -- Disponible hors ligne
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, book_id)                                       -- Un seul enregistrement par utilisateur/livre
);

COMMENT ON TABLE public.reading_progress IS 'Progression de lecture de chaque utilisateur par livre';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3.8 — Sessions de lecture
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.reading_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  book_id         UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  debut           TIMESTAMPTZ NOT NULL DEFAULT now(),            -- Début de la session
  fin             TIMESTAMPTZ,                                   -- Fin de la session
  pages_lues      INTEGER DEFAULT 0,                             -- Pages lues durant la session
  duree_minutes   INTEGER DEFAULT 0,                             -- Durée en minutes
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.reading_sessions IS 'Sessions de lecture individuelles pour les statistiques';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3.9 — Notes et surlignages de lecture
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.book_notes (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  book_id                   UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  page                      INTEGER NOT NULL,                        -- Numéro de page
  contenu                   TEXT NOT NULL,                           -- Contenu de la note ou du surlignage
  couleur                   TEXT DEFAULT '#FFFF00',                  -- Couleur du surlignage
  type                      note_type DEFAULT 'surlignage',
  shared_with_community_id  UUID REFERENCES public.communities(id) ON DELETE SET NULL,  -- Partagée avec une communauté
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.book_notes IS 'Notes et surlignages des utilisateurs dans les livres';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3.10 — Membres de communautés
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.community_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id    UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role            TEXT DEFAULT 'member'
                  CHECK (role IN ('member', 'moderator', 'admin')),
  joined_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE (community_id, user_id)                                -- Un utilisateur ne peut rejoindre qu'une fois
);

COMMENT ON TABLE public.community_members IS 'Adhésion des utilisateurs aux communautés';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3.11 — Marketplace — Annonces de vente de livres (Phase 2)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.marketplace_listings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  titre           TEXT NOT NULL,
  auteur          TEXT NOT NULL,
  description     TEXT,
  prix_vendeur    INTEGER NOT NULL,                              -- Prix fixé par le vendeur en FCFA
  prix_affiche    INTEGER NOT NULL,                              -- Prix affiché (avec commission) en FCFA
  commission_pct  NUMERIC(5,2) DEFAULT 5,                        -- Pourcentage de commission plateforme
  photo_url       TEXT,
  statut          listing_status DEFAULT 'active',
  localisation    TEXT,                                           -- Localisation du vendeur
  type_livre      listing_type DEFAULT 'numerique',
  categorie       TEXT,
  condition       TEXT CHECK (condition IN ('comme-neuf', 'tres-bon', 'bon', 'acceptable')),
  views_count     INTEGER DEFAULT 0,                             -- Nombre de vues
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.marketplace_listings IS 'Annonces de vente sur la marketplace (Phase 2)';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3.12 — Profils d'auteurs
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.author_profiles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  nom_plume         TEXT NOT NULL,                               -- Nom de plume
  bio               TEXT,
  wave_number       TEXT,                                        -- Numéro Wave pour les paiements
  total_ventes      INTEGER DEFAULT 0,                           -- Total des ventes
  solde_disponible  INTEGER DEFAULT 0,                           -- Solde disponible en FCFA
  verified          BOOLEAN DEFAULT false,                       -- Auteur vérifié
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.author_profiles IS 'Profils publics des auteurs avec informations de paiement';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3.13 — Pénalités et amendes
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.penalties (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borrow_id   UUID NOT NULL REFERENCES public.borrows(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  montant     INTEGER NOT NULL,                                  -- Montant de l'amende en FCFA
  statut      penalty_status DEFAULT 'pending',
  raison      TEXT,                                              -- Raison de la pénalité
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at     TIMESTAMPTZ                                        -- Date de paiement
);

COMMENT ON TABLE public.penalties IS 'Pénalités appliquées aux retards d''emprunt';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3.14 — Favoris
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.favorites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  book_id     UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, book_id)                                     -- Un seul favori par livre par utilisateur
);

COMMENT ON TABLE public.favorites IS 'Livres marqués comme favoris par les utilisateurs';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3.15 — Journaux d'administration (append-only)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.admin_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,                                     -- Action effectuée
  cible_type  TEXT,                                              -- Type de la cible (book, user, etc.)
  cible_id    UUID,                                              -- Identifiant de la cible
  details     JSONB DEFAULT '{}',                                -- Détails supplémentaires
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.admin_logs IS 'Journal d''audit des actions administratives — lecture seule, pas de modification ni suppression';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3.16 — Journaux d'activité utilisateur
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  metadata    JSONB DEFAULT '{}',
  ip_address  TEXT,
  device_info TEXT,                                              -- Informations sur l'appareil
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.activity_logs IS 'Journal d''activité des utilisateurs pour les statistiques et le suivi';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3.17 — Annonces administratives
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.announcements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  titre             TEXT NOT NULL,
  contenu           TEXT NOT NULL,
  type              announcement_type DEFAULT 'info',
  cible_audience    announcement_target DEFAULT 'tous',          -- Audience visée
  canal             TEXT DEFAULT 'in_app',                       -- Canal de diffusion
  statut            announcement_status DEFAULT 'brouillon',
  envoye_a_count    INTEGER DEFAULT 0,                           -- Nombre de destinataires
  programme_pour    TIMESTAMPTZ,                                 -- Date d'envoi programmé
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.announcements IS 'Annonces et notifications administratives';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3.18 — Signalements de contenu
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.reported_content (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_type  content_type_enum NOT NULL,                      -- Type de contenu signalé
  content_id    UUID NOT NULL,                                   -- Identifiant du contenu signalé
  raison        report_reason NOT NULL,
  description   TEXT,                                            -- Description détaillée
  statut        report_status DEFAULT 'pending',
  reviewed_by   UUID REFERENCES public.profiles(id),             -- Administrateur ayant traité le signalement
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.reported_content IS 'Signalements de contenu par les utilisateurs';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3.19 — Configuration de la plateforme
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.platform_config (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cle         TEXT NOT NULL UNIQUE,                              -- Clé de configuration
  valeur      TEXT NOT NULL,                                     -- Valeur de configuration
  description TEXT,
  modifie_par UUID REFERENCES public.profiles(id),               -- Dernier administrateur ayant modifié
  modifie_le  TIMESTAMPTZ DEFAULT now()                          -- Date de dernière modification
);

COMMENT ON TABLE public.platform_config IS 'Paramètres de configuration globale de la plateforme';


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 4 : INDEX
-- Optimisation des requêtes les plus fréquentes
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Profils ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_email          ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code  ON public.profiles (referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_role           ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_plan           ON public.profiles (plan);

-- ─── Livres ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_books_categorie         ON public.books (categorie);
CREATE INDEX IF NOT EXISTS idx_books_type              ON public.books (type);
CREATE INDEX IF NOT EXISTS idx_books_langue            ON public.books (langue);
CREATE INDEX IF NOT EXISTS idx_books_status            ON public.books (status);
CREATE INDEX IF NOT EXISTS idx_books_auteur            ON public.books (auteur);
CREATE INDEX IF NOT EXISTS idx_books_titre             ON public.books (titre);
-- Index composite pour le filtrage du catalogue
CREATE INDEX IF NOT EXISTS idx_books_catalogue_filter  ON public.books (categorie, status, type);

-- ─── Emprunts ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_borrows_user_id         ON public.borrows (user_id);
CREATE INDEX IF NOT EXISTS idx_borrows_book_id         ON public.borrows (book_id);
CREATE INDEX IF NOT EXISTS idx_borrows_statut          ON public.borrows (statut);
CREATE INDEX IF NOT EXISTS idx_borrows_fin_prevue      ON public.borrows (fin_prevue);

-- ─── Transactions ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_transactions_user_id    ON public.transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type       ON public.transactions (type);
CREATE INDEX IF NOT EXISTS idx_transactions_statut     ON public.transactions (statut);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions (created_at);

-- ─── Abonnements ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id   ON public.subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan      ON public.subscriptions (plan);
CREATE INDEX IF NOT EXISTS idx_subscriptions_statut    ON public.subscriptions (statut);

-- ─── Sessions de lecture ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_reading_sessions_user_id ON public.reading_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_book_id ON public.reading_sessions (book_id);

-- ─── Notes de lecture ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_book_notes_user_id      ON public.book_notes (user_id);
CREATE INDEX IF NOT EXISTS idx_book_notes_book_id      ON public.book_notes (book_id);

-- ─── Pénalités ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_penalties_user_id        ON public.penalties (user_id);
CREATE INDEX IF NOT EXISTS idx_penalties_statut         ON public.penalties (statut);

-- ─── Journaux d'administration ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id      ON public.admin_logs (admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action        ON public.admin_logs (action);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at    ON public.admin_logs (created_at);

-- ─── Journaux d'activité ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id    ON public.activity_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action     ON public.activity_logs (action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs (created_at);

-- ─── Annonces ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_announcements_statut     ON public.announcements (statut);
CREATE INDEX IF NOT EXISTS idx_announcements_type       ON public.announcements (type);

-- ─── Signalements ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_reported_content_statut       ON public.reported_content (statut);
CREATE INDEX IF NOT EXISTS idx_reported_content_content_type ON public.reported_content (content_type);

-- ─── Marketplace ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_seller_id  ON public.marketplace_listings (seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_statut     ON public.marketplace_listings (statut);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_categorie  ON public.marketplace_listings (categorie);

-- ─── Favoris ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_favorites_user_id        ON public.favorites (user_id);


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 5 : SÉCURITÉ AU NIVEAU DES LIGNES (RLS)
-- Activation et définition des politiques d'accès pour chaque table
-- ═══════════════════════════════════════════════════════════════════════════════

-- Activation du RLS sur toutes les tables
ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrows             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_progress    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_notes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.author_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penalties           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reported_content    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_config     ENABLE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5.1 — Politiques RLS pour profiles
-- ─────────────────────────────────────────────────────────────────────────────

-- Lecture : l'utilisateur voit son propre profil, les admins voient tout
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

-- Modification : l'utilisateur modifie son profil (sauf rôle/plan), les admins modifient tout
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id
  ) WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
    AND plan = (SELECT plan FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY profiles_update_admin ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

-- Insertion : uniquement via le déclencheur système (handle_new_user)
-- Aucune politique INSERT pour les utilisateurs normaux
CREATE POLICY profiles_insert_system ON public.profiles
  FOR INSERT WITH CHECK (false);
  -- Le déclencheur s'exécute avec les privilèges SECURITY DEFINER


-- ─────────────────────────────────────────────────────────────────────────────
-- 5.2 — Politiques RLS pour books
-- ─────────────────────────────────────────────────────────────────────────────

-- Lecture : tout le monde peut lire les livres publiés, les admins voient tout
CREATE POLICY books_select ON public.books
  FOR SELECT USING (
    status = 'publie'
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

-- Insertion : admins uniquement
CREATE POLICY books_insert ON public.books
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

-- Modification : admins uniquement
CREATE POLICY books_update ON public.books
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

-- Suppression : admins uniquement
CREATE POLICY books_delete ON public.books
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 5.3 — Politiques RLS pour borrows
-- ─────────────────────────────────────────────────────────────────────────────

-- Lecture : l'utilisateur voit ses emprunts, les admins voient tout
CREATE POLICY borrows_select ON public.borrows
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

-- Insertion : les utilisateurs authentifiés créent des emprunts pour eux-mêmes
CREATE POLICY borrows_insert ON public.borrows
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

-- Modification : l'utilisateur modifie ses emprunts, les admins modifient tout
CREATE POLICY borrows_update ON public.borrows
  FOR UPDATE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 5.4 — Politiques RLS pour transactions
-- ─────────────────────────────────────────────────────────────────────────────

-- Lecture : l'utilisateur voit ses transactions, les admins voient tout
CREATE POLICY transactions_select ON public.transactions
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

-- Insertion : uniquement via le service role (côté serveur)
CREATE POLICY transactions_insert ON public.transactions
  FOR INSERT WITH CHECK (false);


-- ─────────────────────────────────────────────────────────────────────────────
-- 5.5 — Politiques RLS pour subscriptions
-- ─────────────────────────────────────────────────────────────────────────────

-- Lecture : l'utilisateur voit ses abonnements, les admins voient tout
CREATE POLICY subscriptions_select ON public.subscriptions
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

-- Insertion et modification : uniquement via le service role
CREATE POLICY subscriptions_insert ON public.subscriptions
  FOR INSERT WITH CHECK (false);

CREATE POLICY subscriptions_update ON public.subscriptions
  FOR UPDATE USING (false);


-- ─────────────────────────────────────────────────────────────────────────────
-- 5.6 — Politiques RLS pour reading_progress
-- ─────────────────────────────────────────────────────────────────────────────

-- Lecture : l'utilisateur voit sa progression, les admins voient tout
CREATE POLICY reading_progress_select ON public.reading_progress
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

-- Insertion : l'utilisateur gère sa propre progression
CREATE POLICY reading_progress_insert ON public.reading_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Modification : l'utilisateur met à jour sa propre progression
CREATE POLICY reading_progress_update ON public.reading_progress
  FOR UPDATE USING (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 5.7 — Politiques RLS pour reading_sessions
-- ─────────────────────────────────────────────────────────────────────────────

-- Lecture : l'utilisateur voit ses sessions
CREATE POLICY reading_sessions_select ON public.reading_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Insertion : l'utilisateur crée ses propres sessions
CREATE POLICY reading_sessions_insert ON public.reading_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 5.8 — Politiques RLS pour book_notes
-- ─────────────────────────────────────────────────────────────────────────────

-- Lecture : l'utilisateur voit ses notes + notes partagées avec ses communautés, admins voient tout
CREATE POLICY book_notes_select ON public.book_notes
  FOR SELECT USING (
    auth.uid() = user_id
    OR (
      shared_with_community_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.community_members cm
        WHERE cm.community_id = book_notes.shared_with_community_id
        AND cm.user_id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

-- Insertion : l'utilisateur crée ses propres notes
CREATE POLICY book_notes_insert ON public.book_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Modification : l'utilisateur modifie ses propres notes
CREATE POLICY book_notes_update ON public.book_notes
  FOR UPDATE USING (auth.uid() = user_id);

-- Suppression : l'utilisateur supprime ses propres notes
CREATE POLICY book_notes_delete ON public.book_notes
  FOR DELETE USING (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 5.9 — Politiques RLS pour communities
-- ─────────────────────────────────────────────────────────────────────────────

-- Lecture : communautés publiques visibles par tous, privées uniquement aux membres
CREATE POLICY communities_select ON public.communities
  FOR SELECT USING (
    prive = false
    OR createur_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = communities.id AND cm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

-- Insertion : tout utilisateur authentifié peut créer une communauté
CREATE POLICY communities_insert ON public.communities
  FOR INSERT WITH CHECK (auth.uid() = createur_id);

-- Modification : créateur ou admin
CREATE POLICY communities_update ON public.communities
  FOR UPDATE USING (
    createur_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

-- Suppression : créateur ou admin
CREATE POLICY communities_delete ON public.communities
  FOR DELETE USING (
    createur_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 5.10 — Politiques RLS pour community_members
-- ─────────────────────────────────────────────────────────────────────────────

-- Lecture : les membres de la communauté peuvent voir les autres membres
CREATE POLICY community_members_select ON public.community_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = community_members.community_id
      AND cm.user_id = auth.uid()
    )
  );

-- Insertion : tout utilisateur authentifié peut rejoindre une communauté
CREATE POLICY community_members_insert ON public.community_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Suppression : l'utilisateur quitte lui-même, ou le créateur/admin de la communauté l'exclut
CREATE POLICY community_members_delete ON public.community_members
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = community_members.community_id AND c.createur_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 5.11 — Politiques RLS pour marketplace_listings
-- ─────────────────────────────────────────────────────────────────────────────

-- Lecture : tous les utilisateurs authentifiés voient les annonces actives
CREATE POLICY marketplace_listings_select ON public.marketplace_listings
  FOR SELECT USING (
    statut = 'active'
    OR seller_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

-- Insertion : le vendeur crée ses propres annonces
CREATE POLICY marketplace_listings_insert ON public.marketplace_listings
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

-- Modification : le vendeur modifie ses propres annonces
CREATE POLICY marketplace_listings_update ON public.marketplace_listings
  FOR UPDATE USING (auth.uid() = seller_id);

-- Suppression : le vendeur supprime ses propres annonces
CREATE POLICY marketplace_listings_delete ON public.marketplace_listings
  FOR DELETE USING (auth.uid() = seller_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 5.12 — Politiques RLS pour author_profiles
-- ─────────────────────────────────────────────────────────────────────────────

-- Lecture : accessible publiquement à tous les utilisateurs authentifiés
CREATE POLICY author_profiles_select ON public.author_profiles
  FOR SELECT USING (true);

-- Insertion : le propriétaire crée son profil d'auteur
CREATE POLICY author_profiles_insert ON public.author_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Modification : le propriétaire ou les admins
CREATE POLICY author_profiles_update ON public.author_profiles
  FOR UPDATE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 5.13 — Politiques RLS pour penalties
-- ─────────────────────────────────────────────────────────────────────────────

-- Lecture : l'utilisateur voit ses pénalités, les admins voient tout
CREATE POLICY penalties_select ON public.penalties
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

-- Insertion et modification : système/admin uniquement
CREATE POLICY penalties_insert ON public.penalties
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY penalties_update ON public.penalties
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 5.14 — Politiques RLS pour favorites
-- ─────────────────────────────────────────────────────────────────────────────

-- Toutes opérations : l'utilisateur gère ses propres favoris
CREATE POLICY favorites_select ON public.favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY favorites_insert ON public.favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY favorites_delete ON public.favorites
  FOR DELETE USING (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 5.15 — Politiques RLS pour admin_logs (append-only)
-- ─────────────────────────────────────────────────────────────────────────────

-- Lecture : admins uniquement
CREATE POLICY admin_logs_select ON public.admin_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

-- Insertion : admins uniquement
CREATE POLICY admin_logs_insert ON public.admin_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

-- Pas de politique UPDATE ni DELETE — table en mode ajout seul


-- ─────────────────────────────────────────────────────────────────────────────
-- 5.16 — Politiques RLS pour activity_logs (append-only)
-- ─────────────────────────────────────────────────────────────────────────────

-- Lecture : admins uniquement
CREATE POLICY activity_logs_select ON public.activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

-- Insertion : tout utilisateur authentifié (enregistre ses propres actions)
CREATE POLICY activity_logs_insert ON public.activity_logs
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

-- Pas de politique UPDATE ni DELETE — table en mode ajout seul


-- ─────────────────────────────────────────────────────────────────────────────
-- 5.17 — Politiques RLS pour announcements
-- ─────────────────────────────────────────────────────────────────────────────

-- Lecture : les utilisateurs voient les annonces envoyées qui les ciblent, les admins voient tout
CREATE POLICY announcements_select_users ON public.announcements
  FOR SELECT USING (
    (
      statut = 'envoye'
      AND (
        cible_audience = 'tous'
        OR (cible_audience = 'etudiants' AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.plan = 'student'
        ))
        OR (cible_audience = 'premium' AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.plan = 'premium'
        ))
        OR (cible_audience = 'auteurs' AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = 'author'
        ))
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

-- Insertion : admins uniquement
CREATE POLICY announcements_insert ON public.announcements
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

-- Modification : admins uniquement
CREATE POLICY announcements_update ON public.announcements
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

-- Suppression : admins uniquement
CREATE POLICY announcements_delete ON public.announcements
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 5.18 — Politiques RLS pour reported_content
-- ─────────────────────────────────────────────────────────────────────────────

-- Lecture : le signaleur voit ses signalements, les admins voient tout
CREATE POLICY reported_content_select ON public.reported_content
  FOR SELECT USING (
    auth.uid() = reporter_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

-- Insertion : tout utilisateur authentifié peut signaler du contenu
CREATE POLICY reported_content_insert ON public.reported_content
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Modification : admins uniquement (pour traiter les signalements)
CREATE POLICY reported_content_update ON public.reported_content
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 5.19 — Politiques RLS pour platform_config
-- ─────────────────────────────────────────────────────────────────────────────

-- Lecture : tous les utilisateurs authentifiés (nécessaire côté client)
CREATE POLICY platform_config_select ON public.platform_config
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Insertion : admins uniquement
CREATE POLICY platform_config_insert ON public.platform_config
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

-- Modification : admins uniquement
CREATE POLICY platform_config_update ON public.platform_config
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

-- Suppression : admins uniquement
CREATE POLICY platform_config_delete ON public.platform_config
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 6 : DÉCLENCHEUR — Création automatique de profil à l'inscription
-- ═══════════════════════════════════════════════════════════════════════════════

-- Fonction déclencheur : crée un profil dans public.profiles lors de l'inscription
-- via Supabase Auth. S'exécute avec SECURITY DEFINER pour contourner le RLS.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Déclencheur sur la table auth.users — après insertion d'un nouvel utilisateur
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 7 : DÉCLENCHEURS — Mise à jour automatique de updated_at
-- Application à toutes les tables possédant une colonne updated_at
-- ═══════════════════════════════════════════════════════════════════════════════

-- Profils
CREATE OR REPLACE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Livres
CREATE OR REPLACE TRIGGER trg_books_updated_at
  BEFORE UPDATE ON public.books
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Emprunts
CREATE OR REPLACE TRIGGER trg_borrows_updated_at
  BEFORE UPDATE ON public.borrows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Abonnements
CREATE OR REPLACE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Progression de lecture
CREATE OR REPLACE TRIGGER trg_reading_progress_updated_at
  BEFORE UPDATE ON public.reading_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Notes de lecture
CREATE OR REPLACE TRIGGER trg_book_notes_updated_at
  BEFORE UPDATE ON public.book_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Communautés
CREATE OR REPLACE TRIGGER trg_communities_updated_at
  BEFORE UPDATE ON public.communities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Annonces marketplace
CREATE OR REPLACE TRIGGER trg_marketplace_listings_updated_at
  BEFORE UPDATE ON public.marketplace_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Profils d'auteurs
CREATE OR REPLACE TRIGGER trg_author_profiles_updated_at
  BEFORE UPDATE ON public.author_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Annonces administratives
CREATE OR REPLACE TRIGGER trg_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();


-- ═══════════════════════════════════════════════════════════════════════════════
-- FIN DE LA MIGRATION INITIALE
-- BiblioTech — Schéma complet prêt pour la production
-- ═══════════════════════════════════════════════════════════════════════════════
