
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ Variables Supabase manquantes. Vérifiez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env'
  );
}

// Le générique <Database> est retiré volontairement : les interfaces TypeScript
// sans index signature ne satisfont pas le GenericSchema de Supabase v2.108.
// Pour un typage complet, générer les types avec :
//   npx supabase gen types typescript --project-id <project-id> > client/src/types/database.gen.ts
export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
);
