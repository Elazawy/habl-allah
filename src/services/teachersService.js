/**
 * Teachers Service Layer
 * ──────────────────────
 * Reads from Supabase. Falls back to mock data if Supabase is not configured.
 *
 * Supabase tables:
 *   teachers            (id, name, gender, bio, photo_url, recitation_url, recitation_type)
 *   teacher_reviews     (id, teacher_id, student_name, rating, text, created_at)
 *   preference_requests (id, student_name, age, whatsapp, description, gender_preference, created_at)
 *   subscription_requests (id, teacher_id, teacher_name, student_name, whatsapp, created_at)
 */

import { supabase } from '../lib/supabase';
import { mockTeachers } from '../data/teachers';

/** Fetch all teachers for a given gender ('male' | 'female') */
export async function fetchTeachers(gender) {
  if (supabase) {
    const { data, error } = await supabase
      .from('teachers')
      .select(`
        id, name, gender, bio, photo_url,
        recitation_url, recitation_type,
        teacher_reviews (id, student_name, rating, text, created_at)
      `)
      .eq('gender', gender)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  }
  return mockTeachers.filter((t) => t.gender === gender);
}

/** Fetch a single teacher by id (includes reviews) */
export async function fetchTeacherById(id) {
  if (supabase) {
    const { data, error } = await supabase
      .from('teachers')
      .select(`
        id, name, gender, bio, photo_url,
        recitation_url, recitation_type,
        teacher_reviews (id, student_name, rating, text, created_at)
      `)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }
  return mockTeachers.find((t) => t.id === id) ?? null;
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
