import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LECTURE_MEDIA_TYPES,
  R2_STORAGE_QUOTA_BYTES,
  R2_UPLOAD_BLOCK_THRESHOLD_BYTES,
  formatBytesDecimalGb,
  inferLectureMediaType,
  isLectureR2Media,
  isValidHttpUrl,
  validateLectureMediaFile,
} from '../src/lib/courseLecturesUtils.js';

test('R2 storage quota constants match 9.5 GB allowance and 9.0 GB block cutoff', () => {
  assert.equal(R2_STORAGE_QUOTA_BYTES, 9_500_000_000);
  assert.equal(R2_UPLOAD_BLOCK_THRESHOLD_BYTES, 9_000_000_000);
  assert.equal(formatBytesDecimalGb(9_000_000_000), '9.00');
  assert.equal(formatBytesDecimalGb(9_500_000_000), '9.50');
});

test('inferLectureMediaType handles explicit types and legacy inference', () => {
  assert.equal(
    inferLectureMediaType({ media_type: 'youtube', youtube_url: 'https://youtu.be/abc' }),
    LECTURE_MEDIA_TYPES.YOUTUBE,
  );
  assert.equal(
    inferLectureMediaType({ media_type: 'r2_audio', r2_object_key: 'courses/c/l/a.mp3' }),
    LECTURE_MEDIA_TYPES.R2_AUDIO,
  );
  assert.equal(
    inferLectureMediaType({ r2_object_key: 'courses/c/l/source.mp4' }),
    LECTURE_MEDIA_TYPES.R2_VIDEO,
  );
  assert.equal(
    inferLectureMediaType({ has_r2_asset: true, r2_content_type: 'audio/mpeg' }),
    LECTURE_MEDIA_TYPES.R2_AUDIO,
  );
  assert.equal(isLectureR2Media({ media_type: 'r2_audio' }), true);
  assert.equal(isLectureR2Media({ media_type: 'youtube' }), false);
});

test('isValidHttpUrl accepts http/https URLs and rejects unsafe schemes', () => {
  assert.equal(isValidHttpUrl('https://forms.gle/abc123'), true);
  assert.equal(isValidHttpUrl('http://example.com/quiz?id=1'), true);
  assert.equal(isValidHttpUrl('javascript:alert(1)'), false);
  assert.equal(isValidHttpUrl('ftp://example.com/file'), false);
  assert.equal(isValidHttpUrl('not a url'), false);
  assert.equal(isValidHttpUrl(''), false);
});

test('validateLectureMediaFile validates MP4 and supported audio formats', () => {
  const mp4Result = validateLectureMediaFile(
    { name: 'lesson-1.mp4', type: 'video/mp4' },
    LECTURE_MEDIA_TYPES.R2_VIDEO,
  );
  assert.deepEqual(mp4Result, {
    valid: true,
    mediaType: 'r2_video',
    ext: 'mp4',
    contentType: 'video/mp4',
  });

  const m4aResult = validateLectureMediaFile(
    { name: 'voice.m4a', type: 'audio/x-m4a' },
    LECTURE_MEDIA_TYPES.R2_AUDIO,
  );
  assert.deepEqual(m4aResult, {
    valid: true,
    mediaType: 'r2_audio',
    ext: 'm4a',
    contentType: 'audio/mp4',
  });

  const mp3NoMime = validateLectureMediaFile(
    { name: 'voice.mp3', type: '' },
    LECTURE_MEDIA_TYPES.R2_AUDIO,
  );
  assert.deepEqual(mp3NoMime, {
    valid: true,
    mediaType: 'r2_audio',
    ext: 'mp3',
    contentType: 'audio/mpeg',
  });

  const rejectedVideoForAudio = validateLectureMediaFile(
    { name: 'video.mp4', type: 'video/mp4' },
    LECTURE_MEDIA_TYPES.R2_AUDIO,
  );
  assert.equal(rejectedVideoForAudio.valid, false);
  assert.equal(rejectedVideoForAudio.errorCode, 'INVALID_AUDIO_FORMAT');

  const rejectedWebmForVideo = validateLectureMediaFile(
    { name: 'clip.webm', type: 'video/webm' },
    LECTURE_MEDIA_TYPES.R2_VIDEO,
  );
  assert.equal(rejectedWebmForVideo.valid, false);
  assert.equal(rejectedWebmForVideo.errorCode, 'INVALID_VIDEO_FORMAT');
});
