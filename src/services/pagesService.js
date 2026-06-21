/**
 * Pages Service Layer
 * ───────────────────
 * Fetch & update static pages (privacy-policy, terms) from the `pages` table.
 */

import { supabase } from '../lib/supabase';

/** Fetch a page by slug (public) */
export async function fetchPage(slug) {
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('slug', slug)
    .single();
  if (error) throw error;
  return data;
}

/** Fetch all pages (admin) */
export async function fetchAllPages() {
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .order('slug', { ascending: true });
  if (error) throw error;
  return data;
}

/** Update a page's content by slug */
export async function updatePage(slug, payload) {
  const { data, error } = await supabase
    .from('pages')
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq('slug', slug)
    .select()
    .single();
  if (error) throw error;
  return data;
}
