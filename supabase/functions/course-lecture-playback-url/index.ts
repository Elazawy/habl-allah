import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { errorResponse, handleCors, HttpError, json, readJson } from '../_shared/http.ts';
import { createPresignedR2Url } from '../_shared/r2.ts';
import { createAdminClient } from '../_shared/supabase.ts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PLAYBACK_URL_TTL_SECONDS = 60 * 60;

type PlaybackUrlRequest = {
  lectureId: string;
};

function parseRequestBody(payload: unknown): PlaybackUrlRequest {
  if (!payload || typeof payload !== 'object') {
    throw new HttpError(400, 'Request body must be a JSON object');
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
    throw new HttpError(400, 'lecture_id must be a valid UUID');
  }

  return { lectureId };
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
    const payload = parseRequestBody(await readJson(req));
    const adminClient = createAdminClient();

    const { data: lecture, error: lectureError } = await adminClient
      .from('quran_course_lectures')
      .select('id, slug, title, r2_object_key, course_id')
      .eq('id', payload.lectureId)
      .eq('is_published', true)
      .maybeSingle();

    if (lectureError) {
      throw lectureError;
    }

    if (!lecture) {
      throw new HttpError(404, 'Lecture not found');
    }

    const { data: course, error: courseError } = await adminClient
      .from('quran_courses')
      .select('id, slug, name, is_free, is_published')
      .eq('id', lecture.course_id)
      .eq('is_published', true)
      .maybeSingle();

    if (courseError) {
      throw courseError;
    }

    if (!course || course.is_free) {
      throw new HttpError(404, 'Lecture not found');
    }

    if (!lecture.r2_object_key) {
      throw new HttpError(404, 'Lecture video not available');
    }

    const { url } = await createPresignedR2Url({
      method: 'GET',
      objectKey: lecture.r2_object_key,
      expiresIn: PLAYBACK_URL_TTL_SECONDS,
      responseContentDisposition: 'inline',
      responseContentType: 'video/mp4',
    });

    return json({
      playbackUrl: url,
      expiresIn: PLAYBACK_URL_TTL_SECONDS,
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
