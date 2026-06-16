/**
 * Admin Service Layer
 * ───────────────────
 * Full CRUD for teachers + photo upload to Supabase Storage.
 * All mutations require an authenticated Supabase session (enforced by RLS).
 */

import { supabase } from '../lib/supabase';

const BUCKET = 'teacher-photos';

/** Fetch ALL teachers regardless of gender (admin view) */
export async function fetchAllTeachers() {
  const { data, error } = await supabase
    .from('teachers')
    .select(`
      id, name, gender, bio, photo_url,
      recitation_url, recitation_type, created_at,
      teacher_reviews (id, student_name, rating, text, created_at)
    `)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

/** Create a new teacher */
export async function createTeacher(payload) {
  const { data, error } = await supabase
    .from('teachers')
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Update an existing teacher */
export async function updateTeacher(id, payload) {
  const { data, error } = await supabase
    .from('teachers')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Delete a teacher (reviews cascade automatically via FK) */
export async function deleteTeacher(id) {
  const { error } = await supabase
    .from('teachers')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

/**
 * Upload a teacher photo to Supabase Storage.
 * Returns the public URL of the uploaded file.
 */
export async function uploadTeacherPhoto(file, teacherId) {
  const ext = file.name.split('.').pop();
  const path = `${teacherId ?? Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Delete a photo from storage by its public URL */
export async function deleteTeacherPhoto(publicUrl) {
  if (!publicUrl) return;
  const url = new URL(publicUrl);
  // path format: /storage/v1/object/public/<bucket>/<filename>
  const parts = url.pathname.split('/');
  const filename = parts[parts.length - 1];
  await supabase.storage.from(BUCKET).remove([filename]);
}
