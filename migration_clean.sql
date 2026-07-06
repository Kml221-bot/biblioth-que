뿯붿-- DropForeignKey
ALTER TABLE "auth"."identities" DROP CONSTRAINT "identities_user_id_fkey";

-- DropForeignKey
ALTER TABLE "auth"."mfa_amr_claims" DROP CONSTRAINT "mfa_amr_claims_session_id_fkey";

-- DropForeignKey
ALTER TABLE "auth"."mfa_challenges" DROP CONSTRAINT "mfa_challenges_auth_factor_id_fkey";

-- DropForeignKey
ALTER TABLE "auth"."mfa_factors" DROP CONSTRAINT "mfa_factors_user_id_fkey";

-- DropForeignKey
ALTER TABLE "auth"."oauth_authorizations" DROP CONSTRAINT "oauth_authorizations_client_id_fkey";

-- DropForeignKey
ALTER TABLE "auth"."oauth_authorizations" DROP CONSTRAINT "oauth_authorizations_user_id_fkey";

-- DropForeignKey
ALTER TABLE "auth"."oauth_consents" DROP CONSTRAINT "oauth_consents_client_id_fkey";

-- DropForeignKey
ALTER TABLE "auth"."oauth_consents" DROP CONSTRAINT "oauth_consents_user_id_fkey";

-- DropForeignKey
ALTER TABLE "auth"."one_time_tokens" DROP CONSTRAINT "one_time_tokens_user_id_fkey";

-- DropForeignKey
ALTER TABLE "auth"."refresh_tokens" DROP CONSTRAINT "refresh_tokens_session_id_fkey";

-- DropForeignKey
ALTER TABLE "auth"."saml_providers" DROP CONSTRAINT "saml_providers_sso_provider_id_fkey";

-- DropForeignKey
ALTER TABLE "auth"."saml_relay_states" DROP CONSTRAINT "saml_relay_states_flow_state_id_fkey";

-- DropForeignKey
ALTER TABLE "auth"."saml_relay_states" DROP CONSTRAINT "saml_relay_states_sso_provider_id_fkey";

-- DropForeignKey
ALTER TABLE "auth"."sessions" DROP CONSTRAINT "sessions_oauth_client_id_fkey";

-- DropForeignKey
ALTER TABLE "auth"."sessions" DROP CONSTRAINT "sessions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "auth"."sso_domains" DROP CONSTRAINT "sso_domains_sso_provider_id_fkey";

-- DropForeignKey
ALTER TABLE "auth"."webauthn_challenges" DROP CONSTRAINT "webauthn_challenges_user_id_fkey";

-- DropForeignKey
ALTER TABLE "auth"."webauthn_credentials" DROP CONSTRAINT "webauthn_credentials_user_id_fkey";

-- DropIndex
DROP INDEX "auth"."idx_users_created_at_desc";

-- DropIndex
DROP INDEX "auth"."idx_users_email";

-- DropIndex
DROP INDEX "auth"."idx_users_last_sign_in_at_desc";

-- DropIndex
DROP INDEX "auth"."users_instance_id_idx";

-- DropIndex
DROP INDEX "auth"."users_is_anonymous_idx";

-- DropIndex
DROP INDEX "auth"."users_phone_key";

-- AlterTable
ALTER TABLE "auth"."users" DROP COLUMN "aud",
DROP COLUMN "banned_until",
DROP COLUMN "confirmation_sent_at",
DROP COLUMN "confirmation_token",
DROP COLUMN "confirmed_at",
DROP COLUMN "created_at",
DROP COLUMN "deleted_at",
DROP COLUMN "email",
DROP COLUMN "email_change",
DROP COLUMN "email_change_confirm_status",
DROP COLUMN "email_change_sent_at",
DROP COLUMN "email_change_token_current",
DROP COLUMN "email_change_token_new",
DROP COLUMN "email_confirmed_at",
DROP COLUMN "encrypted_password",
DROP COLUMN "instance_id",
DROP COLUMN "invited_at",
DROP COLUMN "is_anonymous",
DROP COLUMN "is_sso_user",
DROP COLUMN "is_super_admin",
DROP COLUMN "last_sign_in_at",
DROP COLUMN "phone",
DROP COLUMN "phone_change",
DROP COLUMN "phone_change_sent_at",
DROP COLUMN "phone_change_token",
DROP COLUMN "phone_confirmed_at",
DROP COLUMN "raw_app_meta_data",
DROP COLUMN "raw_user_meta_data",
DROP COLUMN "reauthentication_sent_at",
DROP COLUMN "reauthentication_token",
DROP COLUMN "recovery_sent_at",
DROP COLUMN "recovery_token",
DROP COLUMN "role",
DROP COLUMN "updated_at";

