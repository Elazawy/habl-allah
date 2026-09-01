import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';


/**
 * Default request timeout in milliseconds.
 * Prevents Supabase calls from hanging forever when the network is unreachable
 * or the edge is slow to respond.
 */
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Wraps the native `fetch` with an AbortController-based timeout.
 * If a request takes longer than `REQUEST_TIMEOUT_MS`, it is aborted and
 * a descriptive error is thrown — which existing catch blocks already handle.
 */
function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  // Respect any signal the caller already set (e.g. Supabase internal)
  const existingSignal = options.signal;
  if (existingSignal) {
    existingSignal.addEventListener('abort', () => controller.abort());
  }

  return fetch(url, { ...options, signal: controller.signal }).finally(() => {
    clearTimeout(timeoutId);
  });
}

function buildClient(options = {}) {
  if (!supabaseUrl || !supabaseKey) return null;

  return createClient(supabaseUrl, supabaseKey, {
    ...options,
    global: {
      ...options.global,
      fetch: fetchWithTimeout,
    },
  });
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
