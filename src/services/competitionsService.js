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
  const normalizedAge = Number.parseInt(normalizeLocalizedDigits(payload.age), 10);
  const client = normalizedStudentId ? ensureSupabaseClient() : ensurePublicClient();

  const normalizedPayload = {
    competition_id: payload.competition_id,
    // Keep the signed-in student link when present so admins can approve
    // the request directly. Guests still submit anonymous pending rows.
    student_id: normalizedStudentId,
    student_name: typeof payload.student_name === 'string' ? payload.student_name.trim() : payload.student_name,
    student_phone: normalizedPhone,
    country: typeof payload.country === 'string' ? payload.country.trim() : payload.country,
    age: normalizedAge,
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

  if (!Number.isInteger(normalizedPayload.age) || normalizedPayload.age < 3 || normalizedPayload.age > 120) {
    throw new Error('العمر يجب أن يكون رقماً بين 3 و120 عاماً.');
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
