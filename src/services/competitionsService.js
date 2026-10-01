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
  const client = normalizedStudentId ? ensureSupabaseClient() : ensurePublicClient();

  // Applications only need name, phone and level now. The legacy country /
  // birth_date / gender columns are still written when supplied (old clients),
  // but they are optional and validated server-side only when present.
  const normalizedPayload = {
    competition_id: payload.competition_id,
    // Keep the signed-in student link when present so admins can approve
    // the request directly. Guests still submit anonymous pending rows.
    student_id: normalizedStudentId,
    student_name: typeof payload.student_name === 'string' ? payload.student_name.trim() : payload.student_name,
    student_phone: normalizedPhone,
    country: normalizeOptionalText(payload.country),
    birth_date: normalizeOptionalText(payload.birth_date),
    gender: normalizeOptionalText(payload.gender),
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

  // Count signed-in students on the stage.
  const { count: studentCount, error: studentError } = await client
    .from('student_stage_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('current_stage_id', stageId);

  if (studentError) {
    throw studentError;
  }

  // Count guest participants on the stage too, so admins can't delete a
  // stage that still has guests assigned to it.
  const { count: guestCount, error: guestError } = await client
    .from('competition_guest_participants')
    .select('id', { count: 'exact', head: true })
    .eq('current_stage_id', stageId);

  if (guestError) {
    // Guests table may not be migrated yet; only students were checked.
    console.warn('[guest stage check failed]', guestError);
    return (studentCount ?? 0) > 0;
  }

  return (studentCount ?? 0) + (guestCount ?? 0) > 0;
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

// ──────────────────────────────────────────
// Guest Participants — Public (anonymous) flows
// Go through narrow security-definer RPCs; there is no anon table access.
// ──────────────────────────────────────────

/**
 * Submit a guest competition application (no account needed).
 * Returns the participant row — on duplicate applications the existing row
 * comes back (pending/accepted/active/rejected/…) without creating a copy.
 * Includes `public_access_token`, which the caller must persist locally.
 */
export async function submitGuestCompetitionParticipant({ competitionId, studentName, studentPhone, level }) {
  const client = ensurePublicClient();
  const { data, error } = await client.rpc('submit_competition_guest_participant', {
    p_competition_id: competitionId,
    p_student_name: studentName,
    p_student_phone: studentPhone,
    p_level: level,
  });

  if (error) {
    throw error;
  }

  // PostgREST returns set-returning RPC results as arrays.
  return data?.[0] ?? null;
}

/**
 * Recover a guest application using the competition + phone number only.
 * Returns the participant row (with token) or null when nothing is found.
 */
export async function recoverGuestCompetitionParticipant({ competitionId, studentPhone }) {
  const client = ensurePublicClient();
  const { data, error } = await client.rpc('recover_competition_guest_participant', {
    p_competition_id: competitionId,
    p_student_phone: studentPhone,
  });

  if (error) {
    throw error;
  }

  // Empty array means no participant found for this phone.
  return data?.[0] ?? null;
}

/**
 * Look up a guest participant by the token saved in localStorage.
 * Returns the public row (without the token itself) or null.
 */
export async function fetchGuestCompetitionParticipantByToken({ competitionId, token }) {
  const client = ensurePublicClient();
  const { data, error } = await client.rpc('get_competition_guest_participant_by_token', {
    p_competition_id: competitionId,
    p_public_access_token: token,
  });

  if (error) {
    throw error;
  }

  // Empty array means the token no longer matches a row (e.g. deleted).
  return data?.[0] ?? null;
}

// ──────────────────────────────────────────
// Guest Participants — Admin flows
// Rows are identified by the guest participant `id` (unlike signed-in
// students, which are keyed by student_id + competition_id).
// ──────────────────────────────────────────

export async function fetchGuestParticipants(competitionId) {
  const client = ensureSupabaseClient();
  const { data, error } = await client
    .from('competition_guest_participants')
    .select('*')
    .eq('competition_id', competitionId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function fetchPendingGuestParticipants(competitionId) {
  const client = ensureSupabaseClient();
  const { data, error } = await client
    .from('competition_guest_participants')
    .select('*')
    .eq('competition_id', competitionId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

/**
 * Accept a guest. With stages: activate into the first stage.
 * Without stages: plain `accepted` status.
 */
export async function acceptGuestParticipant(participantId, { firstStageId } = {}) {
  const client = ensureSupabaseClient();
  const now = new Date().toISOString();
  const { data, error } = await client
    .from('competition_guest_participants')
    .update({
      status: firstStageId ? 'active' : 'accepted',
      current_stage_id: firstStageId || null,
      accepted_at: now,
      updated_at: now,
    })
    .eq('id', participantId)
    .eq('status', 'pending')
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteGuestParticipant(participantId) {
  const client = ensureSupabaseClient();
  const { error } = await client
    .from('competition_guest_participants')
    .delete()
    .eq('id', participantId);

  if (error) {
    throw error;
  }
}

export async function rejectGuestParticipant(participantId) {
  const client = ensureSupabaseClient();
  const now = new Date().toISOString();
  const { data, error } = await client
    .from('competition_guest_participants')
    .update({
      status: 'rejected',
      rejected_at: now,
      updated_at: now,
    })
    .eq('id', participantId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function moveGuestParticipantToStage(participantId, stageId) {
  const client = ensureSupabaseClient();
  const { data, error } = await client
    .from('competition_guest_participants')
    .update({
      current_stage_id: stageId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', participantId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function moveGuestParticipantToNextStage(participantId, competitionId, nextStageId) {
  const client = ensureSupabaseClient();
  const { data, error } = await client
    .from('competition_guest_participants')
    .update({
      current_stage_id: nextStageId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', participantId)
    .eq('competition_id', competitionId)
    .eq('status', 'active')
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function markGuestParticipantFailed(participantId) {
  const client = ensureSupabaseClient();
  const { data, error } = await client
    .from('competition_guest_participants')
    .update({
      status: 'failed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', participantId)
    .eq('status', 'active')
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function markGuestParticipantCompleted(participantId) {
  const client = ensureSupabaseClient();
  const now = new Date().toISOString();
  const { data, error } = await client
    .from('competition_guest_participants')
    .update({
      status: 'completed',
      completed_at: now,
      updated_at: now,
    })
    .eq('id', participantId)
    .eq('status', 'active')
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export const GUEST_PARTICIPANT_STATUSES = ['pending', 'accepted', 'active', 'rejected', 'failed', 'completed'];

// Admin correction path: not restricted to `status = 'active'`, so a wrongly
// failed or wrongly promoted guest can be sent back to any stage or status.
export async function updateGuestParticipantAssignment(participantId, { stageId, status } = {}) {
  const client = ensureSupabaseClient();
  const updates = { updated_at: new Date().toISOString() };

  if (stageId !== undefined) {
    if (!stageId) {
      throw new Error('يجب تحديد المرحلة المطلوب نقل المشارك إليها.');
    }
    updates.current_stage_id = stageId;
  }

  if (status !== undefined) {
    if (!GUEST_PARTICIPANT_STATUSES.includes(status)) {
      throw new Error('حالة المشارك غير صحيحة.');
    }
    updates.status = status;
    if (status === 'rejected') {
      updates.rejected_at = new Date().toISOString();
    }
    // The final ranking only means anything for participants who finished,
    // so undoing a completion has to drop the stored rank.
    if (status !== 'completed') {
      updates.final_rank = null;
      updates.completed_at = null;
    }
  }

  if (stageId === undefined && status === undefined) {
    throw new Error('لا يوجد تغيير مطلوب.');
  }

  const { data, error } = await client
    .from('competition_guest_participants')
    .update(updates)
    .eq('id', participantId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateGuestParticipantLevel(participantId, newLevel) {
  const client = ensureSupabaseClient();
  const { data, error } = await client
    .from('competition_guest_participants')
    .update({
      level: typeof newLevel === 'string' ? newLevel.trim() : newLevel,
      updated_at: new Date().toISOString(),
    })
    .eq('id', participantId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function bulkUpdateGuestFinalRanks(competitionId, rankedGuests) {
  const client = ensureSupabaseClient();
  const errors = [];

  for (let i = 0; i < rankedGuests.length; i++) {
    const { id } = rankedGuests[i];
    const { error } = await client
      .from('competition_guest_participants')
      .update({
        final_rank: i + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
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
// Participant normalizers
// Unified shape so the admin UI renders one list while branching actions
// internally by `participantType`.
// ──────────────────────────────────────────

export function normalizeStudentParticipant(assignment) {
  return {
    participantType: 'student',
    id: assignment.id,
    studentId: assignment.student_id,
    displayName: assignment.student_profiles?.full_name,
    phone: assignment.student_profiles?.phone,
    level: assignment.level,
    status: assignment.status,
    currentStageId: assignment.current_stage_id,
    finalRank: assignment.final_rank,
    createdAt: assignment.assigned_at,
    raw: assignment,
  };
}

export function normalizeGuestParticipant(guest) {
  return {
    participantType: 'guest',
    id: guest.id,
    studentId: null,
    displayName: guest.student_name,
    phone: guest.student_phone,
    level: guest.level,
    status: guest.status,
    currentStageId: guest.current_stage_id,
    finalRank: guest.final_rank,
    createdAt: guest.created_at,
    raw: guest,
  };
}
