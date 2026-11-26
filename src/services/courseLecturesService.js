import i18n from '../i18n';
import { supabase } from '../lib/supabase';
import { fetchCourseBySlug } from './coursesService';
import {
  ACCEPTED_AUDIO_EXTENSIONS,
  ACCEPTED_VIDEO_EXTENSIONS,
  LECTURE_MEDIA_TYPES,
  R2_STORAGE_QUOTA_BYTES,
  R2_UPLOAD_BLOCK_THRESHOLD_BYTES,
  formatBytesDecimalGb,
  inferLectureMediaType,
  isLectureR2Media,
  isValidHttpUrl,
  validateLectureMediaFile,
} from '../lib/courseLecturesUtils';

export {
  ACCEPTED_AUDIO_EXTENSIONS,
  ACCEPTED_VIDEO_EXTENSIONS,
  LECTURE_MEDIA_TYPES,
  R2_STORAGE_QUOTA_BYTES,
  R2_UPLOAD_BLOCK_THRESHOLD_BYTES,
  formatBytesDecimalGb,
  inferLectureMediaType,
  isLectureR2Media,
  isValidHttpUrl,
  validateLectureMediaFile,
};

const LECTURES_TABLE = import.meta.env.VITE_QURAN_COURSE_LECTURES_TABLE || 'quran_course_lectures';
const LECTURE_COMPLETIONS_TABLE =
  import.meta.env.VITE_STUDENT_COURSE_LECTURE_COMPLETIONS_TABLE || 'student_course_lecture_completions';
const COURSE_SUBSCRIPTIONS_TABLE = 'student_course_subscriptions';

// Function names stay env-configurable until the backend contract is finalized.
const LECTURE_UPLOAD_FUNCTION = import.meta.env.VITE_COURSE_LECTURE_UPLOAD_FUNCTION || 'course-lecture-upload-url';
const LECTURE_PLAYBACK_FUNCTION = import.meta.env.VITE_COURSE_LECTURE_PLAYBACK_FUNCTION || 'course-lecture-playback-url';
const LECTURE_DELETE_VIDEO_FUNCTION = import.meta.env.VITE_COURSE_LECTURE_DELETE_FUNCTION || 'course-lecture-delete-asset';
const R2_STORAGE_USAGE_FUNCTION = import.meta.env.VITE_R2_STORAGE_USAGE_FUNCTION || 'r2-storage-usage';

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

function normalizeOptionalText(value) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') return value ?? null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function normalizeLecture(lecture) {
  if (!lecture) return lecture;

  const r2ObjectKey =
    lecture.r2_object_key ?? lecture.video_asset_key ?? lecture.video_key ?? lecture.object_key ?? '';
  const originalFileName =
    lecture.original_file_name ?? lecture.video_filename ?? lecture.file_name ?? lecture.original_filename ?? '';
  const mediaType = inferLectureMediaType(lecture);

  return {
    ...lecture,
    slug: lecture.slug ?? '',
    title: lecture.title ?? '',
    title_en: lecture.title_en ?? '',
    title_tr: lecture.title_tr ?? '',
    description: lecture.description ?? '',
    description_en: lecture.description_en ?? '',
    description_tr: lecture.description_tr ?? '',
    media_type: mediaType,
    youtube_url: lecture.youtube_url ?? lecture.video_url ?? '',
    r2_object_key: r2ObjectKey,
    r2_content_type: lecture.r2_content_type ?? '',
    original_file_name: originalFileName,
    has_r2_asset: Boolean(lecture.has_r2_asset || r2ObjectKey),
    test_url: lecture.test_url ?? '',
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

  for (const field of [
    'title_en',
    'title_tr',
    'description_en',
    'description_tr',
    'test_url',
    'youtube_url',
    'r2_object_key',
    'r2_content_type',
    'original_file_name',
  ]) {
    if (field in payload) {
      next[field] = normalizeOptionalText(payload[field]);
    }
  }

  if (next.r2_object_key === undefined && next.video_asset_key !== undefined) {
    next.r2_object_key = normalizeOptionalText(next.video_asset_key);
  }

  if (next.original_file_name === undefined && next.video_filename !== undefined) {
    next.original_file_name = normalizeOptionalText(next.video_filename);
  }

  delete next.video_asset_key;
  delete next.video_filename;
  delete next.video_status;
  delete next.has_r2_asset;

  return cleanPayload(next);
}

