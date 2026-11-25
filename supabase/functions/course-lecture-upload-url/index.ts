import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { errorResponse, handleCors, HttpError, json, readJson } from '../_shared/http.ts';
import {
  buildLectureObjectKey,
  createPresignedR2Url,
  getR2BucketUsage,
  R2_STORAGE_QUOTA_BYTES,
  R2_UPLOAD_BLOCK_THRESHOLD_BYTES,
} from '../_shared/r2.ts';
import { createAdminClient, requireAdminUser } from '../_shared/supabase.ts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 * 1024;
const UPLOAD_URL_TTL_SECONDS = 10 * 60;
const DUPLICATE_LECTURE_SLUG_ERROR = 'Lecture slug already exists for this course';
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type R2MediaType = 'r2_video' | 'r2_audio';

type FormatSpec = {
  canonicalContentType: string;
  acceptedMimeTypes: string[];
};

const VIDEO_FORMATS: Record<string, FormatSpec> = {
  mp4: {
    canonicalContentType: 'video/mp4',
    acceptedMimeTypes: ['video/mp4'],
  },
};

const AUDIO_FORMATS: Record<string, FormatSpec> = {
  mp3: {
    canonicalContentType: 'audio/mpeg',
    acceptedMimeTypes: ['audio/mpeg', 'audio/mp3'],
  },
  m4a: {
    canonicalContentType: 'audio/mp4',
    acceptedMimeTypes: ['audio/mp4', 'audio/x-m4a', 'audio/m4a'],
  },
  aac: {
    canonicalContentType: 'audio/aac',
    acceptedMimeTypes: ['audio/aac', 'audio/x-aac'],
  },
  wav: {
    canonicalContentType: 'audio/wav',
    acceptedMimeTypes: ['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave'],
  },
  ogg: {
    canonicalContentType: 'audio/ogg',
    acceptedMimeTypes: ['audio/ogg', 'application/ogg'],
  },
  webm: {
    canonicalContentType: 'audio/webm',
    acceptedMimeTypes: ['audio/webm'],
  },
};

type UploadUrlRequest = {
  courseId: string;
  lectureId: string | null;
  lectureSlug: string | null;
  mediaType: R2MediaType;
  fileName: string;
  fileExt: string;
  canonicalContentType: string;
  fileSize: number;
};

function getFileExtension(fileName: string): string {
  const parts = fileName.trim().toLowerCase().split('.');
  return parts.length > 1 ? (parts.pop() ?? '') : '';
}

function normalizeMimeType(rawContentType: string): string {
  return rawContentType.trim().toLowerCase().split(';')[0]?.trim() ?? '';
}

function inferMediaType(rawMediaType: unknown, fileExt: string, mimeType: string): R2MediaType {
  if (typeof rawMediaType === 'string' && rawMediaType.trim()) {
    const normalized = rawMediaType.trim().toLowerCase();
    if (normalized === 'r2_video' || normalized === 'r2_audio') {
      return normalized;
    }
    throw new HttpError(400, 'mediaType must be r2_video or r2_audio', 'UNSUPPORTED_MEDIA_FORMAT');
  }

  if (fileExt in AUDIO_FORMATS || mimeType.startsWith('audio/')) {
    return 'r2_audio';
  }

  return 'r2_video';
}

