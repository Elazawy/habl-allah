import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

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

  // Mirror any signal the caller already set (e.g. Supabase internal) onto
  // ours, and tear the bridge down with the request — the caller's signal can
  // outlive this call, so a listener left behind is a leak.
  const callerSignal = options.signal;
  const abortFromCaller = () => controller.abort(callerSignal?.reason);

  if (callerSignal) {
    if (callerSignal.aborted) abortFromCaller();
    else callerSignal.addEventListener('abort', abortFromCaller, { once: true });
  }

  return fetch(url, { ...options, signal: controller.signal }).finally(() => {
    clearTimeout(timeoutId);
    callerSignal?.removeEventListener('abort', abortFromCaller);
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
