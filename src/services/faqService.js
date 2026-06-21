/**
 * FAQ Service Layer
 * ─────────────────
 * CRUD for the unified `faqs` table, filtered by platform.
 * Platforms: 'general' | 'quran' | 'islamic_studies'
 */

import { supabase } from '../lib/supabase';

/** Fetch published FAQs for a given platform (public) */
export async function fetchFaqs(platform = 'general') {
  const { data, error } = await supabase
    .from('faqs')
    .select('id, question, answer, sort_order')
    .eq('platform', platform)
    .eq('is_published', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data;
}

/** Fetch ALL FAQs for a given platform (admin — includes unpublished) */
export async function fetchAllFaqs(platform = 'general') {
  const { data, error } = await supabase
    .from('faqs')
    .select('*')
    .eq('platform', platform)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data;
}

/** Create a new FAQ */
export async function createFaq(payload) {
  const { data, error } = await supabase
    .from('faqs')
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Update an existing FAQ */
export async function updateFaq(id, payload) {
  const { data, error } = await supabase
    .from('faqs')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Delete a FAQ */
export async function deleteFaq(id) {
  const { error } = await supabase
    .from('faqs')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

/** Reorder FAQs — accepts an array of { id, sort_order } */
export async function reorderFaqs(items) {
  const promises = items.map(({ id, sort_order }) =>
    supabase
      .from('faqs')
      .update({ sort_order, updated_at: new Date().toISOString() })
      .eq('id', id)
  );
  const results = await Promise.all(promises);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}
