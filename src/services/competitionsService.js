import { supabase, publicSupabase } from '../lib/supabase';

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

function normalizeArrayOfStrings(value) {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set();
  const normalized = [];
  for (const item of value) {
    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (trimmed !== '' && !seen.has(trimmed)) {
        seen.add(trimmed);
        normalized.push(trimmed);
      }
    }
  }
  return normalized;
}

function normalizeLocalizedDigits(value) {
  return String(value ?? '').replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (digit) => {
    const code = digit.charCodeAt(0);

    if (code >= 0x0660 && code <= 0x0669) {
      return String(code - 0x0660);
    }

    if (code >= 0x06f0 && code <= 0x06f9) {
      return String(code - 0x06f0);
    }

    return digit;
  });
}

function normalizePhoneDigits(value) {
  return normalizeLocalizedDigits(value).replace(/\D/g, '');
}

function normalizeCompetitionPayload(payload = {}) {
  const normalizedPayload = {
    ...payload,
    awards_short_description: normalizeOptionalText(payload.awards_short_description),
    awards_complete_description: normalizeOptionalText(payload.awards_complete_description),
    available_levels: normalizeArrayOfStrings(payload.available_levels),
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

function ensurePublicClient() {
  const client = publicSupabase ?? supabase;
  if (!client) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  return client;
}

export async function fetchPublishedCompetitions() {
  const client = ensurePublicClient();

  const { data, error } = await orderCompetitions(
    client
      .from('quran_competitions')
      .select('id, slug, name, short_description, start_date, registration_deadline, awards_short_description, sort_order, created_at, available_levels')
      .eq('is_published', true)
  );

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function fetchCompetitionBySlug(slug) {
  const client = ensurePublicClient();

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

export async function submitCompetitionRegistrationRequest(payload) {
  const normalizedStudentId = typeof payload.student_id === 'string' && payload.student_id.trim() !== ''
    ? payload.student_id.trim()
    : null;
  const normalizedPhone = normalizePhoneDigits(payload.student_phone);
  const normalizedBirthDate = typeof payload.birth_date === 'string'
    ? payload.birth_date.trim()
    : '';
  const normalizedGender = typeof payload.gender === 'string'
    ? payload.gender.trim()
    : '';
  const client = normalizedStudentId ? ensureSupabaseClient() : ensurePublicClient();

  const normalizedPayload = {
    competition_id: payload.competition_id,
    // Keep the signed-in student link when present so admins can approve
    // the request directly. Guests still submit anonymous pending rows.
    student_id: normalizedStudentId,
    student_name: typeof payload.student_name === 'string' ? payload.student_name.trim() : payload.student_name,
    student_phone: normalizedPhone,
    country: typeof payload.country === 'string' ? payload.country.trim() : payload.country,
    birth_date: normalizedBirthDate,
    gender: normalizedGender,
    level: typeof payload.level === 'string' ? payload.level.trim() : payload.level,
  };

  if (!normalizedPayload.competition_id) {
    throw new Error('بيانات المسابقة غير مكتملة. يرجى إعادة تحميل الصفحة ثم المحاولة مرة أخرى.');
  }

  if (typeof normalizedPayload.student_name !== 'string' || normalizedPayload.student_name.length < 2) {
    throw new Error('الاسم يجب أن يتكون من حرفين على الأقل.');
  }

  if (!/^\d{10,15}$/.test(normalizedPayload.student_phone ?? '')) {
    throw new Error('رقم الهاتف يجب أن يتكون من 10 إلى 15 رقماً.');
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedBirthDate)) {
    throw new Error('يرجى كتابة تاريخ ميلاد صحيح.');
  }

  if (!['male', 'female'].includes(normalizedGender)) {
    throw new Error('يرجى تحديد الجنس.');
  }

  if (typeof normalizedPayload.country !== 'string' || normalizedPayload.country.length < 2) {
    throw new Error('الدولة يجب أن تتكون من حرفين على الأقل.');
  }

  if (typeof normalizedPayload.level !== 'string' || normalizedPayload.level.length < 1) {
    throw new Error('يرجى تحديد المستوى المطلوب.');
  }

  const { error } = await client
    .from('competition_registration_requests')
    .insert([normalizedPayload]);

  if (error) {
    throw error;
  }

  return normalizedPayload;
}

export async function fetchSubscribedStudents(competitionId) {
  const client = ensureSupabaseClient();
  const { data, error } = await client
    .from('student_competition_subscriptions')
    .select('id, is_active, subscribed_at, student_profiles(id, full_name, phone)')
    .eq('competition_id', competitionId)
    .eq('is_active', true)
    .order('subscribed_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function fetchRegistrationRequests(competitionId) {
  const client = ensureSupabaseClient();
  const { data, error } = await client
    .from('competition_registration_requests')
    .select('*')
    .eq('competition_id', competitionId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function deleteRegistrationRequest(id) {
  const client = ensureSupabaseClient();
  const { error } = await client
    .from('competition_registration_requests')
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }
}

export async function subscribeStudentToCompetition(studentId, competitionId) {
  const client = ensureSupabaseClient();
  const { data, error } = await client
    .from('student_competition_subscriptions')
    .upsert(
      [{ student_id: studentId, competition_id: competitionId, is_active: true }],
      { onConflict: 'student_id,competition_id' }
    )
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

// ──────────────────────────────────────────
// Competition Stages — CRUD
// ──────────────────────────────────────────

export async function fetchCompetitionStages(competitionId) {
  const client = ensurePublicClient();
  const { data, error } = await client
    .from('competition_stages')
    .select('*')
    .eq('competition_id', competitionId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createCompetitionStage(payload) {
  const client = ensureSupabaseClient();
  const { data, error } = await client
    .from('competition_stages')
    .insert([{
      competition_id: payload.competition_id,
      name: typeof payload.name === 'string' ? payload.name.trim() : payload.name,
      description: normalizeOptionalText(payload.description),
      deadline: payload.deadline || null,
      sort_order: payload.sort_order ?? 0,
    }])
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateCompetitionStage(id, payload) {
  const client = ensureSupabaseClient();
  const updates = {};

  if (payload.name !== undefined) {
    updates.name = typeof payload.name === 'string' ? payload.name.trim() : payload.name;
  }
  if (payload.description !== undefined) {
    updates.description = normalizeOptionalText(payload.description);
  }
  if (payload.deadline !== undefined) {
    updates.deadline = payload.deadline || null;
  }
  if (payload.sort_order !== undefined) {
    updates.sort_order = payload.sort_order;
  }

  const { data, error } = await client
    .from('competition_stages')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteCompetitionStage(id) {
  const client = ensureSupabaseClient();
  const { error } = await client
    .from('competition_stages')
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }
}

export async function checkStageHasStudents(stageId) {
  const client = ensureSupabaseClient();
  const { count, error } = await client
    .from('student_stage_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('current_stage_id', stageId);

  if (error) {
    throw error;
  }

  return (count ?? 0) > 0;
}

// ──────────────────────────────────────────
// Student Stage Assignments
// ──────────────────────────────────────────

export async function fetchStudentStageAssignments(competitionId) {
  const client = ensureSupabaseClient();
  const { data, error } = await client
    .from('student_stage_assignments')
    .select('*, student_profiles(id, full_name, phone), competition_stages(id, name, sort_order)')
    .eq('competition_id', competitionId)
    .order('assigned_at', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function assignStudentToStage(studentId, competitionId, stageId, level) {
  const client = ensureSupabaseClient();
  const { data, error } = await client
    .from('student_stage_assignments')
    .upsert(
      [{
        student_id: studentId,
        competition_id: competitionId,
        current_stage_id: stageId,
        status: 'active',
        level: typeof level === 'string' ? level.trim() : level,
        assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }],
      { onConflict: 'student_id,competition_id' }
    )
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function moveStudentToNextStage(studentId, competitionId, nextStageId) {
  const client = ensureSupabaseClient();
  const { data, error } = await client
    .from('student_stage_assignments')
    .update({
      current_stage_id: nextStageId,
      updated_at: new Date().toISOString(),
    })
    .eq('student_id', studentId)
    .eq('competition_id', competitionId)
    .eq('status', 'active')
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function markStudentFailed(studentId, competitionId) {
  const client = ensureSupabaseClient();
  const { data, error } = await client
    .from('student_stage_assignments')
    .update({
      status: 'failed',
      updated_at: new Date().toISOString(),
    })
    .eq('student_id', studentId)
    .eq('competition_id', competitionId)
    .eq('status', 'active')
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function markStudentCompleted(studentId, competitionId) {
  const client = ensureSupabaseClient();
  const { data, error } = await client
    .from('student_stage_assignments')
    .update({
      status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('student_id', studentId)
    .eq('competition_id', competitionId)
    .eq('status', 'active')
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export const STUDENT_ASSIGNMENT_STATUSES = ['active', 'failed', 'completed'];

// Admin correction path: unlike the mark*/move* helpers above, this one is not
// restricted to `status = 'active'`, so a wrongly failed or wrongly promoted
// student can be sent back to any stage or status.
export async function updateStudentAssignment(studentId, competitionId, { stageId, status } = {}) {
  const client = ensureSupabaseClient();
  const updates = { updated_at: new Date().toISOString() };

  if (stageId !== undefined) {
    if (!stageId) {
      throw new Error('يجب تحديد المرحلة المطلوب نقل الطالب إليها.');
    }
    updates.current_stage_id = stageId;
  }

  if (status !== undefined) {
    if (!STUDENT_ASSIGNMENT_STATUSES.includes(status)) {
      throw new Error('حالة الطالب غير صحيحة.');
    }
    updates.status = status;
    // The final ranking only means anything for students who finished the
    // competition, so undoing a completion has to drop the stored rank.
    if (status !== 'completed') {
      updates.final_rank = null;
    }
  }

  if (stageId === undefined && status === undefined) {
    throw new Error('لا يوجد تغيير مطلوب.');
  }

  const { data, error } = await client
    .from('student_stage_assignments')
    .update(updates)
    .eq('student_id', studentId)
    .eq('competition_id', competitionId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateStudentLevel(studentId, competitionId, newLevel) {
  const client = ensureSupabaseClient();
  const { data, error } = await client
    .from('student_stage_assignments')
    .update({
      level: typeof newLevel === 'string' ? newLevel.trim() : newLevel,
      updated_at: new Date().toISOString(),
    })
    .eq('student_id', studentId)
    .eq('competition_id', competitionId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function bulkUpdateFinalRanks(competitionId, rankedStudents) {
  const client = ensureSupabaseClient();
  const errors = [];

  for (let i = 0; i < rankedStudents.length; i++) {
    const { student_id } = rankedStudents[i];
    const { error } = await client
      .from('student_stage_assignments')
      .update({
        final_rank: i + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('student_id', student_id)
      .eq('competition_id', competitionId)
      .eq('status', 'completed');

    if (error) {
      errors.push(error);
    }
  }

  if (errors.length > 0) {
    throw errors[0];
  }
}

// ──────────────────────────────────────────
// Registration Request — Rejection (update status instead of delete)
// ──────────────────────────────────────────

export async function rejectRegistrationRequest(requestId) {
  const client = ensureSupabaseClient();
  const { data, error } = await client
    .from('competition_registration_requests')
    .update({ status: 'rejected' })
    .eq('id', requestId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

// ──────────────────────────────────────────
// Student — Own Stage Assignment
// ──────────────────────────────────────────

export async function fetchMyStageAssignment(competitionId) {
  const client = ensureSupabaseClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;

  const { data, error } = await client
    .from('student_stage_assignments')
    .select('*, competition_stages(id, name, sort_order)')
    .eq('student_id', user.id)
    .eq('competition_id', competitionId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function fetchMyRejectedRequest(competitionId) {
  const client = ensureSupabaseClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;

  const { data, error } = await client
    .from('competition_registration_requests')
    .select('id, status')
    .eq('competition_id', competitionId)
    .eq('student_id', user.id)
    .eq('status', 'rejected')
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

// ──────────────────────────────────────────
// Admin — Fetch competition by slug (includes unpublished)
// ──────────────────────────────────────────

export async function fetchCompetitionBySlugAdmin(slug) {
  const client = ensureSupabaseClient();
  const { data, error } = await client
    .from('quran_competitions')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

// ──────────────────────────────────────────
// Admin — Fetch pending registration requests only
// ──────────────────────────────────────────

export async function fetchPendingRegistrationRequests(competitionId) {
  const client = ensureSupabaseClient();
  const { data, error } = await client
    .from('competition_registration_requests')
    .select('*')
    .eq('competition_id', competitionId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}
