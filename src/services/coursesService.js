/**
 * Courses Service Layer
 * ─────────────────────
 * Full CRUD for quran_courses + image uploads to the "quran-courses" Storage bucket.
 * All write operations require an authenticated Supabase session (enforced by RLS).
 *
 * Supabase tables:
 *   quran_courses  (id, slug, name, short_description, long_description,
 *                   price, is_free, image_url, image_path,
 *                   learning_outcomes, number_of_subscribers,
 *                   is_published, sort_order, created_at, updated_at)
 *
 * Supabase Storage bucket:
 *   quran-courses  (public)
 */

import { supabase } from '../lib/supabase';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const COURSES_BUCKET = 'quran-courses';

// ─────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────

function ensureSupabaseClient() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
    );
  }
  return supabase;
}

/** Safe file-extension extraction (guards against missing extensions) */
function safeExt(fileName = '') {
  const ext = fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : 'jpg';
  const allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'];
  return allowed.includes(ext) ? ext : 'jpg';
}

/** Unique storage path for every upload */
function uniquePath(file) {
  const ext = safeExt(file?.name);
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `covers/${suffix}.${ext}`;
}

/**
 * Strip undefined values from a payload before sending to Supabase.
 * Keeps null (explicit clear) but drops keys the caller never set.
 */
function cleanPayload(payload = {}) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, v]) => v !== undefined)
  );
}

// ─────────────────────────────────────────────────────────────
// Public reads (no auth required — RLS allows published rows)
// ─────────────────────────────────────────────────────────────

/**
 * Fetch all published courses, ordered by sort_order then created_at.
 * Used on the public /quran/courses listing page.
 */
export async function fetchPublishedCourses() {
  const client = ensureSupabaseClient();

  const { data, error } = await client
    .from('quran_courses')
    .select(
      'id, slug, name, short_description, price, is_free, image_url, sort_order, created_at'
    )
    .eq('is_published', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Fetch a single published course by slug.
 * Used on the public /quran/courses/:slug detail page.
 * Returns null if not found.
 */
export async function fetchCourseBySlug(slug) {
  const client = ensureSupabaseClient();

  const { data, error } = await client
    .from('quran_courses')
    .select(
      'id, slug, name, short_description, long_description, price, is_free, image_url, learning_outcomes, sort_order, created_at'
    )
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();

  if (error) throw error;
  return data; // null when not found
}

// ─────────────────────────────────────────────────────────────
// Admin reads (requires authenticated session)
// ─────────────────────────────────────────────────────────────

/**
 * Fetch ALL courses regardless of published status.
 * Used in the admin management page.
 */
export async function fetchAllCourses() {
  const client = ensureSupabaseClient();

  const { data, error } = await client
    .from('quran_courses')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Fetch a single course by id for admin child-record pages.
 * Returns null if the course does not exist.
 */
export async function fetchCourseAdminById(id) {
  const client = ensureSupabaseClient();

  const { data, error } = await client
    .from('quran_courses')
    .select('id, slug, name, short_description, is_free, is_published, created_at')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────
// Admin writes
// ─────────────────────────────────────────────────────────────

/**
 * Create a new course.
 * @param {object} payload - Course fields (see table schema).
 * @returns {object} The created course row.
 */
export async function createCourse(payload) {
  const client = ensureSupabaseClient();

  const { data, error } = await client
    .from('quran_courses')
    .insert([cleanPayload(payload)])
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update an existing course by id.
 * Automatically sets updated_at (also handled by DB trigger as a safety net).
 * @param {string} id - Course UUID.
 * @param {object} payload - Partial fields to update.
 * @returns {object} The updated course row.
 */
export async function updateCourse(id, payload) {
  const client = ensureSupabaseClient();

  const { data, error } = await client
    .from('quran_courses')
    .update({
      ...cleanPayload(payload),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a course by id.
 * Note: caller is responsible for deleting the course image from Storage first
 * (via deleteCourseImage) if one was uploaded.
 * @param {string} id - Course UUID.
 */
export async function deleteCourse(id) {
  const client = ensureSupabaseClient();

  const { error } = await client
    .from('quran_courses')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ─────────────────────────────────────────────────────────────
// Storage: course images
// ─────────────────────────────────────────────────────────────

/**
 * Upload a course cover image to Supabase Storage.
 * @param {File} file - The image file selected by the admin.
 * @returns {{ image_url: string, image_path: string }}
 *   image_url  — public URL to store in the DB and render in UI
 *   image_path — storage path to store in the DB for future deletion
 */
export async function uploadCourseImage(file) {
  const client = ensureSupabaseClient();
  const path = uniquePath(file);

  const { error: uploadError } = await client.storage
    .from(COURSES_BUCKET)
    .upload(path, file, { upsert: false });

  if (uploadError) throw uploadError;

  const { data } = client.storage.from(COURSES_BUCKET).getPublicUrl(path);

  return {
    image_url: data.publicUrl,
    image_path: path,
  };
}

/**
 * Delete a course image from Supabase Storage.
 * Safe to call with a null/undefined path (no-op).
 * @param {string|null} imagePath - The storage path returned by uploadCourseImage.
 */
export async function deleteCourseImage(imagePath) {
  if (!imagePath) return;

  const client = ensureSupabaseClient();
  const { error } = await client.storage
    .from(COURSES_BUCKET)
    .remove([imagePath]);

  if (error) throw error;
}
