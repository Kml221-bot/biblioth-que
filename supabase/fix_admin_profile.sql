-- ============================================================
-- Vérifie et crée le profil admin si manquant
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- 1. Vérifier si le profil existe
SELECT id, email, first_name, last_name, role 
FROM public.profiles 
WHERE email = 'mouhamadoukane221@gmail.com';

-- 2. Si le résultat est vide, créer le profil manuellement :
INSERT INTO public.profiles (id, email, first_name, last_name, role, plan)
SELECT 
  au.id,
  au.email,
  'Mouhamadou',
  'Kane',
  'super_admin',
  'premium'
FROM auth.users au
WHERE au.email = 'mouhamadoukane221@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'super_admin',
  first_name = 'Mouhamadou',
  last_name = 'Kane',
  plan = 'premium';
