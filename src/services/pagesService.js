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

function normalizeOptionalText(value) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') return value ?? null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function normalizePagePayload(payload = {}) {
  const next = { ...payload };
  for (const field of ['title_en', 'title_tr', 'content_en', 'content_tr']) {
    if (field in payload) {
      next[field] = normalizeOptionalText(payload[field]);
    }
  }
  return Object.fromEntries(
    Object.entries(next).filter(([, value]) => value !== undefined)
  );
}

/** Update a page's content by slug */
export async function updatePage(slug, payload) {
  const { data, error } = await supabase
    .from('pages')
    .update({
      ...normalizePagePayload(payload),
      updated_at: new Date().toISOString(),
    })
    .eq('slug', slug)
    .select()
    .single();
  if (error) throw error;
  return data;
}
