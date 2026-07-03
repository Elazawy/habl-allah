/**
 * Teachers Service Layer
 * ──────────────────────
 * Reads from Supabase. Falls back to mock data if Supabase is not configured.
 *
 * Supabase tables:
 *   teachers            (id, name, gender, bio, photo_url, recitation_url, recitation_type)
 *   teacher_reviews     (id, teacher_id, image_url, image_path, alt_text, sort_order, is_published, created_at)
 *   preference_requests (id, student_name, age, whatsapp, description, gender_preference, created_at)
 *   subscription_requests (id, teacher_id, teacher_name, student_name, whatsapp, created_at)
 */

import { supabase, publicSupabase } from '../lib/supabase';
import { mockTeachers } from '../data/teachers';

function normalizeTeacherReviews(reviews = []) {
  return reviews
    .filter((r) => r?.image_url && r.is_published !== false)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

function normalizeTeacher(teacher) {
  if (!teacher) return teacher;
  const rawReviews = teacher.teacher_reviews ?? teacher.reviews ?? [];
  const reviews = normalizeTeacherReviews(rawReviews);

  return {
    ...teacher,
    teacher_reviews: reviews,
    reviews,
  };
}

/** Fetch all teachers for a given gender ('male' | 'female') */
export async function fetchTeachers(gender) {
  const client = publicSupabase ?? supabase;
  if (client) {
    const { data, error } = await client
      .from('teachers')
      .select(`
        id, name, gender, bio, photo_url,
        recitation_url, recitation_type, free_trial_enabled,
        teacher_reviews (*)
      `)
      .eq('gender', gender)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(normalizeTeacher);
  }
  return mockTeachers
    .filter((t) => t.gender === gender)
    .map(normalizeTeacher);
}

/** Fetch a single teacher by id (includes reviews) */
export async function fetchTeacherById(id) {
  const client = publicSupabase ?? supabase;
  if (client) {
    const { data, error } = await client
      .from('teachers')
      .select(`
        id, name, gender, bio, photo_url,
        recitation_url, recitation_type, free_trial_enabled,
        teacher_reviews (*)
      `)
      .eq('id', id)
      .single();
    if (error) throw error;
    return normalizeTeacher(data);
  }
  return normalizeTeacher(mockTeachers.find((t) => t.id === id) ?? null);
}

/**
 * Submit a teacher-preference form (recommendation request).
 */
export async function submitPreferenceForm({
  student_name,
  age,
  whatsapp,
  description,
  gender_preference,
}) {
  const payload = { student_name, age, whatsapp, description, gender_preference };

  if (supabase) {
    const { error } = await supabase
      .from('preference_requests')
      .insert([payload]);
    if (error) throw error;
  } else {
    console.log('[preference_request saved]', payload);
  }
}

/**
 * Submit a subscription request.
 */
export async function submitSubscriptionRequest({
  teacher_id,
  teacher_name,
  student_name,
  whatsapp,
}) {
  const payload = { teacher_id, teacher_name, student_name, whatsapp };

  if (supabase) {
    const { error } = await supabase
      .from('subscription_requests')
      .insert([payload]);
    if (error) throw error;
  } else {
    console.log('[subscription_request saved]', payload);
  }
}
