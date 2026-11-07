/**
 * Student Requests Service
 * ────────────────────────
 * Admin-only reads and actions for the two existing public request inboxes:
 *   - subscription_requests  (student asked for a specific teacher)
 *   - preference_requests    (student asked for a recommendation)
 *
 * RLS is the source of truth for admin access. Listing goes through the
 * `admin_list_student_requests` RPC, which merges both inboxes in Postgres with
 * an exact total and a real offset/limit, so combined pagination stays correct
 * at any depth and the list payload contains summary fields only.
 *
 * Mutations go through the admin RPCs so assignment + request deletion (or
 * close + deletion) happen atomically in the database.
 */
import { supabase } from '../lib/supabase';
import { normalizeStudentPhone } from '../lib/studentPhone';

const REQUEST_TABLES = {
  subscription: 'subscription_requests',
  preference: 'preference_requests',
};

const REQUEST_NOTIFICATION_COLUMNS = {
  subscription: 'subscription_request_id',
  preference: 'preference_request_id',
};

export const REQUEST_TYPES = ['subscription', 'preference'];
export const REQUEST_STATUSES = ['new', 'contacted'];

export const REQUEST_TYPE_LABELS = {
  subscription: 'طلب اشتراك بمعلم',
  preference: 'طلب ترشيح معلم',
};

export const REQUEST_TYPE_SHORT_LABELS = {
  subscription: 'اشتراك بمعلم',
  preference: 'ترشيح معلم',
};

export const REQUEST_STATUS_LABELS = {
  new: 'جديد',
  contacted: 'تم التواصل',
};

const STUDENT_ACCOUNT_COLUMNS = `
  id, full_name, phone, teacher_id, created_at,
  teachers(id, name)
`;

/**
 * List payloads deliberately omit `notes` and `history`. Those can be several
 * kilobytes per row and are only needed when one request is opened.
 */
const REQUEST_SUMMARY_COLUMNS = {
  subscription: [
    'id', 'student_name', 'whatsapp', 'teacher_id', 'teacher_name',
    'status', 'created_at', 'updated_at', 'student_id',
  ].join(', '),
  preference: [
    'id', 'student_name', 'whatsapp', 'age', 'gender_preference',
    'status', 'created_at', 'updated_at', 'student_id',
  ].join(', '),
};

const LIST_RPC = 'admin_list_student_requests';

const LIST_RPC_FIELDS = new Set([
  'id', 'request_type', 'student_name', 'whatsapp',
  'teacher_id', 'teacher_name', 'gender_preference', 'age',
  'created_at', 'updated_at', 'status', 'student_id',
]);

function normalizeSummaryRow(row) {
  if (!row || !REQUEST_TYPES.includes(row.request_type)) return null;

  // Keep only the agreed summary contract even if the RPC later grows fields.
  const summary = {};
  LIST_RPC_FIELDS.forEach((field) => {
    if (row[field] !== undefined) summary[field] = row[field];
  });

  return normalizeRequest(summary, row.request_type);
}

function parseListPayload(data) {
  const payload = typeof data === 'string' ? JSON.parse(data) : data;
  const rows = Array.isArray(payload?.items) ? payload.items : [];
  const total = Number(payload?.total ?? 0);

  return {
    items: rows.map(normalizeSummaryRow).filter(Boolean),
    total: Number.isFinite(total) && total > 0 ? total : 0,
  };
}

function assertRequestType(type) {
  if (!REQUEST_TABLES[type]) {
    throw new Error('نوع الطلب غير معروف.');
  }
  return type;
}

function normalizeRequest(row, type) {
  if (!row) return null;
  return {
    ...row,
    request_type: type,
    status: row.status || 'new',
    notes: row.notes ?? '',
    history: Array.isArray(row.history) ? row.history : [],
  };
}

/**
 * Keep letters (including Arabic), combining marks, digits and spaces. Every
 * PostgREST structural character (, . : ( ) " ' \ *) is replaced, so a search
 * value can never change the shape of an `or=(...)` filter.
 */
