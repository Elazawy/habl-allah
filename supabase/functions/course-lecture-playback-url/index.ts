import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { errorResponse, handleCors, HttpError, json, readJson } from '../_shared/http.ts';
import { createPresignedR2Url } from '../_shared/r2.ts';
import { createAdminClient } from '../_shared/supabase.ts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PLAYBACK_URL_TTL_SECONDS = 60 * 60;

const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  mp4: 'video/mp4',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  webm: 'audio/webm',
};

type PlaybackUrlRequest = {
  lectureId: string;
};

function parseRequestBody(payload: unknown): PlaybackUrlRequest {
  if (!payload || typeof payload !== 'object') {
    throw new HttpError(400, 'Request body must be a JSON object', 'INVALID_REQUEST_BODY');
  }

  const record = payload as Record<string, unknown>;
  const lectureId = (
    typeof record.lectureId === 'string'
      ? record.lectureId.trim()
      : typeof record.lecture_id === 'string'
        ? record.lecture_id.trim()
        : ''
  );

  if (!UUID_RE.test(lectureId)) {
    throw new HttpError(400, 'lecture_id must be a valid UUID', 'INVALID_LECTURE_ID');
  }

  return { lectureId };
}

async function resolveOptionalUser(req: Request, adminClient: ReturnType<typeof createAdminClient>) {
  const authHeader = req.headers.get('Authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  if (!token) {
    return null;
  }

  const { data, error } = await adminClient.auth.getUser(token);
  if (error || !data?.user) {
    return null;
  }

  return data.user;
}

function resolveResponseContentType(
  storedContentType: string | null | undefined,
  objectKey: string,
  mediaType: string,
) {
  const normalizedStored = storedContentType?.trim().toLowerCase();
  if (normalizedStored) {
    return normalizedStored;
  }

  const ext = objectKey.toLowerCase().split('.').pop() ?? '';
  if (ext && EXTENSION_CONTENT_TYPES[ext]) {
    return EXTENSION_CONTENT_TYPES[ext];
  }

  return mediaType === 'r2_audio' ? 'audio/mpeg' : 'video/mp4';
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  if (req.method !== 'POST') {
    return json({ code: 'METHOD_NOT_ALLOWED', error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const payload = parseRequestBody(await readJson(req));
    const adminClient = createAdminClient();

    const { data: lecture, error: lectureError } = await adminClient
      .from('quran_course_lectures')
      .select('id, slug, title, is_published, media_type, r2_object_key, r2_content_type, course_id')
      .eq('id', payload.lectureId)
      .maybeSingle();

    if (lectureError) {
      throw lectureError;
    }

    if (!lecture) {
      throw new HttpError(404, 'Lecture not found', 'LECTURE_NOT_FOUND');
    }

    const { data: course, error: courseError } = await adminClient
      .from('quran_courses')
      .select('id, slug, name, is_free, is_published')
      .eq('id', lecture.course_id)
      .maybeSingle();

    if (courseError) {
      throw courseError;
    }

    if (!course) {
      throw new HttpError(404, 'Lecture not found', 'LECTURE_NOT_FOUND');
    }

    const user = await resolveOptionalUser(req, adminClient);
    let isAdmin = false;

    if (user) {
      const { data: adminRow, error: adminError } = await adminClient
        .from('admin_users')
        .select('id')
        .eq('id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (adminError) {
        throw adminError;
      }

      isAdmin = Boolean(adminRow);
    }

    if (!isAdmin && (!course.is_published || !lecture.is_published)) {
      throw new HttpError(404, 'Lecture not found', 'LECTURE_NOT_FOUND');
    }

    if (!course.is_free && !isAdmin) {
      if (!user) {
        throw new HttpError(401, 'Authentication required', 'AUTH_REQUIRED');
      }

      const { data: subscription, error: subscriptionError } = await adminClient
        .from('student_course_subscriptions')
        .select('id')
        .eq('course_id', course.id)
        .eq('student_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (subscriptionError) {
        throw subscriptionError;
      }

      if (!subscription) {
        throw new HttpError(403, 'Active course subscription required', 'COURSE_ACCESS_DENIED');
      }
    }

    const resolvedMediaType = lecture.media_type || (lecture.r2_object_key ? 'r2_video' : 'youtube');
    if (
      (resolvedMediaType !== 'r2_video' && resolvedMediaType !== 'r2_audio') ||
      !lecture.r2_object_key
    ) {
      throw new HttpError(404, 'Lecture media not available', 'MEDIA_NOT_AVAILABLE');
    }

    const responseContentType = resolveResponseContentType(
      lecture.r2_content_type,
      lecture.r2_object_key,
      resolvedMediaType,
    );

    const { url } = await createPresignedR2Url({
      method: 'GET',
      objectKey: lecture.r2_object_key,
      expiresIn: PLAYBACK_URL_TTL_SECONDS,
      responseContentDisposition: 'inline',
      responseContentType,
    });

    return json({
      playbackUrl: url,
      expiresIn: PLAYBACK_URL_TTL_SECONDS,
      mediaType: resolvedMediaType,
      contentType: responseContentType,
      course: {
        slug: course.slug,
        name: course.name,
      },
      lecture: {
        slug: lecture.slug,
        title: lecture.title,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
});
