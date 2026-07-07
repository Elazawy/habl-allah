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
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
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

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    if (req.method !== 'POST' && req.method !== 'DELETE') {
      return json({ error: 'Method not allowed' }, { status: 405 });
    }

    const adminClient = createAdminClient();
    await requireAdminUser(req, adminClient);

    const { studentId } = await readJson(req) as { studentId?: string };
    const normalizedStudentId = studentId?.trim();
    if (!normalizedStudentId) {
      return json({ error: 'studentId is required' }, { status: 400 });
    }

    const { data: student, error: studentError } = await adminClient
      .from('student_profiles')
      .select('id, full_name')
      .eq('id', normalizedStudentId)
      .maybeSingle();

    if (studentError) throw studentError;
    if (!student) {
      return json({ error: 'الحساب المطلوب غير موجود أو تم حذفه بالفعل.' }, { status: 404 });
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(normalizedStudentId);
    if (deleteError) {
      return json({ error: deleteError.message }, { status: 400 });
    }

    return json({ success: true, student: { id: student.id, full_name: student.full_name } });
  } catch (error) {
    return errorResponse(error);
  }
});
