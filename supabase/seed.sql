-- ═══════════════════════════════════════════════════════════════
-- BiblioTech — Données initiales (Seed)
-- Valeurs par défaut basées sur le sondage (83 répondants)
-- À exécuter APRÈS la migration 001_initial_schema.sql
-- ═══════════════════════════════════════════════════════════════

-- ── Configuration de la plateforme ──────────────────────────
-- Ces valeurs sont modifiables via le panneau admin sans toucher au code

INSERT INTO public.platform_config (id, cle, valeur, description) VALUES
  -- Tarification abonnements (en FCFA)
  (gen_random_uuid(), 'prix_abonnement_etudiant', '2000', 'Prix mensuel du plan Étudiant en FCFA (66% des votes du sondage)'),
  (gen_random_uuid(), 'prix_abonnement_premium', '3500', 'Prix mensuel du plan Premium en FCFA'),
  (gen_random_uuid(), 'prix_abonnement_ecole_min', '50000', 'Prix annuel minimum B2B École en FCFA'),
  (gen_random_uuid(), 'prix_abonnement_ecole_max', '200000', 'Prix annuel maximum B2B École en FCFA'),

  -- Tarification livres individuels (en FCFA)
  (gen_random_uuid(), 'prix_location_min', '800', 'Prix minimum de location par mois en FCFA (55% des votes)'),
  (gen_random_uuid(), 'prix_achat_min', '2000', 'Prix minimum d''achat définitif en FCFA (51% des votes)'),
  (gen_random_uuid(), 'prix_auteur_min', '500', 'Prix minimum fixé par un auteur en FCFA'),

  -- Commissions plateforme (en %)
  (gen_random_uuid(), 'commission_numerique', '8', 'Commission sur les livres numériques (%)'),
  (gen_random_uuid(), 'commission_physique', '5', 'Commission sur les livres physiques marketplace (%)'),

  -- Limites emprunts
  (gen_random_uuid(), 'emprunts_gratuits_free', '3', 'Nombre d''emprunts par mois pour le plan Free'),
  (gen_random_uuid(), 'duree_emprunt_jours', '14', 'Durée par défaut d''un emprunt en jours'),

  -- Essai gratuit
  (gen_random_uuid(), 'duree_essai_jours', '7', 'Durée de l''essai gratuit Premium en jours'),

  -- Limites offline par plan
  (gen_random_uuid(), 'offline_limit_free', '5', 'Nombre max de livres offline pour le plan Free'),
  (gen_random_uuid(), 'offline_limit_student', '15', 'Nombre max de livres offline pour le plan Étudiant'),
  (gen_random_uuid(), 'offline_limit_premium', '-1', 'Nombre max de livres offline pour le plan Premium (-1 = illimité)'),

  -- Système de parrainage (en FCFA)
  (gen_random_uuid(), 'credit_parrainage_parrain', '500', 'Crédit offert au parrain par inscription convertie en FCFA'),
  (gen_random_uuid(), 'credit_parrainage_filleul', '200', 'Crédit offert au filleul (bonus bienvenue) en FCFA'),

  -- Amendes (en FCFA)
  (gen_random_uuid(), 'prolongation_auto_jours', '3', 'Jours de prolongation automatique gratuite (une seule fois)'),
  (gen_random_uuid(), 'amende_palier_1_jours', '4', 'Jours après prolongation pour amende palier 1'),
  (gen_random_uuid(), 'amende_palier_1_montant', '200', 'Montant amende palier 1 en FCFA'),
  (gen_random_uuid(), 'amende_palier_2_jours', '10', 'Jours de retard pour amende palier 2'),
  (gen_random_uuid(), 'amende_palier_2_montant', '400', 'Montant amende palier 2 en FCFA'),
  (gen_random_uuid(), 'amende_palier_3_jours', '20', 'Jours de retard pour amende palier 3 + blocage emprunts'),
  (gen_random_uuid(), 'amende_palier_3_montant', '500', 'Montant amende palier 3 en FCFA'),

  -- URLs signées
  (gen_random_uuid(), 'url_signee_duree_heures', '1', 'Durée de validité des URLs signées Supabase Storage en heures'),

  -- BibliAI
  (gen_random_uuid(), 'bibliai_max_messages_heure', '30', 'Nombre max de messages BibliAI par heure et par utilisateur'),
  (gen_random_uuid(), 'bibliai_memoire_messages', '10', 'Nombre de messages gardés en mémoire pour le contexte'),

  -- Groupes d''étude
  (gen_random_uuid(), 'communaute_max_membres', '30', 'Nombre maximum de membres par groupe d''étude')
ON CONFLICT (cle) DO NOTHING;
