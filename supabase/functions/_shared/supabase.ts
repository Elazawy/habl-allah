import { createClient } from 'npm:@supabase/supabase-js@2.108.2';

import { HttpError } from './http.ts';

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getAdminKey() {
  const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (secretKeys) {
    try {
      const parsed = JSON.parse(secretKeys) as Record<string, string>;
      if (parsed.default) {
        return parsed.default;
      }
    } catch (error) {
      console.warn('Failed to parse SUPABASE_SECRET_KEYS, falling back to service role key', error);
    }
  }

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
  if (serviceRoleKey) {
    return serviceRoleKey;
  }

  throw new Error('Missing SUPABASE_SECRET_KEYS default key and SUPABASE_SERVICE_ROLE_KEY');
}

export function createAdminClient() {
  return createClient(getRequiredEnv('SUPABASE_URL'), getAdminKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function requireAdminUser(req: Request, adminClient = createAdminClient()) {
  const authHeader = req.headers.get('Authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);

  if (!match?.[1]) {
    throw new HttpError(401, 'Missing bearer token');
  }

  const { data, error } = await adminClient.auth.getUser(match[1]);
  if (error || !data.user) {
    throw new HttpError(401, 'Invalid or expired session');
  }

  const { data: adminRow, error: adminError } = await adminClient
    .from('admin_users')
    .select('id')
    .eq('id', data.user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (adminError) {
    throw adminError;
  }

  if (!adminRow) {
    throw new HttpError(403, 'Admin access required');
  }

  return data.user;
}
