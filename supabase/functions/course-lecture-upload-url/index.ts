import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { errorResponse, handleCors, HttpError, json, readJson } from '../_shared/http.ts';
import { buildPaidLectureObjectKey, createPresignedR2Url } from '../_shared/r2.ts';
import { createAdminClient, requireAdminUser } from '../_shared/supabase.ts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 * 1024;
const UPLOAD_URL_TTL_SECONDS = 10 * 60;

type UploadUrlRequest = {
  courseId: string;
  lectureId: string | null;
  fileName: string;
  contentType: string;
  fileSize: number;
};

function parseRequestBody(payload: unknown): UploadUrlRequest {
  if (!payload || typeof payload !== 'object') {
    throw new HttpError(400, 'Request body must be a JSON object');
  }

  const record = payload as Record<string, unknown>;
  const courseId = typeof record.courseId === 'string' ? record.courseId.trim() : '';
  const lectureId = typeof record.lectureId === 'string' ? record.lectureId.trim() : '';
  const fileName = typeof record.fileName === 'string' ? record.fileName.trim() : '';
  const contentType = typeof record.contentType === 'string' ? record.contentType.trim().toLowerCase() : '';
  const fileSize = Number(record.fileSize);

  if (!UUID_RE.test(courseId)) {
    throw new HttpError(400, 'courseId must be a valid UUID');
  }

  if (lectureId && !UUID_RE.test(lectureId)) {
    throw new HttpError(400, 'lectureId must be a valid UUID when provided');
  }

  if (!fileName || !fileName.toLowerCase().endsWith('.mp4')) {
    throw new HttpError(400, 'Only .mp4 uploads are supported');
  }

  if (contentType !== 'video/mp4') {
    throw new HttpError(400, 'Only video/mp4 uploads are supported');
  }

  if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > MAX_UPLOAD_BYTES) {
    throw new HttpError(400, `fileSize must be between 1 byte and ${MAX_UPLOAD_BYTES} bytes`);
  }

  return {
    courseId,
    lectureId: lectureId || null,
    fileName,
    contentType,
    fileSize,
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

    const { data: course, error: courseError } = await adminClient
      .from('quran_courses')
      .select('id, slug, is_free')
      .eq('id', payload.courseId)
      .maybeSingle();

    if (courseError) {
      throw courseError;
    }

    if (!course) {
      throw new HttpError(404, 'Course not found');
    }

    if (course.is_free) {
      throw new HttpError(400, 'Upload URLs are only available for paid courses');
    }

    if (payload.lectureId) {
      const { data: lecture, error: lectureError } = await adminClient
        .from('quran_course_lectures')
        .select('id, course_id, slug')
        .eq('id', payload.lectureId)
        .maybeSingle();

      if (lectureError) {
        throw lectureError;
      }

      if (!lecture || lecture.course_id !== payload.courseId) {
        throw new HttpError(404, 'Lecture not found for this course');
      }
    }

    const objectKey = buildPaidLectureObjectKey(payload.courseId);
    const { url, requiredHeaders } = await createPresignedR2Url({
      method: 'PUT',
      objectKey,
      expiresIn: UPLOAD_URL_TTL_SECONDS,
      contentType: payload.contentType,
    });

    return json({
      uploadUrl: url,
      headers: requiredHeaders,
      requiredHeaders,
      method: 'PUT',
      expiresIn: UPLOAD_URL_TTL_SECONDS,
      lecturePatch: {
        r2_object_key: objectKey,
        original_file_name: payload.fileName,
      },
      r2_object_key: objectKey,
      original_file_name: payload.fileName,
      objectKey,
      originalFileName: payload.fileName,
    });
  } catch (error) {
    return errorResponse(error);
  }
});
