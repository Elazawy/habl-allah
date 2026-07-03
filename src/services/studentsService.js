/**
 * Students Service Layer
 * ──────────────────────
 * Handles student auth (phone-based UX), profile management,
 * and subscription management.
 *
 * Auth strategy:
 *   - Admin creates students via Edge Function using Admin API
 *     → admin.createUser({ email: phoneToAuthEmail(phone), email_confirm: true })
 *   - Students log in via signInWithPassword({ email: phoneToAuthEmail(phone), password })
 *   - The email is deterministic and derived from the phone number.
 *   - No Twilio / Phone Provider required in Supabase.
 */
import { supabase } from '../lib/supabase';

// ─── Helpers ───────────────────────────────────────────────────

/**
 * Converts a phone number to a deterministic, valid Supabase auth email.
 * Examples:
 *   01128472424  →  s201128472424@habl-allah.app
 *   +201128472424 →  s201128472424@habl-allah.app
 *
 * The 's' prefix ensures the local-part starts with a letter (Supabase requirement).
 * Must match exactly the same logic used in the Edge Function.
 */
export function phoneToAuthEmail(phone) {
  let digits = phone.trim().replace(/\s/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);       // +201... → 201...
  else if (digits.startsWith('0')) digits = '2' + digits;     // 01... → 201...
  return `s${digits}@habl-allah.app`;
}

function normalizePhoneLookup(phone) {
  return String(phone ?? '').trim().replace(/\D/g, '');
}

function buildPhoneLookupCandidates(phone) {
  const normalizedPhone = normalizePhoneLookup(phone);
  if (!normalizedPhone) return [];

  const candidates = new Set([normalizedPhone]);

  if (normalizedPhone.startsWith('0')) {
    candidates.add(`2${normalizedPhone}`);
  }

  if (normalizedPhone.startsWith('20') && normalizedPhone.length > 2) {
    candidates.add(`0${normalizedPhone.slice(2)}`);
  }

  return [...candidates];
}

/**
 * Student login — derives the auth email from the phone number, then signs in.
 * Students only ever see/type their phone number.
 */
export async function signInStudent({ phone, password }) {
  const email = phoneToAuthEmail(phone);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

/**
 * Admin creates a student account.
 * Calls the protected Edge Function `admin-create-student` which uses
 * admin.createUser({ email: phoneToAuthEmail(phone), email_confirm: true }).
 */
export async function adminCreateStudent({ phone, password, fullName, teacherId }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Admin session not found');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const res = await fetch(`${supabaseUrl}/functions/v1/admin-create-student`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ phone, password, fullName, teacherId: teacherId || null }),
  });

  const result = await res.json();
  if (!res.ok) {
    throw new Error(result.error ?? 'حدث خطأ أثناء إنشاء الحساب.');
  }
  return result.user;
}

/**
 * Generate a random medium-difficulty password (8-10 chars: letters + digits)
 */
export function generatePassword(length = 9) {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}



/** Fetch own profile (for logged-in student) */
export async function fetchMyStudentProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('student_profiles')
    .select('*, teachers(id, name, photo_url)')
    .eq('id', user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Admin: fetch all students with their teacher and subscription counts */
export async function fetchAllStudents() {
  const { data, error } = await supabase
    .from('student_profiles')
    .select(`
      id, full_name, phone, created_at,
      teachers(id, name),
      student_course_subscriptions(count),
      student_competition_subscriptions(count)
    `)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Admin: fetch single student with full details */
export async function fetchStudentById(studentId) {
  const { data, error } = await supabase
    .from('student_profiles')
    .select(`
      id, full_name, phone, teacher_id, created_at,
      teachers(id, name, photo_url),
      student_course_subscriptions(*, quran_courses(id, name, slug, is_free, is_published)),
      student_competition_subscriptions(*, quran_competitions(id, name, slug))
    `)
    .eq('id', studentId)
    .single();
  if (error) throw error;
  return data;
}

/** Admin: fetch a student account by phone number if it already exists */
export async function fetchStudentByPhone(phone) {
  const phoneCandidates = buildPhoneLookupCandidates(phone);
  if (phoneCandidates.length === 0) return null;

  const { data, error } = await supabase
    .from('student_profiles')
    .select('id, full_name, phone, teacher_id, created_at')
    .in('phone', phoneCandidates);

  if (error) throw error;
  return data?.[0] ?? null;
}

/** Admin: update student's assigned teacher */
export async function updateStudentTeacher(studentId, teacherId) {
  const { data, error } = await supabase
    .from('student_profiles')
    .update({ teacher_id: teacherId ?? null })
    .eq('id', studentId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Admin: update student's basic info */
export async function updateStudentProfile(studentId, payload) {
  const { data, error } = await supabase
    .from('student_profiles')
    .update(payload)
    .eq('id', studentId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Course Subscription ───────────────────────────────────────

/** Admin: grant course access to a student */
export async function grantCourseAccess(studentId, courseId) {
  const { data, error } = await supabase
    .from('student_course_subscriptions')
    .upsert(
      [{ student_id: studentId, course_id: courseId, is_active: true }],
      { onConflict: 'student_id,course_id' }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Admin: revoke course access from a student */
export async function revokeCourseAccess(studentId, courseId) {
  const { data, error } = await supabase
    .from('student_course_subscriptions')
    .update({ is_active: false })
    .match({ student_id: studentId, course_id: courseId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Check if the current logged-in student has access to a paid course */
export async function checkMyCourseAccess(courseId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { count, error } = await supabase
    .from('student_course_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', courseId)
    .eq('student_id', user.id)
    .eq('is_active', true);
  if (error) throw error;
  return (count ?? 0) > 0;
}

// ─── Competition Subscription ──────────────────────────────────

export async function subscribeStudentToCompetition(studentId, competitionId) {
  const { data, error } = await supabase
    .from('student_competition_subscriptions')
    .upsert(
      [{ student_id: studentId, competition_id: competitionId, is_active: true }],
      { onConflict: 'student_id,competition_id' }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function unsubscribeStudentFromCompetition(studentId, competitionId) {
  const { data, error } = await supabase
    .from('student_competition_subscriptions')
    .update({ is_active: false })
    .match({ student_id: studentId, competition_id: competitionId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Fetch student's subscribed course IDs (for dashboard) */
export async function fetchMySubscribedCourses() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('student_course_subscriptions')
    .select('*, quran_courses(id, slug, name, short_description, image_url, is_free)')
    .eq('student_id', user.id)
    .eq('is_active', true);
  if (error) throw error;
  return data ?? [];
}

export async function fetchMySubscribedCompetitions() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('student_competition_subscriptions')
    .select('*, quran_competitions(id, slug, name, short_description, start_date)')
    .eq('student_id', user.id)
    .eq('is_active', true);
  if (error) throw error;
  return data ?? [];
}
