// ============================================================
// BiblioTech — Client Supabase Serveur (Admin)
// Utilise la Service Role Key pour contourner les RLS
// Réservé aux opérations serveur (cron, webhooks, admin)
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn(
    '⚠️ Variables Supabase serveur manquantes. Vérifiez SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env'
  );
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
