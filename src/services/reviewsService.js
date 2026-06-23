import { supabase } from '../lib/supabase';

export async function fetchPublishedQuranReviews() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('quran_reviews')
    .select('id, image_url, alt_text, sort_order, is_published, created_at')
    .eq('is_published', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}
