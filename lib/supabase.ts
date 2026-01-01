import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase URL and Anon Key must be set in environment variables');
  console.error('   VITE_SUPABASE_URL:', supabaseUrl ? '✅ Défini' : '❌ Manquant');
  console.error('   VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Défini' : '❌ Manquant');
  throw new Error('Configuration Supabase manquante. Vérifiez vos variables d\'environnement.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Log de configuration en développement
if (import.meta.env.DEV) {
  console.log('🔌 Supabase client initialisé:', {
    url: supabaseUrl,
    anonKey: supabaseAnonKey.substring(0, 20) + '...',
  });
}

