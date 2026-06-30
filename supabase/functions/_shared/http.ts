export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

const publicAppOrigin = Deno.env.get('PUBLIC_APP_ORIGIN')?.trim() || '*';

export const corsHeaders = {
  'Access-Control-Allow-Origin': publicAppOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

export function json(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Cache-Control', 'no-store');

  for (const [key, value] of Object.entries(corsHeaders)) {
    headers.set(key, value);
  }

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  });
}

export function handleCors(req: Request) {
  if (req.method !== 'OPTIONS') {
    return null;
  }

  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function readJson(req: Request) {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, 'Invalid JSON body');
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return json({ error: error.message }, { status: error.status });
  }

  console.error('Unhandled edge function error', error);
  return json({ error: 'Internal server error' }, { status: 500 });
}
