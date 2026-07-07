import { createClient } from 'npm:@supabase/supabase-js@2.108.2';

function getAdminKey() {
  const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (secretKeys) {
    try {
      const parsed = JSON.parse(secretKeys) as Record<string, string>;
      if (parsed.default) return parsed.default;
    } catch {
      // Fall through to legacy env var.
    }
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

function phoneToAuthEmail(phone: string): string {
  return `s${normalizeStudentPhone(phone)}@habl-allah.app`;
}

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

  for (const [key, value] of Object.entries(corsHeaders)) {
    headers.set(key, value);
  }

  return new Response(JSON.stringify(body), { ...init, headers });
}

function handleCors(req: Request) {
  if (req.method !== 'OPTIONS') return null;
  return new Response(null, { status: 204, headers: corsHeaders });
}

async function readJson(req: Request) {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, 'Invalid JSON body');
  }
}

function errorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return json({ error: error.message }, { status: error.status });
  }

  console.error('Unhandled error', error);
  return json({ error: 'Internal server error' }, { status: 500 });
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    if (req.method !== 'POST') {
      return json({ error: 'Method not allowed' }, { status: 405 });
    }

    const { phone, password, fullName, teacherId, teacher_id: teacherIdSnakeCase } = await readJson(req) as {
      phone?: string;
      password?: string;
      fullName?: string;
      teacherId?: unknown;
      teacher_id?: unknown;
    };

    if (teacherId !== undefined || teacherIdSnakeCase !== undefined) {
      return json({ error: 'teacherId is not accepted in student self-signup.' }, { status: 400 });
    }

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

    if (password.length < 6) {
      return json({ error: 'يجب أن تتكون كلمة المرور من 6 خانات على الأقل.' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const email = phoneToAuthEmail(normalizedPhone);

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName.trim(),
        phone: normalizedPhone,
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
      .select('id, phone, teacher_id')
      .eq('id', userId)
      .maybeSingle();

    if (profileLookupError || !studentProfile) {
      await adminClient.auth.admin.deleteUser(userId);
      return json({ error: profileLookupError?.message ?? 'تعذر إنشاء ملف الطالب تلقائياً.' }, { status: 500 });
    }

    return json({
      user: {
        id: userId,
        email,
        phone: studentProfile.phone,
        teacher_id: studentProfile.teacher_id,
      },
    }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
});
