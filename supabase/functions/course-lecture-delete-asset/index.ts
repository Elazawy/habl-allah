import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { errorResponse, handleCors, HttpError, json, readJson } from '../_shared/http.ts';
import { deleteR2Objects, listR2ObjectKeys } from '../_shared/r2.ts';
import { createAdminClient, requireAdminUser } from '../_shared/supabase.ts';

type DeleteLectureAssetRequest = {
  assetKey?: string;
  assetKeys?: string[];
  coursePrefix?: string;
};

function parseRequestBody(payload: unknown): DeleteLectureAssetRequest {
  if (!payload || typeof payload !== 'object') {
    throw new HttpError(400, 'Request body must be a JSON object');
  }

  const record = payload as Record<string, unknown>;
  const assetKey = typeof record.assetKey === 'string'
    ? record.assetKey.trim()
    : typeof record.r2_object_key === 'string'
      ? record.r2_object_key.trim()
      : '';
  const assetKeys = Array.isArray(record.assetKeys)
    ? record.assetKeys
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean)
    : [];
  const coursePrefix = typeof record.coursePrefix === 'string'
    ? record.coursePrefix.trim()
    : '';

  if (!assetKey && assetKeys.length === 0 && !coursePrefix) {
    throw new HttpError(400, 'Provide assetKey, assetKeys, or coursePrefix');
  }

  return {
    assetKey: assetKey || undefined,
    assetKeys,
    coursePrefix: coursePrefix || undefined,
  };
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const adminClient = createAdminClient();
    await requireAdminUser(req, adminClient);

    const payload = parseRequestBody(await readJson(req));
    const collectedKeys = new Set<string>();

    if (payload.assetKey) {
      collectedKeys.add(payload.assetKey);
    }

    for (const key of payload.assetKeys ?? []) {
      collectedKeys.add(key);
    }

    if (payload.coursePrefix) {
      const prefixedKeys = await listR2ObjectKeys(payload.coursePrefix);
      for (const key of prefixedKeys) {
        collectedKeys.add(key);
      }
    }

    const deletedKeys = await deleteR2Objects([...collectedKeys]);

    return json({
      deletedKeys,
      deletedCount: deletedKeys.length,
    });
  } catch (error) {
    return errorResponse(error);
  }
});
