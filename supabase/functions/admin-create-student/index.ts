import { createClient } from 'npm:@supabase/supabase-js@2.108.2';

// ─── Supabase Admin Client ────────────────────────────────────────────────────
function getAdminKey() {
  const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (secretKeys) {
    try {
      const parsed = JSON.parse(secretKeys) as Record<string, string>;
      if (parsed.default) return parsed.default;
    } catch { /* fall through */ }
  }
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
  if (serviceRoleKey) return serviceRoleKey;
  throw new Error('Missing SUPABASE_SECRET_KEYS or SUPABASE_SERVICE_ROLE_KEY');
}

function createAdminClient() {
  const url = Deno.env.get('SUPABASE_URL')!.trim();
  return createClient(url, getAdminKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ─── Phone → Email helper ─────────────────────────────────────────────────────
function normalizeLocalizedDigits(value: string): string {
  return String(value).replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (digit) => {
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

function normalizeStudentPhone(phone: string): string {
  const rawPhone = normalizeLocalizedDigits(phone).trim();
  const hadLeadingPlus = rawPhone.startsWith('+');
  let digits = rawPhone.replace(/\D/g, '');

  if (!digits) return '';
  if (hadLeadingPlus) return digits;
  if (digits.startsWith('0')) return `2${digits}`;
  return digits;
}

// Generates a deterministic, valid RFC-5321 email from a phone number.
// E.g. 01128472424 → s201128472424@habl-allah.app
// The 's' prefix ensures the local-part starts with a letter (Supabase requirement).
// Must match exactly the same logic used in studentsService.js → phoneToAuthEmail().
function phoneToAuthEmail(phone: string): string {
  const digits = normalizeStudentPhone(phone);
  return `s${digits}@habl-allah.app`;
}

// ─── HTTP Helpers ─────────────────────────────────────────────────────────────
class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

const publicAppOrigin = Deno.env.get('PUBLIC_APP_ORIGIN')?.trim() || '*';
const corsHeaders = {
  'Access-Control-Allow-Origin': publicAppOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

function json(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Cache-Control', 'no-store');
  for (const [k, v] of Object.entries(corsHeaders)) headers.set(k, v);
  return new Response(JSON.stringify(body), { ...init, headers });
}

function handleCors(req: Request) {
  if (req.method !== 'OPTIONS') return null;
  return new Response(null, { status: 204, headers: corsHeaders });
}

async function readJson(req: Request) {
  try { return await req.json(); }
  catch { throw new HttpError(400, 'Invalid JSON body'); }
}

function errorResponse(error: unknown) {
  if (error instanceof HttpError)
    return json({ error: error.message }, { status: error.status });
  console.error('Unhandled error', error);
  return json({ error: 'Internal server error' }, { status: 500 });
}

// ─── Verify Admin ─────────────────────────────────────────────────────────────
async function requireAdminUser(req: Request, adminClient: ReturnType<typeof createAdminClient>) {
  const authHeader = req.headers.get('Authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) throw new HttpError(401, 'Missing bearer token');

  const { data, error } = await adminClient.auth.getUser(match[1]);
  if (error || !data.user) throw new HttpError(401, 'Invalid or expired session');

  const { data: adminRow, error: adminError } = await adminClient
    .from('admin_users')
    .select('id')
    .eq('id', data.user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (adminError) throw adminError;
  if (!adminRow) throw new HttpError(403, 'Admin access required');
  return data.user;
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const adminClient = createAdminClient();
    await requireAdminUser(req, adminClient);

    const { phone, password, fullName, teacherId, gender, country, birthDate } = await readJson(req) as {
      phone: string;
      password: string;
      fullName: string;
      teacherId?: string | null;
      gender?: string | null;
      country?: string | null;
      birthDate?: string | null;
    };

    if (!phone || !password || !fullName) {
      return json({ error: 'phone, password, and fullName are required' }, { status: 400 });
    }

    const normalizedPhone = normalizeStudentPhone(phone);
    if (!/^\d{10,15}$/.test(normalizedPhone)) {
      return json({ error: 'رقم الهاتف يجب أن يتكون من 10 إلى 15 رقماً.' }, { status: 400 });
    }

    if (fullName.trim().length < 2) {
      return json({ error: 'الاسم الكامل يجب أن يكون ثنائياً على الأقل.' }, { status: 400 });
    }

    // Optional new profile fields (all-or-nothing per field, validated when present)
    if (gender != null && gender !== '' && gender !== 'male' && gender !== 'female') {
      return json({ error: 'الجنس يجب أن يكون ذكراً أو أنثى.' }, { status: 400 });
    }

    const normalizedCountry = country?.trim() ?? '';
    if (normalizedCountry !== '' && !/^[A-Za-z]{2}$/.test(normalizedCountry)) {
      return json({ error: 'رمز الدولة غير صحيح.' }, { status: 400 });
    }

    if (birthDate != null && birthDate !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      return json({ error: 'يرجى كتابة تاريخ ميلاد صحيح.' }, { status: 400 });
    }

    // Derive a deterministic valid email from the phone number.
    // Admin API accepts this format without triggering email-validation errors.
    // Login uses the same email derivation in the frontend service.
    const email = phoneToAuthEmail(normalizedPhone);

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // confirmed immediately — no email OTP sent to student
      user_metadata: {
        full_name: fullName.trim(),
        phone: normalizedPhone,
        teacher_id: null,
        ...(gender ? { gender } : {}),
        ...(normalizedCountry ? { country: normalizedCountry.toUpperCase() } : {}),
        ...(birthDate ? { birth_date: birthDate } : {}),
      },
    });

    if (authError) {
      if (
        authError.message?.toLowerCase().includes('already registered') ||
        authError.message?.toLowerCase().includes('already exists')
      ) {
        return json({ error: 'رقم الهاتف هذا مسجل بالفعل.' }, { status: 409 });
      }
      return json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    const { data: studentProfile, error: profileLookupError } = await adminClient
      .from('student_profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (profileLookupError || !studentProfile) {
      await adminClient.auth.admin.deleteUser(userId);
      return json({ error: profileLookupError?.message ?? 'تعذر إنشاء ملف الطالب تلقائياً.' }, { status: 500 });
    }

    if (teacherId) {
      const { error: teacherError } = await adminClient
        .from('student_profiles')
        .update({ teacher_id: teacherId })
        .eq('id', userId);

      if (teacherError) {
        // Roll back auth user to avoid orphans
        await adminClient.auth.admin.deleteUser(userId);
        return json({ error: teacherError.message }, { status: 500 });
      }
    }

    // Belt-and-suspenders: the DB trigger already persists these from
    // user_metadata, but update the row directly in case the trigger hasn't
    // been deployed yet.
    const profileExtras: Record<string, string> = {};
    if (gender) profileExtras.gender = gender;
    if (normalizedCountry) profileExtras.country = normalizedCountry.toUpperCase();
    if (birthDate) profileExtras.birth_date = birthDate;

    if (Object.keys(profileExtras).length > 0) {
      const { error: extrasError } = await adminClient
        .from('student_profiles')
        .update(profileExtras)
        .eq('id', userId);

      if (extrasError) {
        await adminClient.auth.admin.deleteUser(userId);
        return json({ error: extrasError.message }, { status: 500 });
      }
    }

    return json({ user: { id: userId, email } }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
});
