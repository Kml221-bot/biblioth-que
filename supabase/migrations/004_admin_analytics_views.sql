-- ============================================================
-- BiblioTech - Admin analytics views
-- ============================================================

CREATE OR REPLACE VIEW public.view_revenus_quotidiens AS
SELECT
  date_trunc('day', t.created_at)::date AS jour,
  COALESCE(SUM(t.montant), 0)::integer AS revenu_total,
  COALESCE(SUM(t.montant) FILTER (WHERE t.type = 'achat'), 0)::integer AS revenus_achats,
  COALESCE(SUM(t.montant) FILTER (WHERE t.type = 'location'), 0)::integer AS revenus_emprunts,
  COALESCE(SUM(t.montant) FILTER (WHERE t.type = 'abonnement'), 0)::integer AS revenus_abonnements,
  COALESCE(SUM(t.montant) FILTER (WHERE t.type = 'amende'), 0)::integer AS revenus_amendes,
  COALESCE(SUM(t.montant) FILTER (WHERE t.type = 'commission'), 0)::integer AS revenus_commissions,
  COUNT(*)::integer AS transactions_count
FROM public.transactions t
WHERE t.statut = 'completed'
GROUP BY date_trunc('day', t.created_at)::date;

CREATE OR REPLACE VIEW public.view_top_livres AS
SELECT
  b.id AS book_id,
  b.titre,
  b.auteur,
  b.categorie,
  COUNT(br.id)::integer AS lectures_count,
  COUNT(DISTINCT br.user_id)::integer AS lecteurs_uniques,
  MAX(br.created_at) AS derniere_lecture_at
FROM public.books b
LEFT JOIN public.borrows br ON br.book_id = b.id
GROUP BY b.id, b.titre, b.auteur, b.categorie;

CREATE OR REPLACE VIEW public.view_borrows_retard AS
SELECT
  br.id,
  br.user_id,
  br.book_id,
  br.debut,
  br.fin_prevue,
  br.fin_reelle,
  br.statut,
  br.penalite_fcfa,
  br.jours_retard,
  GREATEST(0, CEIL(EXTRACT(EPOCH FROM (now() - br.fin_prevue)) / 86400))::integer AS jours_retard_calc,
  p.email AS user_email,
  NULLIF(TRIM(CONCAT(p.first_name, ' ', p.last_name)), '') AS user_name,
  p.whatsapp_number,
  bk.titre AS book_titre,
  bk.auteur AS book_auteur,
  bk.categorie AS book_categorie,
  br.created_at,
  br.updated_at
FROM public.borrows br
JOIN public.profiles p ON p.id = br.user_id
JOIN public.books bk ON bk.id = br.book_id
WHERE br.fin_prevue < now()
  AND br.statut IN ('actif', 'prolonge', 'retard');