-- DropTable
DROP TABLE "auth"."audit_log_entries";

-- DropTable
DROP TABLE "auth"."custom_oauth_providers";

-- DropTable
DROP TABLE "auth"."flow_state";

-- DropTable
DROP TABLE "auth"."identities";

-- DropTable
DROP TABLE "auth"."instances";

-- DropTable
DROP TABLE "auth"."mfa_amr_claims";

-- DropTable
DROP TABLE "auth"."mfa_challenges";

-- DropTable
DROP TABLE "auth"."mfa_factors";

-- DropTable
DROP TABLE "auth"."oauth_authorizations";

-- DropTable
DROP TABLE "auth"."oauth_client_states";

-- DropTable
DROP TABLE "auth"."oauth_clients";

-- DropTable
DROP TABLE "auth"."oauth_consents";

-- DropTable
DROP TABLE "auth"."one_time_tokens";

-- DropTable
DROP TABLE "auth"."refresh_tokens";

-- DropTable
DROP TABLE "auth"."saml_providers";

-- DropTable
DROP TABLE "auth"."saml_relay_states";

-- DropTable
DROP TABLE "auth"."schema_migrations";

-- DropTable
DROP TABLE "auth"."sessions";

-- DropTable
DROP TABLE "auth"."sso_domains";

-- DropTable
DROP TABLE "auth"."sso_providers";

-- DropTable
DROP TABLE "auth"."webauthn_challenges";

-- DropTable
DROP TABLE "auth"."webauthn_credentials";

-- DropEnum
DROP TYPE "auth"."aal_level";

-- DropEnum
DROP TYPE "auth"."code_challenge_method";

-- DropEnum
DROP TYPE "auth"."factor_status";

-- DropEnum
DROP TYPE "auth"."factor_type";

-- DropEnum
DROP TYPE "auth"."oauth_authorization_status";

-- DropEnum
DROP TYPE "auth"."oauth_client_type";

-- DropEnum
DROP TYPE "auth"."oauth_registration_type";

-- DropEnum
DROP TYPE "auth"."oauth_response_type";