function sanitizeTerm(value) {
  return String(value ?? '')
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

/**
 * The list RPC receives one search value for both name and phone. Name-style
 * searches keep their letters; phone-style searches are canonicalized so local
 * (`01…`) and Arabic-Indic digit input still match the stored `20…` form.
 */
function sanitizeListSearch(value) {
  const safe = sanitizeTerm(value);
  if (!safe) return null;
  if (/[\p{L}\p{M}]/u.test(safe)) return safe;

  return normalizeStudentPhone(safe) || null;
}

/**
 * Phone values in the two request tables are stored in the canonical format,
 * but imported/legacy rows may still use a local 0-prefixed form. Keep the
 * lookup candidates in one place so search and related requests agree.
 */
function buildPhoneCandidates(phone) {
  const rawDigits = String(phone ?? '').replace(/\D/g, '');
  const canonical = normalizeStudentPhone(phone);
  const candidates = new Set();

  if (rawDigits) candidates.add(rawDigits);
  if (canonical) candidates.add(canonical);

  if (rawDigits.startsWith('0')) candidates.add(`2${rawDigits}`);
  if (rawDigits.startsWith('20') && rawDigits.length > 2) {
    candidates.add(`0${rawDigits.slice(2)}`);
  }

  return [...candidates].filter(Boolean);
}

function applySearch(query, term, { nameColumn = 'student_name', phoneColumn = 'whatsapp' } = {}) {
  const safeTerm = sanitizeTerm(term);
  const rawDigits = String(term ?? '').replace(/\D/g, '');
  const canonicalDigits = normalizeStudentPhone(term);
  const filters = [];

  if (safeTerm) filters.push(`${nameColumn}.ilike.%${safeTerm}%`);

  const phoneTerms = new Set([rawDigits, canonicalDigits].filter(Boolean));
  phoneTerms.forEach((digits) => filters.push(`${phoneColumn}.ilike.%${digits}%`));

  return filters.length > 0 ? query.or(filters.join(',')) : query;
}

function assertStatus(status) {
  if (!status) return '';
  if (!REQUEST_STATUSES.includes(status)) {
    throw new Error('حالة الطلب غير معروفة.');
  }
  return status;
}

/**
 * Fetch one combined page of requests from the database.
 *
 * `public.admin_list_student_requests` performs the UNION ALL, ordering
 * (created_at DESC, id DESC, request_type ASC), exact total count and range in
 * Postgres, so combining both inboxes never depends on PostgREST's row limit and
 * never loads full notes/history for the list.
 */
export async function fetchStudentRequests({
  type = 'all',
  status = '',
  search = '',
  page = 1,
  pageSize = 20,
} = {}) {
  if (type !== 'all') assertRequestType(type);

  const currentPage = Math.max(1, Number(page) || 1);
  const size = Math.min(100, Math.max(1, Number(pageSize) || 20));
  const safeStatus = assertStatus(status);

  const { data, error } = await supabase.rpc(LIST_RPC, {
    p_type: type,
    p_status: safeStatus || null,
    p_search: sanitizeListSearch(search),
    p_offset: (currentPage - 1) * size,
    p_limit: size,
  });

  if (error) throw error;

  const { items, total } = parseListPayload(data);
  return { items, total, page: currentPage, pageSize: size };
}

/** Fetch one request directly (used by the list and by deep links). */
export async function fetchStudentRequest({ type, id }) {
  assertRequestType(type);
  if (!id) throw new Error('معرّف الطلب غير موجود.');

  const { data, error } = await supabase
    .from(REQUEST_TABLES[type])
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return normalizeRequest(data, type);
}

/** Find a request when a deep link omitted `type`; subscription wins ties. */
export async function findStudentRequestAnyType(id) {
  for (const type of REQUEST_TYPES) {
    const request = await fetchStudentRequest({ type, id });
    if (request) return request;
  }
  return null;
}

/** Other requests that use the same normalized phone, newest first. */
export async function fetchRelatedStudentRequests({ phone, limit = 8 }) {
  const candidates = buildPhoneCandidates(phone);
  if (candidates.length === 0) return [];

  const results = await Promise.all(
    REQUEST_TYPES.map(async (type) => {
      const { data, error } = await supabase
        .from(REQUEST_TABLES[type])
        .select(REQUEST_SUMMARY_COLUMNS[type])
        .in('whatsapp', candidates)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data ?? []).map((row) => normalizeRequest(row, type));
    })
  );

  return results
    .flat()
    .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
    .slice(0, limit);
}

