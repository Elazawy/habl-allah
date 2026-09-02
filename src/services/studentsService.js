/**
 * Students Service Layer
 * ──────────────────────
 * Handles student auth (phone-based UX), self-signup, profile management,
 * and subscription management.
 *
 * Auth strategy:
 *   - Admin creates students via Edge Function using Admin API
 *     → admin.createUser({ email: phoneToAuthEmail(phone), email_confirm: true })
 *   - Students self-sign up via the public `student-self-signup` Edge Function
 *     → admin.createUser({ email: phoneToAuthEmail(phone), email_confirm: true })
 *   - Students log in via signInWithPassword({ email: phoneToAuthEmail(phone), password })
 *   - The email is deterministic and derived from the phone number.
 *   - No Twilio / Phone Provider required in Supabase.
 */
import { supabase } from '../lib/supabase';

// ─── Helpers ───────────────────────────────────────────────────

function normalizeLocalizedDigits(value) {
  return String(value ?? '').replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (digit) => {
    const code = digit.charCodeAt(0);

    if (code >= 0x0660 && code <= 0x0669) {
      return String(code - 0x0660);
    }

    if (code >= 0x06F0 && code <= 0x06F9) {
      return String(code - 0x06F0);
    }

    return digit;
  });
}

/**
 * Canonical student phone format used across auth + profile storage.
 * Examples:
 *   01128472424   → 201128472424
 *   +201128472424 → 201128472424
 *   201128472424  → 201128472424
 */
export function normalizeStudentPhone(phone) {
  const rawPhone = normalizeLocalizedDigits(phone).trim();
  const hadLeadingPlus = rawPhone.startsWith('+');
  let digits = rawPhone.replace(/\D/g, '');

  if (!digits) return '';
  if (hadLeadingPlus) return digits;
  if (digits.startsWith('0')) return `2${digits}`;
  return digits;
}

export function isValidStudentPhone(phone) {
  return /^\d{10,15}$/.test(normalizeStudentPhone(phone));
}

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
  const digits = normalizeStudentPhone(phone);
  return `s${digits}@habl-allah.app`;
}

function normalizePhoneLookup(phone) {
  return normalizeLocalizedDigits(phone).replace(/\D/g, '');
}

function buildPhoneLookupCandidates(phone) {
  const normalizedPhone = normalizePhoneLookup(phone);
  const canonicalPhone = normalizeStudentPhone(phone);
  if (!normalizedPhone && !canonicalPhone) return [];

  const candidates = new Set();

  if (normalizedPhone) candidates.add(normalizedPhone);
  if (canonicalPhone) candidates.add(canonicalPhone);

  if (normalizedPhone.startsWith('0')) {
    candidates.add(`2${normalizedPhone}`);
  }

  if (normalizedPhone.startsWith('20') && normalizedPhone.length > 2) {
    candidates.add(`0${normalizedPhone.slice(2)}`);
  }

  return [...candidates];
}

async function getFunctionErrorMessage(error, actionLabel) {
  const response = error?.context;

  if (response && typeof response.clone === 'function') {
    try {
      const responseBody = await response.clone().json();
      const responseMessage =
        typeof responseBody?.error === 'string'
          ? responseBody.error.trim()
          : typeof responseBody?.message === 'string'
            ? responseBody.message.trim()
            : '';

      if (responseMessage) {
        return responseMessage;
      }
    } catch {
      try {
        const responseText = (await response.clone().text()).trim();
        if (responseText) {
          return responseText;
        }
      } catch {
        // Ignore response parsing errors and fall back to the client error message.
      }
    }
  }

  const message = error?.message ?? '';

  if (/Edge Function|FunctionsFetchError|Failed to send a request to the Edge Function|non-2xx/i.test(message)) {
    return `خدمة ${actionLabel} غير مفعلة في الخلفية بعد. اربط الدالة المخصصة لها ثم أعد المحاولة.`;
  }

  return message || `تعذر ${actionLabel} حالياً.`;
}

