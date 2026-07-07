import { supabase } from '../lib/supabase';
import { fetchCourseBySlug } from './coursesService';

const LECTURES_TABLE = import.meta.env.VITE_QURAN_COURSE_LECTURES_TABLE || 'quran_course_lectures';
const PUBLIC_LECTURES_VIEW = import.meta.env.VITE_QURAN_COURSE_PUBLIC_LECTURES_VIEW || 'published_quran_course_lectures';
const LECTURE_COMPLETIONS_TABLE =
  import.meta.env.VITE_STUDENT_COURSE_LECTURE_COMPLETIONS_TABLE || 'student_course_lecture_completions';

// Function names stay env-configurable until the backend contract is finalized.
const LECTURE_UPLOAD_FUNCTION = import.meta.env.VITE_COURSE_LECTURE_UPLOAD_FUNCTION || 'course-lecture-upload-url';
const LECTURE_PLAYBACK_FUNCTION = import.meta.env.VITE_COURSE_LECTURE_PLAYBACK_FUNCTION || 'course-lecture-playback-url';
const LECTURE_DELETE_VIDEO_FUNCTION = import.meta.env.VITE_COURSE_LECTURE_DELETE_FUNCTION || 'course-lecture-delete-asset';

function ensureSupabaseClient() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
    );
  }

  return supabase;
}

function cleanPayload(payload = {}) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );
}

async function getCurrentUserId(client = ensureSupabaseClient()) {
  const { data: { user }, error } = await client.auth.getUser();

  if (error) throw error;

  return user?.id ?? null;
}

function normalizeLectureIds(lectureIds = []) {
  return [...new Set(lectureIds.filter((lectureId) => typeof lectureId === 'string' && lectureId.trim() !== ''))];
}

function normalizeLecture(lecture) {
  if (!lecture) return lecture;

  const r2ObjectKey =
    lecture.r2_object_key ?? lecture.video_asset_key ?? lecture.video_key ?? lecture.object_key ?? '';
  const originalFileName =
    lecture.original_file_name ?? lecture.video_filename ?? lecture.file_name ?? lecture.original_filename ?? '';

  return {
    ...lecture,
    slug: lecture.slug ?? '',
    title: lecture.title ?? '',
    description: lecture.description ?? '',
    youtube_url: lecture.youtube_url ?? lecture.video_url ?? '',
    r2_object_key: r2ObjectKey,
    original_file_name: originalFileName,
    sort_order: lecture.sort_order ?? 0,
    is_published: lecture.is_published ?? false,
    // Keep the legacy aliases while the rest of the feature settles on the DB names.
    video_asset_key: r2ObjectKey,
    video_filename: originalFileName,
    video_status: lecture.video_status ?? '',
  };
}

function normalizeLecturePayload(payload = {}) {
  const next = { ...payload };

  if (next.r2_object_key === undefined && next.video_asset_key !== undefined) {
    next.r2_object_key = next.video_asset_key;
  }

  if (next.original_file_name === undefined && next.video_filename !== undefined) {
    next.original_file_name = next.video_filename;
  }

  delete next.video_asset_key;
  delete next.video_filename;
  delete next.video_status;

  return cleanPayload(next);
}

async function getFunctionErrorMessage(error, featureLabel) {
  const response = error?.context;

  if (response && typeof response.clone === 'function') {
    try {
      const responseBody = await response.clone().json();
      const responseMessage =
        typeof responseBody?.error === 'string'
          ? responseBody.error.trim()
          : typeof responseBody?.message === 'string'
            ? responseBody.message.trim()
            : '';

      if (responseMessage) {
        return responseMessage;
      }
    } catch {
      try {
        const responseText = (await response.clone().text()).trim();
        if (responseText) {
          return responseText;
        }
      } catch {
        // Ignore response parsing errors and fall back to the client error message.
      }
    }
  }

  const message = error?.message ?? '';

  if (
    /Edge Function|FunctionsFetchError|Failed to send a request to the Edge Function|non-2xx/i.test(message)
  ) {
    return `خدمة ${featureLabel} غير مفعلة في الخلفية بعد. اربط الدالة المخصصة لها ثم أعد المحاولة.`;
  }

  return message || `تعذر ${featureLabel} حالياً.`;
}

function getVideoAssetKey(record) {
  return record?.r2_object_key ?? record?.video_asset_key ?? record?.video_key ?? record?.object_key ?? '';
}