/** Delivery/outbox rows for one request, newest first. */
export async function fetchStudentRequestNotifications({ type, id }) {
  assertRequestType(type);
  if (!id) return [];

  const column = REQUEST_NOTIFICATION_COLUMNS[type];
  const { data, error } = await supabase
    .from('student_request_notifications')
    .select('*')
    .eq(column, id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/** Reset one outbox row so the background sender can try it again. */
export async function retryStudentRequestNotification(notificationId) {
  if (!notificationId) throw new Error('معرّف الإشعار غير موجود.');

  const { data, error } = await supabase.rpc('admin_retry_student_request_notification', {
    p_id: notificationId,
  });

  if (error) throw error;
  return data;
}

/** Save the workflow status and internal notes through the admin RPC. */
export async function updateStudentRequest({ type, id, status, notes }) {
  assertRequestType(type);
  assertStatus(status);
  if (!id) throw new Error('معرّف الطلب غير موجود.');

  const { data, error } = await supabase.rpc('admin_update_student_request', {
    p_type: type,
    p_id: id,
    p_status: status,
    p_notes: notes?.trim() ? notes.trim() : null,
  });

  if (error) throw error;
  return data;
}

/**
 * Atomic fulfilment: the database assigns the teacher, records history for the
 * student, and deletes the request + its notification rows.
 */
export async function fulfillStudentRequest({ type, id, studentId, teacherId }) {
  assertRequestType(type);
  if (!id) throw new Error('معرّف الطلب غير موجود.');
  if (!studentId) throw new Error('يجب اختيار حساب الطالب أولاً.');
  if (!teacherId) throw new Error('يجب اختيار المعلم أولاً.');

  const { data, error } = await supabase.rpc('admin_fulfill_student_request', {
    p_type: type,
    p_id: id,
    p_student_id: studentId,
    p_teacher_id: teacherId,
  });

  if (error) throw error;
  return data;
}

/** Permanently delete a closed/completed request, its history and outbox rows. */
export async function closeStudentRequest({ type, id }) {
  assertRequestType(type);
  if (!id) throw new Error('معرّف الطلب غير موجود.');

  const { data, error } = await supabase.rpc('admin_close_student_request', {
    p_type: type,
    p_id: id,
  });

  if (error) throw error;
  return data;
}

/** Server-side account search; never loads the full student_profiles table. */
export async function searchStudentAccounts({ query, limit = 8 } = {}) {
  if (!sanitizeTerm(query)) return [];

  let request = supabase
    .from('student_profiles')
    .select(STUDENT_ACCOUNT_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(Math.min(20, Math.max(1, Number(limit) || 8)));

  request = applySearch(request, query, {
    nameColumn: 'full_name',
    phoneColumn: 'phone',
  });

  const { data, error } = await request;
  if (error) throw error;
  return data ?? [];
}

/** Exact/legacy phone candidates for the "existing account" suggestion. */
export async function findStudentAccountsByPhone(phone, { limit = 5 } = {}) {
  const candidates = buildPhoneCandidates(phone);
  if (candidates.length === 0) return [];

  const { data, error } = await supabase
    .from('student_profiles')
    .select(STUDENT_ACCOUNT_COLUMNS)
    .in('phone', candidates)
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function fetchStudentAccountById(studentId) {
  if (!studentId) return null;

  const { data, error } = await supabase
    .from('student_profiles')
    .select(STUDENT_ACCOUNT_COLUMNS)
    .eq('id', studentId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Crypto-backed password for the account-creation handoff.
 *
 * This value is returned to the caller and displayed once in the admin page.
 * It is deliberately not written to notes, history, or any other persistence
 * layer in this service.
 */
export function generateSecurePassword(length = 10) {
  const size = Math.min(10, Math.max(8, Number(length) || 10));
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const all = `${lower}${upper}${digits}`;
  const cryptoApi = globalThis.crypto;

  if (!cryptoApi?.getRandomValues) {
    throw new Error('المتصفح لا يدعم توليد كلمة مرور آمنة. استخدم متصفحاً حديثاً.');
  }

  function randomIndex(max) {
    const limit = Math.floor(0x100000000 / max) * max;
    const buffer = new Uint32Array(1);
    do {
      cryptoApi.getRandomValues(buffer);
    } while (buffer[0] >= limit);
    return buffer[0] % max;
  }

  function randomChar(chars) {
    return chars[randomIndex(chars.length)];
  }

  // Guarantee one character from each class, then fill and shuffle. This keeps
  // the value compatible with the existing 6–10 character student password.
  const chars = [randomChar(lower), randomChar(upper), randomChar(digits)];
  while (chars.length < size) chars.push(randomChar(all));

  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}