export async function signUpStudent({ phone, password, fullName }) {
  const normalizedPhone = normalizeStudentPhone(phone);
  const { error } = await supabase.functions.invoke('student-self-signup', {
    body: {
      fullName: fullName.trim(),
      phone: normalizedPhone,
      password,
    },
  });

  if (error) {
    throw new Error(await getFunctionErrorMessage(error, 'إنشاء الحساب'));
  }

  return signInStudent({ phone: normalizedPhone, password });
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
 * Calls a protected admin Edge Function with the current admin session.
 *
 * The `apikey` header is what `supabase.functions.invoke()` sends for us; raw
 * fetch has to add it explicitly or the API gateway rejects the request before
 * the function ever boots.
 *
 * Error bodies come in two shapes: our functions return `{ error }`, while
 * gateway / edge-runtime failures (missing key, boot error, function not found)
 * return `{ code, message }` or plain text. Surface both, otherwise every
 * infrastructure failure looks like the same opaque fallback message.
 */
async function invokeAdminFunction(functionName, payload, fallbackMessage) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Admin session not found');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const res = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseKey,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(payload),
  });

  const rawBody = await res.text();
  let parsedBody = null;
  try {
    parsedBody = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    // Non-JSON body (HTML error page, plain text) — keep the raw text below.
  }

  if (!res.ok) {
    // A message our own function authored is already user-facing.
    if (typeof parsedBody?.error === 'string' && parsedBody.error.trim()) {
      throw new Error(parsedBody.error.trim());
    }

    const detail = [parsedBody?.message, parsedBody?.msg, parsedBody?.code, rawBody]
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .find(Boolean);

    throw new Error(
      detail
        ? `${fallbackMessage} (${res.status}: ${detail})`
        : `${fallbackMessage} (${res.status})`
    );
  }

  return parsedBody ?? {};
}

/**
 * Admin creates a student account.
 * Calls the protected Edge Function `admin-create-student` which uses
 * admin.createUser({ email: phoneToAuthEmail(phone), email_confirm: true }).
 */
export async function adminCreateStudent({ phone, password, fullName, teacherId }) {
  const result = await invokeAdminFunction(
    'admin-create-student',
    {
      phone: normalizeStudentPhone(phone),
      password,
      fullName: fullName.trim(),
      teacherId: teacherId || null,
    },
    'حدث خطأ أثناء إنشاء الحساب.'
  );

  return result.user;
}

export async function adminDeleteStudent(studentId) {
  const result = await invokeAdminFunction(
    'admin-delete-student',
    { studentId },
    'حدث خطأ أثناء حذف الحساب.'
  );

  return result.student;
}

/**
 * Generate a random medium-difficulty password (8-10 chars: letters + digits)
 */
export function generatePassword(length = 9) {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}



/** Fetch own profile (for logged-in student) */
export async function fetchMyStudentProfile(userId) {
  let id = userId;
  if (!id) {
    // Costs a network round-trip — prefer passing the id from the session you
    // already have (see the note in `context/AuthContext.jsx`).
    const { data: { user } } = await supabase.auth.getUser();
    id = user?.id;
  }
  if (!id) return null;

  const { data, error } = await supabase
    .from('student_profiles')
    .select('*, teachers(id, name, photo_url)')
    .eq('id', id)
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

  const [subsRes, assignmentsRes] = await Promise.all([
    supabase
      .from('student_competition_subscriptions')
      .select('*, quran_competitions(id, slug, name, short_description, start_date)')
      .eq('student_id', user.id)
      .eq('is_active', true),
    supabase
      .from('student_stage_assignments')
      .select('status, level, current_stage_id, final_rank, competition_id, competition_stages(name)')
      .eq('student_id', user.id)
  ]);

  if (subsRes.error) throw subsRes.error;
  if (assignmentsRes.error) {
    console.error('Error fetching stage assignments:', assignmentsRes.error);
  }

  const assignmentsByCompId = new Map();
  (assignmentsRes.data || []).forEach((a) => {
    assignmentsByCompId.set(a.competition_id, a);
  });

  return (subsRes.data || []).map((sub) => ({
    ...sub,
    student_stage_assignments: assignmentsByCompId.get(sub.competition_id) || null,
  }));
}
