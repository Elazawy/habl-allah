import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function buildClient(options) {
  return supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, options)
    : null;
}

export const supabase = buildClient();

export const publicSupabase = buildClient({
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
    storageKey: 'habl-allah-public-readonly',
  },
});
