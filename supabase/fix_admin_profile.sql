-- ============================================================
-- Vérifie et crée le profil admin si manquant
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- 1. Vérifier si le profil existe
SELECT id, email, first_name, last_name, role 
FROM public.profiles 
WHERE email = 'Bibliotech61@gmail.com';

-- 2. Si le résultat est vide, créer le profil manuellement :
INSERT INTO public.profiles (id, email, first_name, last_name, role, plan, is_active)
SELECT 
  au.id,
  au.email,
  '',
  '',
  'super_admin',
  'premium',
  true
FROM auth.users au
WHERE au.email = 'Bibliotech61@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'super_admin',
  first_name = '',
  last_name = '',
  plan = 'premium',
  is_active = true;
