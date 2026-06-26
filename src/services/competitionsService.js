import { supabase } from '../lib/supabase';

function orderCompetitions(query) {
  return query
    .order('sort_order', { ascending: true })
    .order('start_date', { ascending: true })
    .order('created_at', { ascending: true });
}

function normalizeOptionalText(value) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    return value ?? null;
  }

  const trimmedValue = value.trim();
  return trimmedValue === '' ? null : trimmedValue;
}

function normalizeCompetitionPayload(payload = {}) {
  const normalizedPayload = {
    ...payload,
    awards_short_description: normalizeOptionalText(payload.awards_short_description),
    awards_complete_description: normalizeOptionalText(payload.awards_complete_description),
  };

  return Object.fromEntries(
    Object.entries(normalizedPayload).filter(([, value]) => value !== undefined)
  );
}

function ensureSupabaseClient() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  return supabase;
}

export async function fetchPublishedCompetitions() {
  const client = ensureSupabaseClient();

  const { data, error } = await orderCompetitions(
    client
      .from('quran_competitions')
      .select('id, slug, name, short_description, start_date, registration_deadline, awards_short_description, sort_order, created_at')
      .eq('is_published', true)
  );

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function fetchCompetitionBySlug(slug) {
  const client = ensureSupabaseClient();

  const { data, error } = await client
    .from('quran_competitions')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function fetchAllCompetitions() {
  const client = ensureSupabaseClient();
  const { data, error } = await orderCompetitions(
    client
      .from('quran_competitions')
      .select('*')
  );

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createCompetition(payload) {
  const client = ensureSupabaseClient();
  const { data, error } = await client
    .from('quran_competitions')
    .insert([normalizeCompetitionPayload(payload)])
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateCompetition(id, payload) {
  const client = ensureSupabaseClient();
  const { data, error } = await client
    .from('quran_competitions')
    .update({
      ...normalizeCompetitionPayload(payload),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteCompetition(id) {
  const client = ensureSupabaseClient();
  const { error } = await client
    .from('quran_competitions')
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }
}