-- DropEnum
DROP TYPE "auth"."one_time_token_type";

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "last_name" TEXT NOT NULL DEFAULT '',
    "first_name" TEXT DEFAULT '',
    "whatsapp_number" TEXT,
    "avatar_url" TEXT,
    "role" "user_role" NOT NULL DEFAULT 'user',
    "status" "user_status" NOT NULL DEFAULT 'active',
    "referral_code" TEXT,
    "coin_balance" INTEGER NOT NULL DEFAULT 0,
    "last_login_at" TIMESTAMP(3),
    "anonymized_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "plan" "subscription_plan" NOT NULL DEFAULT 'free',
    "status" TEXT NOT NULL DEFAULT 'active',
    "emprunts_restants" INTEGER NOT NULL DEFAULT 3,
    "auto_renew" BOOLEAN NOT NULL DEFAULT false,
    "starts_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "author_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "bio" TEXT,
    "status" "author_status" NOT NULL DEFAULT 'pending',
    "wave_account" TEXT,
    "solde_disponible" INTEGER NOT NULL DEFAULT 0,
    "commission_pct" DECIMAL(5,2) NOT NULL DEFAULT 70.00,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "author_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "books" (
    "id" UUID NOT NULL,
    "titre" TEXT NOT NULL,
    "auteur" TEXT NOT NULL,
    "author_profile_id" UUID,
    "description" TEXT,
    "categorie" TEXT NOT NULL,
    "filiere" TEXT,
    "type_acces" TEXT DEFAULT 'gratuit',
    "status" "book_status" NOT NULL DEFAULT 'brouillon',
    "isbn" TEXT,
    "langue" TEXT NOT NULL DEFAULT 'fr',
    "nombre_pages" INTEGER,
    "cover_url" TEXT,
    "file_url" TEXT,
    "extrait_url" TEXT,
    "prix_achat" INTEGER NOT NULL DEFAULT 2000,
    "prix_location_7j" INTEGER NOT NULL DEFAULT 500,
    "prix_location_30j" INTEGER NOT NULL DEFAULT 800,
    "note_moyenne" DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    "reviews_count" INTEGER NOT NULL DEFAULT 0,
    "nb_vues" INTEGER NOT NULL DEFAULT 0,
    "nb_emprunts" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "free_chapters_count" INTEGER NOT NULL DEFAULT 3,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_page_texts" (
    "id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "page_number" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_page_texts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_reviews" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "note" INTEGER NOT NULL,
    "commentaire" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "borrows" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "statut" "borrow_status" NOT NULL DEFAULT 'actif',
    "debut" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fin_prevue" TIMESTAMP(3) NOT NULL,
    "fin_reelle" TIMESTAMP(3),
    "duree_jours" INTEGER NOT NULL,
    "page_actuelle" INTEGER NOT NULL DEFAULT 1,
    "pourcentage_lu" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "nb_renouvellements" INTEGER NOT NULL DEFAULT 0,
    "rappel_j3_envoye" BOOLEAN NOT NULL DEFAULT false,
    "rappel_j1_envoye" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "borrows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "penalties" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "borrow_id" UUID NOT NULL,
    "montant_fcfa" INTEGER NOT NULL,
    "jours_retard" INTEGER NOT NULL,
    "status" "penalty_status" NOT NULL DEFAULT 'pending',
    "reason" TEXT,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "penalties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "book_id" UUID,
    "listing_id" UUID,
    "penalty_id" UUID,
    "subscription_id" UUID,
    "type" "payment_type" NOT NULL,
    "provider" "payment_provider" NOT NULL DEFAULT 'wave',
    "status" "transaction_status" NOT NULL DEFAULT 'pending',
    "montant_total" INTEGER NOT NULL,
    "montant_commission" INTEGER NOT NULL DEFAULT 0,
    "montant_vendeur" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "external_id" TEXT,
    "payment_url" TEXT,
    "metadata" JSONB,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_listings" (
    "id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,
    "buyer_id" UUID,
    "book_id" UUID NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "prix_affiche" INTEGER NOT NULL,
    "commission_pct" DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    "status" "marketplace_status" NOT NULL DEFAULT 'active',
    "sold_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_messages" (
    "id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "receiver_id" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communities" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "visibility" "community_visibility" NOT NULL DEFAULT 'public',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_members" (
    "id" UUID NOT NULL,
    "community_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "community_role" NOT NULL DEFAULT 'member',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_posts" (
    "id" UUID NOT NULL,
    "community_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "contenu" TEXT NOT NULL,
    "status" "post_status" NOT NULL DEFAULT 'published',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_notes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "shared_with_community_id" UUID,
    "page" INTEGER NOT NULL,
    "type" "note_type" NOT NULL,
    "contenu" TEXT,
    "couleur" "note_color" NOT NULL DEFAULT 'yellow',
    "epubcfi" TEXT,
    "selected_text" TEXT,
    "chapter_label" TEXT,
    "likes_count" INTEGER NOT NULL DEFAULT 0,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_note_likes" (
    "id" UUID NOT NULL,
    "note_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_note_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reading_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "borrow_id" UUID,
    "page_debut" INTEGER NOT NULL DEFAULT 1,
    "page_fin" INTEGER,
    "duree_minutes" INTEGER NOT NULL DEFAULT 0,
    "pourcentage_lu" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reading_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "channel" "notification_channel" NOT NULL,
    "status" "notification_status" NOT NULL DEFAULT 'pending',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "template" TEXT,
    "payload" JSONB,
    "sent_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badges" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "icon_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_badges" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "badge_id" UUID NOT NULL,
    "unlocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_stats" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "livres_lus" INTEGER NOT NULL DEFAULT 0,
    "pages_lues" INTEGER NOT NULL DEFAULT 0,
    "minutes_lecture" INTEGER NOT NULL DEFAULT 0,
    "streak_jours" INTEGER NOT NULL DEFAULT 0,
    "best_streak" INTEGER NOT NULL DEFAULT 0,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "biblio_coins" INTEGER NOT NULL DEFAULT 0,
    "weekly_goal_minutes" INTEGER NOT NULL DEFAULT 60,
    "weekly_progress_min" INTEGER NOT NULL DEFAULT 0,
    "freeze_used_this_week" BOOLEAN NOT NULL DEFAULT false,
    "categories_favorites" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "last_read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliations" (
    "id" UUID NOT NULL,
    "referrer_id" UUID NOT NULL,
    "referred_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "reward_fcfa" INTEGER NOT NULL DEFAULT 0,
    "rewarded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "support_ticket_status" NOT NULL DEFAULT 'open',
    "priority" INTEGER NOT NULL DEFAULT 2,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reading_progress" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "current_page" INTEGER NOT NULL DEFAULT 1,
    "total_pages" INTEGER NOT NULL DEFAULT 0,
    "pourcentage_lu" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "temps_lecture_minutes" INTEGER NOT NULL DEFAULT 0,
    "epubcfi" TEXT,
    "chapitres_lus" INTEGER NOT NULL DEFAULT 0,
    "derniere_lecture" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reading_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_reading_preferences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'sepia',
    "font_family" TEXT NOT NULL DEFAULT 'jakarta',
    "font_size" INTEGER NOT NULL DEFAULT 18,
    "line_height" DECIMAL(3,1) NOT NULL DEFAULT 1.8,
    "margin" TEXT NOT NULL DEFAULT 'normal',
    "justified" BOOLEAN NOT NULL DEFAULT true,
    "brightness" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    "reading_mode" TEXT NOT NULL DEFAULT 'paginated',
    "auto_night" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_reading_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapters" (
    "id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "titre" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "is_free" BOOLEAN NOT NULL DEFAULT false,
    "prix_pieces" INTEGER NOT NULL DEFAULT 0,
    "content_url" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_chapter_accesses" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "chapter_id" UUID NOT NULL,
    "paid_pieces" INTEGER NOT NULL DEFAULT 0,
    "unlocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_chapter_accesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coin_transactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "coin_transaction_type" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "description" TEXT,
    "chapter_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coin_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_referral_code_key" ON "profiles"("referral_code");

-- CreateIndex
CREATE INDEX "profiles_role_idx" ON "profiles"("role");

-- CreateIndex
CREATE INDEX "profiles_status_idx" ON "profiles"("status");

-- CreateIndex
CREATE INDEX "profiles_created_at_idx" ON "profiles"("created_at");

-- CreateIndex
CREATE INDEX "subscriptions_user_id_status_idx" ON "subscriptions"("user_id", "status");

-- CreateIndex
CREATE INDEX "subscriptions_plan_status_idx" ON "subscriptions"("plan", "status");

-- CreateIndex
CREATE UNIQUE INDEX "author_profiles_user_id_key" ON "author_profiles"("user_id");

-- CreateIndex
CREATE INDEX "author_profiles_status_idx" ON "author_profiles"("status");

-- CreateIndex
CREATE INDEX "books_categorie_idx" ON "books"("categorie");

-- CreateIndex
CREATE INDEX "books_filiere_idx" ON "books"("filiere");

-- CreateIndex
CREATE INDEX "books_type_acces_idx" ON "books"("type_acces");

-- CreateIndex
CREATE INDEX "books_status_featured_idx" ON "books"("status", "featured");

-- CreateIndex
CREATE INDEX "books_note_moyenne_idx" ON "books"("note_moyenne");

-- CreateIndex
CREATE INDEX "books_created_at_idx" ON "books"("created_at");

-- CreateIndex
CREATE INDEX "book_page_texts_book_id_page_number_idx" ON "book_page_texts"("book_id", "page_number");

-- CreateIndex
CREATE UNIQUE INDEX "book_page_texts_book_id_page_number_key" ON "book_page_texts"("book_id", "page_number");

-- CreateIndex
CREATE INDEX "book_reviews_book_id_created_at_idx" ON "book_reviews"("book_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "book_reviews_user_id_book_id_key" ON "book_reviews"("user_id", "book_id");

-- CreateIndex
CREATE INDEX "borrows_user_id_statut_idx" ON "borrows"("user_id", "statut");

-- CreateIndex
CREATE INDEX "borrows_book_id_statut_idx" ON "borrows"("book_id", "statut");

-- CreateIndex
CREATE INDEX "borrows_fin_prevue_statut_idx" ON "borrows"("fin_prevue", "statut");

-- CreateIndex
CREATE INDEX "penalties_user_id_status_idx" ON "penalties"("user_id", "status");

-- CreateIndex
CREATE INDEX "penalties_borrow_id_idx" ON "penalties"("borrow_id");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_external_id_key" ON "transactions"("external_id");

-- CreateIndex
CREATE INDEX "transactions_user_id_status_idx" ON "transactions"("user_id", "status");

-- CreateIndex
CREATE INDEX "transactions_type_status_idx" ON "transactions"("type", "status");

-- CreateIndex
CREATE INDEX "transactions_created_at_idx" ON "transactions"("created_at");

-- CreateIndex
CREATE INDEX "marketplace_listings_seller_id_status_idx" ON "marketplace_listings"("seller_id", "status");

-- CreateIndex
CREATE INDEX "marketplace_listings_book_id_idx" ON "marketplace_listings"("book_id");

-- CreateIndex
CREATE INDEX "marketplace_listings_status_created_at_idx" ON "marketplace_listings"("status", "created_at");

-- CreateIndex
CREATE INDEX "marketplace_messages_listing_id_created_at_idx" ON "marketplace_messages"("listing_id", "created_at");

-- CreateIndex
CREATE INDEX "marketplace_messages_receiver_id_read_at_idx" ON "marketplace_messages"("receiver_id", "read_at");

-- CreateIndex
CREATE INDEX "communities_visibility_idx" ON "communities"("visibility");

-- CreateIndex
CREATE INDEX "communities_owner_id_idx" ON "communities"("owner_id");

-- CreateIndex
CREATE INDEX "community_members_user_id_idx" ON "community_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "community_members_community_id_user_id_key" ON "community_members"("community_id", "user_id");

-- CreateIndex
CREATE INDEX "community_posts_community_id_created_at_idx" ON "community_posts"("community_id", "created_at");

-- CreateIndex
CREATE INDEX "community_posts_author_id_idx" ON "community_posts"("author_id");

-- CreateIndex
CREATE INDEX "book_notes_user_id_book_id_idx" ON "book_notes"("user_id", "book_id");

-- CreateIndex
CREATE INDEX "book_notes_book_id_page_idx" ON "book_notes"("book_id", "page");

-- CreateIndex
CREATE INDEX "book_notes_shared_with_community_id_book_id_idx" ON "book_notes"("shared_with_community_id", "book_id");

-- CreateIndex
CREATE INDEX "book_note_likes_user_id_idx" ON "book_note_likes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "book_note_likes_note_id_user_id_key" ON "book_note_likes"("note_id", "user_id");

-- CreateIndex
CREATE INDEX "reading_sessions_user_id_created_at_idx" ON "reading_sessions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "reading_sessions_book_id_idx" ON "reading_sessions"("book_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "notifications_channel_status_idx" ON "notifications"("channel", "status");

-- CreateIndex
CREATE UNIQUE INDEX "badges_code_key" ON "badges"("code");

-- CreateIndex
CREATE INDEX "badges_type_idx" ON "badges"("type");

-- CreateIndex
CREATE INDEX "user_badges_badge_id_idx" ON "user_badges"("badge_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_badges_user_id_badge_id_key" ON "user_badges"("user_id", "badge_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_stats_user_id_key" ON "user_stats"("user_id");

-- CreateIndex
CREATE INDEX "user_stats_streak_jours_idx" ON "user_stats"("streak_jours");

-- CreateIndex
CREATE UNIQUE INDEX "affiliations_referred_id_key" ON "affiliations"("referred_id");

-- CreateIndex
CREATE INDEX "affiliations_referrer_id_idx" ON "affiliations"("referrer_id");

-- CreateIndex
CREATE INDEX "affiliations_code_idx" ON "affiliations"("code");

-- CreateIndex
CREATE INDEX "support_tickets_user_id_status_idx" ON "support_tickets"("user_id", "status");

-- CreateIndex
CREATE INDEX "support_tickets_status_priority_idx" ON "support_tickets"("status", "priority");

-- CreateIndex
CREATE INDEX "reading_progress_user_id_derniere_lecture_idx" ON "reading_progress"("user_id", "derniere_lecture");

-- CreateIndex
CREATE UNIQUE INDEX "reading_progress_user_id_book_id_key" ON "reading_progress"("user_id", "book_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_reading_preferences_user_id_key" ON "user_reading_preferences"("user_id");

-- CreateIndex
CREATE INDEX "chapters_book_id_idx" ON "chapters"("book_id");

-- CreateIndex
CREATE UNIQUE INDEX "chapters_book_id_ordre_key" ON "chapters"("book_id", "ordre");

-- CreateIndex
CREATE INDEX "user_chapter_accesses_user_id_idx" ON "user_chapter_accesses"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_chapter_accesses_user_id_chapter_id_key" ON "user_chapter_accesses"("user_id", "chapter_id");

-- CreateIndex
CREATE INDEX "coin_transactions_user_id_created_at_idx" ON "coin_transactions"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "author_profiles" ADD CONSTRAINT "author_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "books" ADD CONSTRAINT "books_author_profile_id_fkey" FOREIGN KEY ("author_profile_id") REFERENCES "author_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_page_texts" ADD CONSTRAINT "book_page_texts_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_reviews" ADD CONSTRAINT "book_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_reviews" ADD CONSTRAINT "book_reviews_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrows" ADD CONSTRAINT "borrows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrows" ADD CONSTRAINT "borrows_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penalties" ADD CONSTRAINT "penalties_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penalties" ADD CONSTRAINT "penalties_borrow_id_fkey" FOREIGN KEY ("borrow_id") REFERENCES "borrows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "marketplace_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_penalty_id_fkey" FOREIGN KEY ("penalty_id") REFERENCES "penalties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_messages" ADD CONSTRAINT "marketplace_messages_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "marketplace_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_messages" ADD CONSTRAINT "marketplace_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_messages" ADD CONSTRAINT "marketplace_messages_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communities" ADD CONSTRAINT "communities_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_members" ADD CONSTRAINT "community_members_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_members" ADD CONSTRAINT "community_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_notes" ADD CONSTRAINT "book_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_notes" ADD CONSTRAINT "book_notes_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_notes" ADD CONSTRAINT "book_notes_shared_with_community_id_fkey" FOREIGN KEY ("shared_with_community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_note_likes" ADD CONSTRAINT "book_note_likes_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "book_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_note_likes" ADD CONSTRAINT "book_note_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_sessions" ADD CONSTRAINT "reading_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_sessions" ADD CONSTRAINT "reading_sessions_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_sessions" ADD CONSTRAINT "reading_sessions_borrow_id_fkey" FOREIGN KEY ("borrow_id") REFERENCES "borrows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliations" ADD CONSTRAINT "affiliations_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliations" ADD CONSTRAINT "affiliations_referred_id_fkey" FOREIGN KEY ("referred_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_chapter_accesses" ADD CONSTRAINT "user_chapter_accesses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_chapter_accesses" ADD CONSTRAINT "user_chapter_accesses_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coin_transactions" ADD CONSTRAINT "coin_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

