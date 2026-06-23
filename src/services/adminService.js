/**
 * Admin Service Layer
 * ───────────────────
 * Full CRUD for teachers + reviews + photo uploads to Supabase Storage.
 * All mutations require authenticated admin session (enforced by RLS).
 */

import { supabase } from '../lib/supabase';

const TEACHER_PHOTO_BUCKET = 'teacher-photos';
const REVIEW_BUCKET = 'review-images';

function withUpdatedAt(payload = {}) {
  return {
    ...payload,
    updated_at: new Date().toISOString(),
  };
}

function normalizeReviews(items = []) {
  return [...items].sort((a, b) => {
    const aSort = a?.sort_order ?? 0;
    const bSort = b?.sort_order ?? 0;
    if (aSort !== bSort) return aSort - bSort;
    return new Date(a?.created_at ?? 0).getTime() - new Date(b?.created_at ?? 0).getTime();
  });
}

function normalizeTeacher(teacher) {
  if (!teacher) return teacher;
  return {
    ...teacher,
    teacher_reviews: normalizeReviews(teacher.teacher_reviews ?? []),
  };
}

function safeExt(fileName = '') {
  const ext = fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : 'jpg';
  const allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'bmp'];
  return allowed.includes(ext) ? ext : 'jpg';
}

function randomSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function uploadImageToBucket({ bucket, folder, file }) {
  const ext = safeExt(file?.name);
  const path = `${folder}/${randomSuffix()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: false });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);

  return {
    image_url: data.publicUrl,
    image_path: path,
  };
}

export async function isCurrentUserAdmin() {
  if (!supabase) return false;

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const user = userData?.user;
  if (!user) return false;

  const { count, error } = await supabase
    .from('admin_users')
    .select('id', { count: 'exact', head: true })
    .eq('id', user.id)
    .eq('is_active', true);

  if (error) throw error;
  return (count ?? 0) > 0;
}

/** Fetch ALL teachers regardless of gender (admin view) */
export async function fetchAllTeachers() {
  const { data, error } = await supabase
    .from('teachers')
    .select(`
      id, name, gender, bio, photo_url,
      recitation_url, recitation_type, created_at,
      teacher_reviews (*)
    `)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(normalizeTeacher);
}

export async function fetchTeacherAdminById(id) {
  const { data, error } = await supabase
    .from('teachers')
    .select('id, name, gender, bio, photo_url, recitation_url, recitation_type, created_at')
    .eq('id', id)
    .single();

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
  const ext = safeExt(file?.name);
  const path = `${teacherId ?? Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(TEACHER_PHOTO_BUCKET)
    .upload(path, file, { upsert: true });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(TEACHER_PHOTO_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Delete a photo from storage by its public URL */
export async function deleteTeacherPhoto(publicUrl) {
  if (!publicUrl) return;
  const url = new URL(publicUrl);
  // path format: /storage/v1/object/public/<bucket>/<filename>
  const parts = url.pathname.split('/');
  const filename = parts[parts.length - 1];
  await supabase.storage.from(TEACHER_PHOTO_BUCKET).remove([filename]);
}

export async function fetchTeacherReviews(teacherId) {
  const { data, error } = await supabase
    .from('teacher_reviews')
    .select('*')
    .eq('teacher_id', teacherId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return normalizeReviews(data ?? []);
}

export async function createTeacherReview(payload) {
  const insertPayload = {
    ...payload,
    student_name: payload?.student_name?.trim() || 'مراجعة طالب',
  };

  const { data, error } = await supabase
    .from('teacher_reviews')
    .insert([insertPayload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTeacherReview(id, payload) {
  const { data, error } = await supabase
    .from('teacher_reviews')
    .update(withUpdatedAt(payload))
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTeacherReview(id) {
  const { data, error } = await supabase
    .from('teacher_reviews')
    .delete()
    .eq('id', id)
    .select('id, image_path')
    .single();

  if (error) throw error;
  return data;
}

export async function uploadTeacherReviewImage(file, teacherId) {
  return uploadImageToBucket({
    bucket: REVIEW_BUCKET,
    folder: `teachers/${teacherId}`,
    file,
  });
}

export async function fetchAllQuranReviews() {
  const { data, error } = await supabase
    .from('quran_reviews')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return normalizeReviews(data ?? []);
}

export async function fetchPublishedQuranReviews() {
  const { data, error } = await supabase
    .from('quran_reviews')
    .select('*')
    .eq('is_published', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return normalizeReviews(data ?? []);
}

export async function createQuranReview(payload) {
  const { data, error } = await supabase
    .from('quran_reviews')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateQuranReview(id, payload) {
  const { data, error } = await supabase
    .from('quran_reviews')
    .update(withUpdatedAt(payload))
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteQuranReview(id) {
  const { data, error } = await supabase
    .from('quran_reviews')
    .delete()
    .eq('id', id)
    .select('id, image_path')
    .single();

  if (error) throw error;
  return data;
}

export async function uploadQuranReviewImage(file) {
  return uploadImageToBucket({
    bucket: REVIEW_BUCKET,
    folder: 'quran',
    file,
  });
}

export async function deleteReviewImage(imagePath) {
  if (!imagePath) return;
  const { error } = await supabase.storage.from(REVIEW_BUCKET).remove([imagePath]);
  if (error) throw error;
}