function getUploadUrlHost(uploadUrl) {
  try {
    return new URL(uploadUrl).host;
  } catch {
    return '';
  }
}

function readXmlErrorTag(body = '', tagName) {
  const match = body.match(new RegExp(`<${tagName}>([^<]+)</${tagName}>`, 'i'));
  return match?.[1]?.trim() ?? '';
}

function getStorageUploadErrorMessage({ uploadUrl, status = 0, responseText = '', transportError = false }) {
  const storageHost = getUploadUrlHost(uploadUrl);
  const errorCode = readXmlErrorTag(responseText, 'Code');
  const errorDetail = readXmlErrorTag(responseText, 'Message');

  if (transportError || status === 0) {
    if (/\.r2\.cloudflarestorage\.com$/i.test(storageHost)) {
      return 'تعذر رفع ملف الفيديو إلى خدمة التخزين. يبدو أن إعدادات CORS في Cloudflare R2 لا تسمح بطلبات PUT من هذا النطاق بعد. أضف Origin الموقع الحالي مع PUT و Content-Type إلى CORS policy الخاصة بالـ bucket ثم أعد المحاولة.';
    }

    return 'تعذر رفع ملف الفيديو إلى خدمة التخزين بسبب خطأ في الاتصال.';
  }

  if (errorCode === 'SignatureDoesNotMatch') {
    return 'تعذر رفع ملف الفيديو إلى خدمة التخزين لأن رابط الرفع الموقّت أو الرؤوس المطلوبة لا تطابق التوقيع المتوقع.';
  }

  if (errorCode === 'AccessDenied') {
    return 'تعذر رفع ملف الفيديو إلى خدمة التخزين بسبب رفض الوصول من خدمة التخزين.';
  }

  if (errorCode || errorDetail) {
    const details = [errorCode, errorDetail].filter(Boolean).join(': ');
    return `تعذر رفع ملف الفيديو إلى خدمة التخزين (${details}).`;
  }

  return `تعذر رفع ملف الفيديو إلى خدمة التخزين (HTTP ${status}).`;
}

async function uploadFileToSignedUrl({
  uploadUrl,
  file,
  method = 'PUT',
  headers = {},
  fields = null,
  onProgress,
}) {
  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const upperMethod = method.toUpperCase();

    xhr.open(upperMethod, uploadUrl, true);

    Object.entries(headers ?? {}).forEach(([key, value]) => {
      if (upperMethod === 'POST' && fields && key.toLowerCase() === 'content-type') {
        return;
      }

      xhr.setRequestHeader(key, value);
    });

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return;

      const progress = Math.min(99, Math.round((event.loaded / event.total) * 100));
      onProgress(progress);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }

      reject(
        new Error(
          getStorageUploadErrorMessage({
            uploadUrl,
            status: xhr.status,
            responseText: xhr.responseText,
          })
        )
      );
    };

    xhr.onerror = () => {
      reject(
        new Error(
          getStorageUploadErrorMessage({
            uploadUrl,
            transportError: true,
          })
        )
      );
    };

    xhr.onabort = () => {
      reject(new Error('تم إلغاء رفع ملف الفيديو قبل اكتماله.'));
    };

    if (upperMethod === 'POST' && fields) {
      const formData = new FormData();

      Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, value);
      });

      formData.append('file', file);
      xhr.send(formData);
      return;
    }

    xhr.send(file);
  });
}

export function sortCourseLectures(items = []) {
  return [...items].sort((a, b) => {
    const aSort = a?.sort_order ?? 0;
    const bSort = b?.sort_order ?? 0;

    if (aSort !== bSort) return aSort - bSort;

    return new Date(a?.created_at ?? 0).getTime() - new Date(b?.created_at ?? 0).getTime();
  });
}

export function hasLectureUploadedVideo(lecture) {
  return Boolean(getVideoAssetKey(lecture) || lecture?.original_file_name || lecture?.video_filename);
}

