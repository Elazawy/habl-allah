export const LECTURE_MEDIA_TYPES = {
  YOUTUBE: 'youtube',
  R2_VIDEO: 'r2_video',
  R2_AUDIO: 'r2_audio',
};

export const ACCEPTED_VIDEO_EXTENSIONS = ['.mp4'];
export const ACCEPTED_AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.aac', '.wav', '.ogg', '.webm'];

// Cloudflare R2 storage allowance & hard cutoff in decimal bytes (1 GB = 10^9 bytes).
export const R2_STORAGE_QUOTA_BYTES = 9_500_000_000;
export const R2_UPLOAD_BLOCK_THRESHOLD_BYTES = 9_000_000_000;

const VIDEO_FORMAT_RULES = {
  mp4: {
    contentType: 'video/mp4',
    acceptedMimeTypes: ['video/mp4'],
  },
};

const AUDIO_FORMAT_RULES = {
  mp3: {
    contentType: 'audio/mpeg',
    acceptedMimeTypes: ['audio/mpeg', 'audio/mp3'],
  },
  m4a: {
    contentType: 'audio/mp4',
    acceptedMimeTypes: ['audio/mp4', 'audio/x-m4a', 'audio/m4a'],
  },
  aac: {
    contentType: 'audio/aac',
    acceptedMimeTypes: ['audio/aac', 'audio/x-aac'],
  },
  wav: {
    contentType: 'audio/wav',
    acceptedMimeTypes: ['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave'],
  },
  ogg: {
    contentType: 'audio/ogg',
    acceptedMimeTypes: ['audio/ogg', 'application/ogg'],
  },
  webm: {
    contentType: 'audio/webm',
    acceptedMimeTypes: ['audio/webm'],
  },
};

function getFileExtension(fileName = '') {
  const parts = String(fileName).trim().toLowerCase().split('.');
  return parts.length > 1 ? (parts.pop() ?? '') : '';
}

function normalizeMimeType(rawType = '') {
  return String(rawType).trim().toLowerCase().split(';')[0]?.trim() ?? '';
}

export function inferLectureMediaType(lecture) {
  if (!lecture) {
    return LECTURE_MEDIA_TYPES.YOUTUBE;
  }

  const rawType = typeof lecture.media_type === 'string' ? lecture.media_type.trim().toLowerCase() : '';
  if (
    rawType === LECTURE_MEDIA_TYPES.YOUTUBE ||
    rawType === LECTURE_MEDIA_TYPES.R2_VIDEO ||
    rawType === LECTURE_MEDIA_TYPES.R2_AUDIO
  ) {
    return rawType;
  }

  const r2Key =
    lecture.r2_object_key ||
    lecture.video_asset_key ||
    lecture.video_key ||
    lecture.object_key ||
    '';

  if (r2Key || lecture.has_r2_asset) {
    const contentType = normalizeMimeType(lecture.r2_content_type || '');
    const ext = getFileExtension(lecture.original_file_name || r2Key);
    if (contentType.startsWith('audio/') || ext in AUDIO_FORMAT_RULES) {
      return LECTURE_MEDIA_TYPES.R2_AUDIO;
    }
    return LECTURE_MEDIA_TYPES.R2_VIDEO;
  }

  return LECTURE_MEDIA_TYPES.YOUTUBE;
}

export function isLectureR2Media(lecture) {
  const mediaType = inferLectureMediaType(lecture);
  return mediaType === LECTURE_MEDIA_TYPES.R2_VIDEO || mediaType === LECTURE_MEDIA_TYPES.R2_AUDIO;
}

export function isValidHttpUrl(value) {
  if (typeof value !== 'string') {
    return false;
  }

  const trimmed = value.trim();
  if (!trimmed || /\s/.test(trimmed)) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateLectureMediaFile(file, mediaType) {
  if (!file || typeof file !== 'object' || !file.name) {
    return { valid: false, errorCode: 'MISSING_FILE' };
  }

  const ext = getFileExtension(file.name);
  const mimeType = normalizeMimeType(file.type || '');

  if (mediaType === LECTURE_MEDIA_TYPES.R2_AUDIO) {
    const spec = AUDIO_FORMAT_RULES[ext];
    if (!spec) {
      return { valid: false, errorCode: 'INVALID_AUDIO_FORMAT' };
    }
    if (mimeType && !spec.acceptedMimeTypes.includes(mimeType)) {
      return { valid: false, errorCode: 'INVALID_AUDIO_FORMAT' };
    }
    return {
      valid: true,
      mediaType: LECTURE_MEDIA_TYPES.R2_AUDIO,
      ext,
      contentType: spec.contentType,
    };
  }

  const spec = VIDEO_FORMAT_RULES[ext];
  if (!spec) {
    return { valid: false, errorCode: 'INVALID_VIDEO_FORMAT' };
  }
  if (mimeType && !spec.acceptedMimeTypes.includes(mimeType)) {
    return { valid: false, errorCode: 'INVALID_VIDEO_FORMAT' };
  }
  return {
    valid: true,
    mediaType: LECTURE_MEDIA_TYPES.R2_VIDEO,
    ext,
    contentType: spec.contentType,
  };
}

export function formatBytesDecimalGb(bytes) {
  const numeric = Number(bytes);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return '0.00';
  }
  return (numeric / 1_000_000_000).toFixed(2);
}