function parseRequestBody(payload: unknown): UploadUrlRequest {
  if (!payload || typeof payload !== 'object') {
    throw new HttpError(400, 'Request body must be a JSON object', 'INVALID_REQUEST_BODY');
  }

  const record = payload as Record<string, unknown>;
  const courseId = typeof record.courseId === 'string' ? record.courseId.trim() : '';
  const lectureId = typeof record.lectureId === 'string' ? record.lectureId.trim() : '';
  const lectureSlug = typeof record.lectureSlug === 'string'
    ? record.lectureSlug.trim().toLowerCase()
    : typeof record.lecture_slug === 'string'
      ? record.lecture_slug.trim().toLowerCase()
      : '';
  const fileName = typeof record.fileName === 'string' ? record.fileName.trim() : '';
  const rawContentType = typeof record.contentType === 'string' ? record.contentType : '';
  const mimeType = normalizeMimeType(rawContentType);
  const fileSize = Number(record.fileSize);

  if (!UUID_RE.test(courseId)) {
    throw new HttpError(400, 'courseId must be a valid UUID', 'INVALID_REQUEST_BODY');
  }

  if (lectureId && !UUID_RE.test(lectureId)) {
    throw new HttpError(400, 'lectureId must be a valid UUID when provided', 'INVALID_REQUEST_BODY');
  }

  if (lectureSlug && !SLUG_RE.test(lectureSlug)) {
    throw new HttpError(400, 'lectureSlug must contain lowercase letters, numbers, and hyphens only', 'INVALID_REQUEST_BODY');
  }

  if (!fileName) {
    throw new HttpError(400, 'fileName is required', 'UNSUPPORTED_MEDIA_FORMAT');
  }

  const fileExt = getFileExtension(fileName);
  const mediaType = inferMediaType(record.mediaType ?? record.media_type, fileExt, mimeType);
  const allowedFormats = mediaType === 'r2_audio' ? AUDIO_FORMATS : VIDEO_FORMATS;
  const formatSpec = allowedFormats[fileExt];

  if (!formatSpec) {
    const supported = Object.keys(allowedFormats).map((ext) => `.${ext}`).join(', ');
    throw new HttpError(
      400,
      `Unsupported file format for ${mediaType}. Supported extensions: ${supported}`,
      'UNSUPPORTED_MEDIA_FORMAT',
    );
  }

  if (mimeType && !formatSpec.acceptedMimeTypes.includes(mimeType)) {
    throw new HttpError(
      400,
      `Unsupported contentType "${mimeType}" for .${fileExt} upload`,
      'UNSUPPORTED_MEDIA_FORMAT',
    );
  }

  if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > MAX_UPLOAD_BYTES) {
    throw new HttpError(400, `fileSize must be between 1 byte and ${MAX_UPLOAD_BYTES} bytes`, 'INVALID_REQUEST_BODY');
  }

  return {
    courseId,
    lectureId: lectureId || null,
    lectureSlug: lectureSlug || null,
    mediaType,
    fileName,
    fileExt,
    canonicalContentType: formatSpec.canonicalContentType,
    fileSize,
  };
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

    let resolvedLectureSlug = payload.lectureSlug;

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

      resolvedLectureSlug = payload.lectureSlug ?? lecture.slug;
    }

    if (!resolvedLectureSlug) {
      throw new HttpError(400, 'lectureSlug is required before uploading a lecture media file');
    }

    const { data: conflictingLecture, error: conflictingLectureError } = await adminClient
      .from('quran_course_lectures')
      .select('id')
      .eq('course_id', payload.courseId)
      .eq('slug', resolvedLectureSlug)
      .maybeSingle();

    if (conflictingLectureError) {
      throw conflictingLectureError;
    }

    if (conflictingLecture && conflictingLecture.id !== payload.lectureId) {
      throw new HttpError(409, DUPLICATE_LECTURE_SLUG_ERROR);
    }

    const usage = await getR2BucketUsage();
    if (usage.usedBytes >= R2_UPLOAD_BLOCK_THRESHOLD_BYTES) {
      throw new HttpError(
        403,
        'R2 storage has reached the 9.0 GB upload limit. Delete unused files before uploading.',
        'R2_STORAGE_LIMIT_REACHED',
      );
    }

    if (usage.usedBytes + payload.fileSize > R2_STORAGE_QUOTA_BYTES) {
      throw new HttpError(
        413,
        'Uploading this file would exceed the 9.5 GB R2 storage allowance.',
        'R2_STORAGE_QUOTA_EXCEEDED',
      );
    }

    // Keep each upload on its own object key so a failed save cannot overwrite another lecture asset.
    const objectKey = buildLectureObjectKey(
      course.slug,
      resolvedLectureSlug,
      `source-${crypto.randomUUID()}.${payload.fileExt}`,
    );
    const { url, requiredHeaders } = await createPresignedR2Url({
      method: 'PUT',
      objectKey,
      expiresIn: UPLOAD_URL_TTL_SECONDS,
      contentType: payload.canonicalContentType,
    });

    return json({
      uploadUrl: url,
      headers: requiredHeaders,
      requiredHeaders,
      method: 'PUT',
      expiresIn: UPLOAD_URL_TTL_SECONDS,
      lecturePatch: {
        media_type: payload.mediaType,
        r2_object_key: objectKey,
        original_file_name: payload.fileName,
        r2_content_type: payload.canonicalContentType,
        youtube_url: null,
      },
      media_type: payload.mediaType,
      r2_object_key: objectKey,
      original_file_name: payload.fileName,
      r2_content_type: payload.canonicalContentType,
      objectKey,
      originalFileName: payload.fileName,
      usage,
    });
  } catch (error) {
    return errorResponse(error);
  }
});