export async function fetchCourseLectureStats(courseId) {
  const client = ensureSupabaseClient();

  const { count, error } = await client
    .from(LECTURES_TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('course_id', courseId);

  if (error) throw error;

  return { total: count ?? 0 };
}

export async function fetchCourseLecturesAdmin(courseId) {
  const client = ensureSupabaseClient();

  const { data, error } = await client
    .from(LECTURES_TABLE)
    .select('*')
    .eq('course_id', courseId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;

  return sortCourseLectures((data ?? []).map(normalizeLecture));
}

export async function fetchPublishedCourseLectures(courseId) {
  const client = ensureSupabaseClient();

  const { data, error } = await client
    .from(PUBLIC_LECTURES_VIEW)
    .select('*')
    .eq('course_id', courseId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;

  return sortCourseLectures((data ?? []).map(normalizeLecture));
}

export async function fetchCourseWatchPageBySlug(slug) {
  const course = await fetchCourseBySlug(slug);
  if (!course) {
    return { course: null, lectures: [] };
  }

  const lectures = await fetchPublishedCourseLectures(course.id);
  return { course, lectures };
}

export async function fetchMyCompletedCourseLectureIds(lectureIds = []) {
  const client = ensureSupabaseClient();
  const userId = await getCurrentUserId(client);
  const normalizedLectureIds = normalizeLectureIds(lectureIds);

  if (!userId || normalizedLectureIds.length === 0) {
    return [];
  }

  const { data, error } = await client
    .from(LECTURE_COMPLETIONS_TABLE)
    .select('lecture_id')
    .eq('student_id', userId)
    .in('lecture_id', normalizedLectureIds);

  if (error) throw error;

  return normalizeLectureIds((data ?? []).map((record) => record.lecture_id));
}

export async function syncMyCompletedCourseLectures(lectureIds = []) {
  const client = ensureSupabaseClient();
  const userId = await getCurrentUserId(client);
  const normalizedLectureIds = normalizeLectureIds(lectureIds);

  if (!userId || normalizedLectureIds.length === 0) {
    return;
  }

  const completedAt = new Date().toISOString();
  const { error } = await client
    .from(LECTURE_COMPLETIONS_TABLE)
    .upsert(
      normalizedLectureIds.map((lectureId) => ({
        student_id: userId,
        lecture_id: lectureId,
        completed_at: completedAt,
      })),
      { onConflict: 'student_id,lecture_id' }
    );

  if (error) throw error;
}

export async function markCourseLectureCompleted(lectureId) {
  return syncMyCompletedCourseLectures([lectureId]);
}

export async function markCourseLectureIncomplete(lectureId) {
  const client = ensureSupabaseClient();
  const userId = await getCurrentUserId(client);

  if (!userId || typeof lectureId !== 'string' || lectureId.trim() === '') {
    return;
  }

  const { error } = await client
    .from(LECTURE_COMPLETIONS_TABLE)
    .delete()
    .eq('student_id', userId)
    .eq('lecture_id', lectureId);

  if (error) throw error;
}

export async function isCourseLectureSlugTaken(courseId, slug, { excludeLectureId } = {}) {
  const client = ensureSupabaseClient();
  const normalizedSlug = typeof slug === 'string' ? slug.trim().toLowerCase() : '';

  if (!courseId || !normalizedSlug) {
    return false;
  }

  let query = client
    .from(LECTURES_TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('course_id', courseId)
    .eq('slug', normalizedSlug);

  if (excludeLectureId) {
    query = query.neq('id', excludeLectureId);
  }

  const { count, error } = await query;

  if (error) throw error;

  return (count ?? 0) > 0;
}

export async function createCourseLecture(payload) {
  const client = ensureSupabaseClient();

  const { data, error } = await client
    .from(LECTURES_TABLE)
    .insert([normalizeLecturePayload(payload)])
    .select('*')
    .single();

  if (error) throw error;

  return normalizeLecture(data);
}

export async function updateCourseLecture(id, payload) {
  const client = ensureSupabaseClient();

  const { data, error } = await client
    .from(LECTURES_TABLE)
    .update({
      ...normalizeLecturePayload(payload),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;

  return normalizeLecture(data);
}

export async function deleteCourseLecture(id) {
  const client = ensureSupabaseClient();

  const { data, error } = await client
    .from(LECTURES_TABLE)
    .delete()
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;

  return normalizeLecture(data);
}

export async function uploadCourseLectureVideo({ courseId, lectureId, lectureSlug, file, onProgress }) {
  const client = ensureSupabaseClient();

  if (!file) {
    throw new Error('يرجى اختيار ملف الفيديو أولاً.');
  }

  const isMp4 = file.type === 'video/mp4' || file.name.toLowerCase().endsWith('.mp4');
  if (!isMp4) {
    throw new Error('صيغة الفيديو المعتمدة حالياً هي MP4 فقط.');
  }

  const { data, error } = await client.functions.invoke(LECTURE_UPLOAD_FUNCTION, {
    body: cleanPayload({
      courseId,
      lectureId: lectureId ?? undefined,
      lectureSlug: lectureSlug ?? undefined,
      fileName: file.name,
      contentType: file.type || 'video/mp4',
      fileSize: file.size,
    }),
  });

  if (error) {
    throw new Error(await getFunctionErrorMessage(error, 'رفع الفيديو'));
  }

  const uploadUrl = data?.uploadUrl ?? data?.signedUrl ?? data?.url;
  if (!uploadUrl) {
    throw new Error('خدمة رفع الفيديو لم تُرجِع رابط رفع صالحاً.');
  }

  await uploadFileToSignedUrl({
    uploadUrl,
    file,
    method: data?.method ?? 'PUT',
    headers: data?.headers ?? data?.requiredHeaders,
    fields: data?.fields,
    onProgress,
  });

  const resolvedObjectKey = data?.r2_object_key ?? data?.objectKey ?? data?.key;
  const resolvedOriginalFileName = data?.original_file_name ?? data?.originalFileName ?? data?.fileName;
  const lecturePayload = normalizeLecturePayload({
    ...(data?.lecturePatch ?? data?.lecturePayload ?? data?.lecture_patch ?? data?.dbPayload ?? {}),
    ...(resolvedObjectKey ? { r2_object_key: resolvedObjectKey } : {}),
    ...(resolvedOriginalFileName ? { original_file_name: resolvedOriginalFileName } : {}),
  });

  if (!lecturePayload.r2_object_key) {
    throw new Error('خدمة رفع الفيديو لم تُرجِع بيانات الفيديو المطلوبة للحفظ.');
  }

  // Return only the upload patch so callers can merge it into form payloads
  // without wiping fields like slug/title with normalizeLecture defaults.
  return normalizeLecturePayload({
    ...lecturePayload,
    original_file_name: lecturePayload.original_file_name ?? file.name,
  });
}

export async function requestCourseLecturePlaybackUrl(lectureId) {
  const client = ensureSupabaseClient();

  const { data, error } = await client.functions.invoke(LECTURE_PLAYBACK_FUNCTION, {
    body: { lectureId },
  });

  if (error) {
    throw new Error(await getFunctionErrorMessage(error, 'تشغيل الفيديو'));
  }

  const url = data?.playbackUrl ?? data?.signedUrl ?? data?.url;
  if (!url) {
    throw new Error('خدمة تشغيل الفيديو لم تُرجِع رابط مشاهدة صالحاً.');
  }

  return {
    url,
    expiresAt:
      data?.expiresAt ??
      data?.expires_at ??
      (Number.isFinite(Number(data?.expiresIn ?? data?.expires_in))
        ? new Date(Date.now() + Number(data?.expiresIn ?? data?.expires_in) * 1000).toISOString()
        : null),
  };
}

export async function maybeDeleteCourseLectureVideoAsset(record) {
  const assetKey = getVideoAssetKey(record);
  if (!LECTURE_DELETE_VIDEO_FUNCTION || !assetKey) {
    return;
  }

  const client = ensureSupabaseClient();
  const { error } = await client.functions.invoke(LECTURE_DELETE_VIDEO_FUNCTION, {
    body: {
      lectureId: record?.id,
      assetKey,
    },
  });

  if (error) {
    throw new Error(await getFunctionErrorMessage(error, 'حذف ملف الفيديو'));
  }
}

export async function deleteCourseLectureVideoAssets(records = [], { coursePrefix } = {}) {
  if (!LECTURE_DELETE_VIDEO_FUNCTION) {
    return;
  }

  const assetKeys = [...new Set(records.map((record) => getVideoAssetKey(record)).filter(Boolean))];
  if (!assetKeys.length && !coursePrefix) {
    return;
  }

  const client = ensureSupabaseClient();
  const { error } = await client.functions.invoke(LECTURE_DELETE_VIDEO_FUNCTION, {
    body: cleanPayload({
      assetKeys: assetKeys.length ? assetKeys : undefined,
      coursePrefix,
    }),
  });

  if (error) {
    throw new Error(await getFunctionErrorMessage(error, 'حذف ملفات الفيديو'));
  }
}
