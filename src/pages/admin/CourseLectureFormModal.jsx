import { useEffect, useRef, useState } from 'react';
import { X, Upload, Loader } from 'lucide-react';
import {
  createCourseLecture,
  hasLectureUploadedVideo,
  maybeDeleteCourseLectureVideoAsset,
  updateCourseLecture,
  uploadCourseLectureVideo,
} from '../../services/courseLecturesService';
import { getYouTubeEmbedUrl } from '../../lib/youtube';
import { normalizeSlug, SLUG_REGEX } from '../../lib/slug';

const EMPTY_FORM = {
  slug: '',
  title: '',
  description: '',
  youtube_url: '',
  sort_order: 0,
  is_published: true,
};

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return 'غير معروف';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CourseLectureFormModal({ course, lecture, onClose, onSaved }) {
  const isEdit = Boolean(lecture);
  const isFreeCourse = Boolean(course?.is_free);
  const videoInputRef = useRef(null);

  const [form, setForm] = useState(
    lecture
      ? {
          slug: lecture.slug ?? '',
          title: lecture.title ?? '',
          description: lecture.description ?? '',
          youtube_url: lecture.youtube_url ?? '',
          sort_order: lecture.sort_order ?? 0,
          is_published: lecture.is_published ?? true,
        }
      : { ...EMPTY_FORM }
  );
  const [videoFile, setVideoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(Boolean(lecture));

  const youtubePreview = isFreeCourse ? getYouTubeEmbedUrl(form.youtube_url) : null;
  const hasExistingVideo = hasLectureUploadedVideo(lecture);
  const existingVideoName = lecture?.original_file_name || lecture?.r2_object_key || '';

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleTitleChange = (event) => {
    const title = event.target.value;

    setForm((prev) => ({
      ...prev,
      title,
      slug: slugManuallyEdited ? prev.slug : normalizeSlug(title),
    }));
  };

  const handleSlugChange = (event) => {
    setSlugManuallyEdited(true);
    handleField('slug', normalizeSlug(event.target.value));
  };

  const handleVideoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isMp4 = file.type === 'video/mp4' || file.name.toLowerCase().endsWith('.mp4');
    if (!isMp4) {
      setError('صيغة الفيديو المعتمدة حالياً هي MP4 فقط.');
      event.target.value = '';
      return;
    }

    setError('');
    setVideoFile(file);
    setUploadProgress(0);
    setUploadMessage('سيتم رفع ملف الفيديو عند حفظ المحاضرة.');
  };

  const clearSelectedVideo = () => {
    setVideoFile(null);
    setUploadProgress(0);
    setUploadMessage(hasExistingVideo ? 'سيبقى الفيديو الحالي كما هو حتى ترفع ملفاً جديداً.' : '');

    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);

    let uploadedVideo = null;

    try {
      const payload = {
        course_id: course.id,
        slug: normalizeSlug(form.slug),
        title: form.title.trim(),
        description: form.description.trim() || null,
        sort_order: Number(form.sort_order) || 0,
        is_published: Boolean(form.is_published),
      };

      if (!SLUG_REGEX.test(payload.slug)) {
        throw new Error('الرابط المختصر للمحاضرة يجب أن يحتوي على حروف إنجليزية صغيرة وأرقام وواصلات فقط (مثال: lesson-one).');
      }

      if (isFreeCourse) {
        if (!youtubePreview) {
          throw new Error('يرجى إدخال رابط يوتيوب صحيح للمحاضرة المجانية.');
        }

        payload.youtube_url = form.youtube_url.trim();
      } else if (videoFile) {
        setUploadingVideo(true);
        setUploadProgress(0);
        setUploadMessage('جارٍ رفع ملف الفيديو...');

        uploadedVideo = await uploadCourseLectureVideo({
          courseId: course.id,
          lectureId: lecture?.id,
          file: videoFile,
          onProgress: (progress) => {
            setUploadProgress(progress);
            setUploadMessage(`جارٍ رفع ملف الفيديو... ${progress}%`);
          },
        });

        Object.assign(payload, uploadedVideo);
        setUploadProgress(100);
        setUploadMessage('تم رفع ملف الفيديو وسيتم الآن حفظ بيانات المحاضرة.');
      } else if (!hasExistingVideo) {
        throw new Error('يرجى اختيار ملف MP4 قبل حفظ المحاضرة المدفوعة.');
      }

      const saved = isEdit
        ? await updateCourseLecture(lecture.id, payload)
        : await createCourseLecture(payload);

      onSaved(saved);

      if (
        !isFreeCourse &&
        isEdit &&
        uploadedVideo?.r2_object_key &&
        lecture?.r2_object_key &&
        uploadedVideo.r2_object_key !== lecture.r2_object_key
      ) {
        maybeDeleteCourseLectureVideoAsset(lecture).catch((cleanupError) => {
          console.error('[cleanup old course lecture video failed]', cleanupError);
        });
      }

      onClose();
    } catch (saveError) {
      if (
        uploadedVideo?.r2_object_key &&
        uploadedVideo.r2_object_key !== lecture?.r2_object_key
      ) {
        maybeDeleteCourseLectureVideoAsset(uploadedVideo).catch((cleanupError) => {
          console.error('[cleanup new course lecture video failed]', cleanupError);
        });
      }

      setUploadProgress(0);
      setUploadMessage('');

      console.error(saveError);
      if (
        saveError?.message?.includes('quran_course_lectures_course_slug_key') ||
        saveError?.message?.includes('duplicate key value violates unique constraint')
      ) {
        setError('الرابط المختصر للمحاضرة مستخدم بالفعل داخل هذه الدورة. اختر رابطاً مختلفاً ثم أعد الحفظ.');
      } else {
        setError(saveError.message ?? 'حدث خطأ أثناء حفظ المحاضرة.');
      }
    } finally {
      setUploadingVideo(false);
      setSaving(false);
    }
  };

  return (
    <div
      className="admin-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'تعديل محاضرة' : 'إضافة محاضرة'}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="admin-modal admin-modal--wide">
        <div className="admin-modal-header">
          <h2 className="admin-modal-title">
            {isEdit ? 'تعديل بيانات المحاضرة' : 'إضافة محاضرة جديدة'}
          </h2>
          <button className="admin-modal-close" onClick={onClose} aria-label="إغلاق">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="admin-modal-body" id="course-lecture-form">
          <div className="admin-field-group">
            <label htmlFor="course-lecture-title" className="admin-label">عنوان المحاضرة *</label>
            <input
              id="course-lecture-title"
              type="text"
              className="admin-input"
              value={form.title}
              onChange={handleTitleChange}
              placeholder="مثال: المحاضرة الأولى - مخارج الحروف"
              required
            />
          </div>

          <div className="admin-field-group">
            <label htmlFor="course-lecture-slug" className="admin-label">الرابط المختصر للمحاضرة (slug) *</label>
            <input
              id="course-lecture-slug"
              type="text"
              className="admin-input"
              value={form.slug}
              onChange={handleSlugChange}
              placeholder="lesson-one"
              dir="ltr"
              required
            />
            <p className="admin-field-hint" style={{ lineHeight: 1.8 }}>
              يتم توليد هذا الرابط تلقائياً من العنوان ويمكنك تعديله. إذا كان العنوان بالعربية بالكامل فاكتب رابطاً إنجليزياً قصيراً يدوياً.
            </p>
          </div>

          <div className="admin-field-group">
            <label htmlFor="course-lecture-description" className="admin-label">وصف مختصر</label>
            <textarea
              id="course-lecture-description"
              className="admin-input admin-textarea"
              value={form.description}
              onChange={(event) => handleField('description', event.target.value)}
              placeholder="ملخص سريع لما سيتعلمه الطالب في هذه المحاضرة..."
              rows={3}
            />
          </div>

          {isFreeCourse ? (
            <div className="admin-field-group" style={{ gap: '0.75rem' }}>
              <label htmlFor="course-lecture-youtube" className="admin-label">رابط يوتيوب *</label>
              <input
                id="course-lecture-youtube"
                type="url"
                className="admin-input"
                value={form.youtube_url}
                onChange={(event) => handleField('youtube_url', event.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                dir="ltr"
                required
              />

              {form.youtube_url.trim() && !youtubePreview && (
                <p className="admin-field-hint" style={{ color: 'var(--admin-danger)' }}>
                  تعذر توليد معاينة يوتيوب من هذا الرابط. تأكد من إدخال رابط فيديو صحيح.
                </p>
              )}

              {youtubePreview && (
                <div className="rounded-2xl overflow-hidden aspect-video" style={{ border: '1px solid var(--admin-border)', backgroundColor: '#000' }}>
                  <iframe
                    src={youtubePreview}
                    title="معاينة محاضرة يوتيوب"
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                    style={{ border: 'none' }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="admin-field-group" style={{ gap: '0.85rem' }}>
              <label className="admin-label">ملف الفيديو MP4 *</label>

              <div
                role="button"
                tabIndex={0}
                onClick={() => videoInputRef.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') videoInputRef.current?.click();
                }}
                className="rounded-2xl border border-dashed p-5 text-center"
                style={{
                  borderColor: 'var(--admin-border)',
                  backgroundColor: 'var(--admin-surface2)',
                  cursor: 'pointer',
                }}
                aria-label="رفع فيديو المحاضرة"
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.65rem', color: 'var(--admin-muted)' }}>
                  <Upload size={28} />
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--admin-text)' }}>اختر ملف MP4 للمحاضرة</div>
                    <div style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
                      سيتم طلب رابط رفع مؤقت من خدمة الفيديو الخلفية ثم رفع الملف مباشرة.
                    </div>
                  </div>
                </div>
              </div>

              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,.mp4"
                onChange={handleVideoChange}
                className="admin-hidden-input"
                id="course-lecture-video"
              />

              {(videoFile || hasExistingVideo) && (
                <div
                  className="rounded-xl"
                  style={{
                    border: '1px solid var(--admin-border)',
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    padding: '0.85rem 1rem',
                  }}
                >
                  {videoFile ? (
                    <>
                      <div style={{ fontWeight: 700, color: 'var(--admin-text)' }}>{videoFile.name}</div>
                      <div className="admin-field-hint">الحجم: {formatFileSize(videoFile.size)}</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontWeight: 700, color: 'var(--admin-text)' }}>{existingVideoName}</div>
                      <div className="admin-field-hint">هذا هو الملف المرتبط بالمحاضرة حالياً.</div>
                    </>
                  )}

                  {videoFile && (
                    <button
                      type="button"
                      className="admin-photo-clear"
                      onClick={clearSelectedVideo}
                      style={{ marginTop: '0.5rem' }}
                    >
                      إزالة الملف المختار
                    </button>
                  )}
                </div>
              )}

              {(uploadingVideo || uploadProgress > 0 || uploadMessage) && (
                <div className="admin-field-group" style={{ gap: '0.45rem' }}>
                  <div className="admin-field-hint" style={{ lineHeight: 1.8 }}>{uploadMessage}</div>
                  {(uploadingVideo || uploadProgress > 0) && (
                    <div
                      aria-hidden="true"
                      style={{
                        width: '100%',
                        height: '8px',
                        borderRadius: '999px',
                        backgroundColor: 'rgba(255,255,255,0.08)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${uploadProgress}%`,
                          height: '100%',
                          background: 'linear-gradient(135deg, var(--admin-accent), #2d8a68)',
                          transition: 'width 0.2s ease',
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="admin-field-row">
            <div className="admin-field-group" style={{ flex: 1 }}>
              <label htmlFor="course-lecture-sort" className="admin-label">ترتيب العرض</label>
              <input
                id="course-lecture-sort"
                type="number"
                className="admin-input"
                value={form.sort_order}
                onChange={(event) => handleField('sort_order', parseInt(event.target.value, 10) || 0)}
                min={0}
              />
            </div>

            <div className="admin-field-group" style={{ flex: 1 }}>
              <label className="admin-label">الحالة</label>
              <label className="admin-checkbox-label">
                <input
                  type="checkbox"
                  className="admin-checkbox"
                  checked={form.is_published}
                  onChange={(event) => handleField('is_published', event.target.checked)}
                  id="course-lecture-published"
                />
                <span>منشورة</span>
              </label>
            </div>
          </div>

          {error && (
            <div className="admin-error-banner" role="alert">⚠️ {error}</div>
          )}

          <div className="admin-modal-actions">
            <button type="button" className="admin-btn admin-btn--ghost" onClick={onClose} disabled={saving}>
              إلغاء
            </button>
            <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
              {saving ? <Loader size={16} className="admin-spin" /> : null}
              {saving ? 'جارٍ الحفظ…' : isEdit ? 'حفظ التعديلات' : 'إضافة المحاضرة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
