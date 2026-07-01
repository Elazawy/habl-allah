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
// Generates a deterministic, valid RFC-5321 email from a phone number.
// E.g. 01128472424 → s201128472424@habl-allah.app
// The 's' prefix ensures the local-part starts with a letter (Supabase requirement).
// Must match exactly the same logic used in studentsService.js → phoneToAuthEmail().
function phoneToAuthEmail(phone: string): string {
  let digits = phone.trim().replace(/\s/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1); // +201... → 201...
  else if (digits.startsWith('0')) digits = '2' + digits; // 01... → 201...
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

    const { phone, password, fullName, teacherId } = await readJson(req) as {
      phone: string;
      password: string;
      fullName: string;
      teacherId?: string | null;
    };

    if (!phone || !password || !fullName) {
      return json({ error: 'phone, password, and fullName are required' }, { status: 400 });
    }

    // Derive a deterministic valid email from the phone number.
    // Admin API accepts this format without triggering email-validation errors.
    // Login uses the same email derivation in the frontend service.
    const email = phoneToAuthEmail(phone);

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // confirmed immediately — no email OTP sent to student
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

    const profilePayload: Record<string, unknown> = {
      id: userId,
      full_name: fullName.trim(),
      phone: phone.trim(), // store original local format for display
    };
    if (teacherId) profilePayload.teacher_id = teacherId;

    const { error: profileError } = await adminClient
      .from('student_profiles')
      .insert([profilePayload]);

    if (profileError) {
      // Roll back auth user to avoid orphans
      await adminClient.auth.admin.deleteUser(userId);
      return json({ error: profileError.message }, { status: 500 });
    }

    return json({ user: { id: userId, email } }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
});