async function getFunctionErrorMessage(error, featureLabel) {
  const response = error?.context;
  const status = typeof response?.status === 'number' ? response.status : null;
  let code = null;
  let message = '';

  if (response && typeof response.clone === 'function') {
    try {
      const responseBody = await response.clone().json();
      if (typeof responseBody?.code === 'string' && responseBody.code.trim()) {
        code = responseBody.code.trim();
      }
      const responseMessage =
        typeof responseBody?.error === 'string'
          ? responseBody.error.trim()
          : typeof responseBody?.message === 'string'
            ? responseBody.message.trim()
            : '';

      if (responseMessage) {
        message = responseMessage;
      }
    } catch {
      try {
        const responseText = (await response.clone().text()).trim();
        if (responseText) {
          message = responseText;
        }
      } catch {
        // Ignore response parsing errors and fall back to the client error message.
      }
    }
  }

  if (code && i18n.exists(`errors:edge.${code}`)) {
    message = i18n.t(`errors:edge.${code}`);
  }

  if (!message) {
    const rawMessage = error?.message ?? '';

    if (
      /Edge Function|FunctionsFetchError|Failed to send a request to the Edge Function|non-2xx/i.test(rawMessage)
    ) {
      message = i18n.t('errors:courseLectures.serviceNotEnabled', { feature: featureLabel });
    } else {
      message = rawMessage || i18n.t('errors:courseLectures.actionFailed', { feature: featureLabel });
    }
  }

  const err = new Error(message);
  if (code) err.code = code;
  if (status !== null) err.status = status;
  return err;
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
      return i18n.t('errors:courseLectures.storageCorsError');
    }

    return i18n.t('errors:courseLectures.storageConnectionError');
  }

  if (errorCode === 'SignatureDoesNotMatch') {
    return i18n.t('errors:courseLectures.storageSignatureMismatch');
  }

  if (errorCode === 'AccessDenied') {
    return i18n.t('errors:courseLectures.storageAccessDenied');
  }

  if (errorCode || errorDetail) {
    const details = [errorCode, errorDetail].filter(Boolean).join(': ');
    return i18n.t('errors:courseLectures.storageWithDetails', { details });
  }

  return i18n.t('errors:courseLectures.storageHttpStatus', { status });
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
      reject(new Error(i18n.t('errors:courseLectures.uploadAborted')));
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
  return Boolean(
    lecture?.has_r2_asset ||
    getVideoAssetKey(lecture) ||
    lecture?.original_file_name ||
    lecture?.video_filename
  );
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

  const { data, error } = await client.rpc('get_published_course_lectures', {
    p_course_id: courseId,
  });

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

export async function fetchStudentCourseProgressAdmin(studentId) {
  if (!studentId) return {};

  const client = ensureSupabaseClient();
  const [lecturesResult, completionsResult] = await Promise.all([
    client
      .from(LECTURES_TABLE)
      .select('id, course_id')
      .eq('is_published', true),
    client
      .from(LECTURE_COMPLETIONS_TABLE)
      .select('lecture_id, completed_at')
      .eq('student_id', studentId),
  ]);

  if (lecturesResult.error) throw lecturesResult.error;
  if (completionsResult.error) throw completionsResult.error;

  const publishedCountByCourse = new Map();
  const lectureCourseMap = new Map();

  for (const lecture of lecturesResult.data ?? []) {
    if (!lecture?.id || !lecture?.course_id) continue;
    lectureCourseMap.set(lecture.id, lecture.course_id);
    publishedCountByCourse.set(
      lecture.course_id,
      (publishedCountByCourse.get(lecture.course_id) ?? 0) + 1
    );
  }

  const completedStatsByCourse = new Map();
  for (const row of completionsResult.data ?? []) {
    const courseId = lectureCourseMap.get(row.lecture_id);
    if (!courseId) continue;

    const current = completedStatsByCourse.get(courseId) ?? {
      lectureIds: new Set(),
      lastCompletedAt: null,
    };

    current.lectureIds.add(row.lecture_id);
    if (
      row.completed_at &&
      (!current.lastCompletedAt || new Date(row.completed_at) > new Date(current.lastCompletedAt))
    ) {
      current.lastCompletedAt = row.completed_at;
    }

    completedStatsByCourse.set(courseId, current);
  }

  const progressMap = {};
  const allCourseIds = new Set([
    ...publishedCountByCourse.keys(),
    ...completedStatsByCourse.keys(),
  ]);

  for (const courseId of allCourseIds) {
    const totalPublished = publishedCountByCourse.get(courseId) ?? 0;
    const completedStats = completedStatsByCourse.get(courseId);
    const completedCount = completedStats ? completedStats.lectureIds.size : 0;
    const percent = totalPublished > 0
      ? Math.round((completedCount / totalPublished) * 100)
      : 0;

    progressMap[courseId] = {
      completedCount,
      totalPublished,
      percent,
      lastCompletedAt: completedStats?.lastCompletedAt ?? null,
    };
  }

  return progressMap;
}

