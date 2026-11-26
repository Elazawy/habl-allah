import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { errorResponse, handleCors, json } from '../_shared/http.ts';
import { getR2BucketUsage } from '../_shared/r2.ts';
import { createAdminClient, requireAdminUser } from '../_shared/supabase.ts';

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return json({ code: 'METHOD_NOT_ALLOWED', error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const adminClient = createAdminClient();
    await requireAdminUser(req, adminClient);

    const usage = await getR2BucketUsage();
    return json(usage);
  } catch (error) {
    return errorResponse(error);
  }
});