export async function fetchCourseStudentsProgressAdmin(courseId) {
  const client = ensureSupabaseClient();

  const [lecturesResult, subscriptionsResult] = await Promise.all([
    client
      .from(LECTURES_TABLE)
      .select('id, slug, title, sort_order, media_type, created_at')
      .eq('course_id', courseId)
      .eq('is_published', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    client
      .from(COURSE_SUBSCRIPTIONS_TABLE)
      .select('student_id, subscribed_at, is_active, student_profiles(id, full_name, phone, country, gender, teachers(id, name))')
      .eq('course_id', courseId)
      .eq('is_active', true),
  ]);

  if (lecturesResult.error) throw lecturesResult.error;
  if (subscriptionsResult.error) throw subscriptionsResult.error;

  const lectures = sortCourseLectures((lecturesResult.data ?? []).map(normalizeLecture));
  const lectureIds = lectures.map((lecture) => lecture.id);

  let completionRows = [];
  if (lectureIds.length > 0) {
    const { data, error } = await client
      .from(LECTURE_COMPLETIONS_TABLE)
      .select('student_id, lecture_id, completed_at, student_profiles(id, full_name, phone, country, gender, teachers(id, name))')
      .in('lecture_id', lectureIds);

    if (error) throw error;
    completionRows = data ?? [];
  }

  const byStudent = new Map();

  for (const sub of subscriptionsResult.data ?? []) {
    if (!sub?.student_id) continue;
    const profile = sub.student_profiles ?? { id: sub.student_id, full_name: '', phone: '' };
    byStudent.set(sub.student_id, {
      student: profile,
      isSubscribed: true,
      subscribedAt: sub.subscribed_at ?? null,
      completedLectureIds: new Set(),
      completedByLectureId: {},
      lastCompletedAt: null,
    });
  }

  for (const row of completionRows) {
    if (!row?.student_id || !row?.lecture_id) continue;

    let entry = byStudent.get(row.student_id);
    if (!entry) {
      const profile = row.student_profiles ?? { id: row.student_id, full_name: '', phone: '' };
      entry = {
        student: profile,
        isSubscribed: false,
        subscribedAt: null,
        completedLectureIds: new Set(),
        completedByLectureId: {},
        lastCompletedAt: null,
      };
      byStudent.set(row.student_id, entry);
    }

    entry.completedLectureIds.add(row.lecture_id);
    entry.completedByLectureId[row.lecture_id] = row.completed_at ?? null;

    if (
      row.completed_at &&
      (!entry.lastCompletedAt || new Date(row.completed_at) > new Date(entry.lastCompletedAt))
    ) {
      entry.lastCompletedAt = row.completed_at;
    }
  }

  const totalPublished = lectures.length;
  const students = Array.from(byStudent.values())
    .map((entry) => {
      const completedCount = entry.completedLectureIds.size;
      const percent = totalPublished > 0
        ? Math.round((completedCount / totalPublished) * 100)
        : 0;
      const status = totalPublished > 0 && completedCount === totalPublished
        ? 'completed'
        : completedCount > 0
          ? 'in_progress'
          : 'not_started';

      return {
        student: entry.student,
        isSubscribed: entry.isSubscribed,
        subscribedAt: entry.subscribedAt,
        completedLectureIds: Array.from(entry.completedLectureIds),
        completedByLectureId: entry.completedByLectureId,
        completedCount,
        totalPublished,
        percent,
        lastCompletedAt: entry.lastCompletedAt,
        status,
      };
    })
    .sort((a, b) => {
      if (b.percent !== a.percent) return b.percent - a.percent;
      const aTime = a.lastCompletedAt ? new Date(a.lastCompletedAt).getTime() : 0;
      const bTime = b.lastCompletedAt ? new Date(b.lastCompletedAt).getTime() : 0;
      if (bTime !== aTime) return bTime - aTime;
      return (a.student?.full_name || '').localeCompare(b.student?.full_name || '', 'ar');
    });

  return { lectures, students };
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

export async function uploadCourseLectureMedia({
  courseId,
  lectureId,
  lectureSlug,
  mediaType = LECTURE_MEDIA_TYPES.R2_VIDEO,
  file,
  onProgress,
}) {
  const client = ensureSupabaseClient();
  const isAudio = mediaType === LECTURE_MEDIA_TYPES.R2_AUDIO;

  if (!file) {
    throw new Error(
      i18n.t(isAudio ? 'errors:courseLectures.selectAudioFirst' : 'errors:courseLectures.selectVideoFirst')
    );
  }

  const validation = validateLectureMediaFile(file, mediaType);
  if (!validation.valid) {
    throw new Error(
      i18n.t(isAudio ? 'errors:courseLectures.supportedAudioOnly' : 'errors:courseLectures.mp4Only')
    );
  }

  const { data, error } = await client.functions.invoke(LECTURE_UPLOAD_FUNCTION, {
    body: cleanPayload({
      courseId,
      lectureId: lectureId ?? undefined,
      lectureSlug: lectureSlug ?? undefined,
      mediaType,
      fileName: file.name,
      contentType: validation.contentType,
      fileSize: file.size,
    }),
  });

  if (error) {
    throw await getFunctionErrorMessage(
      error,
      i18n.t(isAudio ? 'errors:courseLectures.featureUploadAudio' : 'errors:courseLectures.featureUploadVideo')
    );
  }

  const uploadUrl = data?.uploadUrl ?? data?.signedUrl ?? data?.url;
  if (!uploadUrl) {
    throw new Error(i18n.t('errors:courseLectures.invalidUploadUrl'));
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
  const resolvedContentType = data?.r2_content_type ?? data?.contentType ?? validation.contentType;
  const lecturePayload = normalizeLecturePayload({
    ...(data?.lecturePatch ?? data?.lecturePayload ?? data?.lecture_patch ?? data?.dbPayload ?? {}),
    media_type: data?.media_type ?? mediaType,
    youtube_url: null,
    ...(resolvedObjectKey ? { r2_object_key: resolvedObjectKey } : {}),
    ...(resolvedOriginalFileName ? { original_file_name: resolvedOriginalFileName } : {}),
    ...(resolvedContentType ? { r2_content_type: resolvedContentType } : {}),
  });

  if (!lecturePayload.r2_object_key) {
    throw new Error(i18n.t('errors:courseLectures.missingUploadMetadata'));
  }

  // Return only the upload patch so callers can merge it into form payloads
  // without wiping fields like slug/title with normalizeLecture defaults.
  return normalizeLecturePayload({
    ...lecturePayload,
    original_file_name: lecturePayload.original_file_name ?? file.name,
  });
}

export async function uploadCourseLectureVideo({ courseId, lectureId, lectureSlug, file, onProgress }) {
  return uploadCourseLectureMedia({
    courseId,
    lectureId,
    lectureSlug,
    mediaType: LECTURE_MEDIA_TYPES.R2_VIDEO,
    file,
    onProgress,
  });
}

export async function fetchR2StorageUsage() {
  const client = ensureSupabaseClient();

  const { data, error } = await client.functions.invoke(R2_STORAGE_USAGE_FUNCTION, {
    body: {},
  });

  if (error) {
    throw await getFunctionErrorMessage(error, i18n.t('errors:courseLectures.featureCheckStorage'));
  }

  const usedBytes = Number(data?.usedBytes ?? 0);
  const quotaBytes = Number(data?.quotaBytes ?? R2_STORAGE_QUOTA_BYTES);
  const blockThresholdBytes = Number(data?.blockThresholdBytes ?? R2_UPLOAD_BLOCK_THRESHOLD_BYTES);
  const objectCount = Number(data?.objectCount ?? 0);
  const rawUsedPercent = Number.isFinite(Number(data?.rawUsedPercent))
    ? Number(data.rawUsedPercent)
    : Math.round((usedBytes / quotaBytes) * 1000) / 10;
  const usedPercent = Number.isFinite(Number(data?.usedPercent))
    ? Number(data.usedPercent)
    : Math.min(100, rawUsedPercent);

  return {
    usedBytes,
    objectCount,
    quotaBytes,
    blockThresholdBytes,
    usedPercent,
    rawUsedPercent,
    uploadsBlocked: Boolean(data?.uploadsBlocked ?? usedBytes >= blockThresholdBytes),
  };
}

export async function requestCourseLecturePlaybackUrl(lectureId) {
  const client = ensureSupabaseClient();

  const { data, error } = await client.functions.invoke(LECTURE_PLAYBACK_FUNCTION, {
    body: { lectureId },
  });

  if (error) {
    throw await getFunctionErrorMessage(error, i18n.t('errors:courseLectures.featurePlayVideo'));
  }

  const url = data?.playbackUrl ?? data?.signedUrl ?? data?.url;
  if (!url) {
    throw new Error(i18n.t('errors:courseLectures.invalidPlaybackUrl'));
  }

  return {
    url,
    mediaType: data?.mediaType ?? null,
    contentType: data?.contentType ?? null,
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
    throw await getFunctionErrorMessage(error, i18n.t('errors:courseLectures.featureDeleteVideo'));
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
    throw await getFunctionErrorMessage(error, i18n.t('errors:courseLectures.featureDeleteVideos'));
  }
}
