import { useCallback, useEffect, useRef, useState } from 'react';
import {
  X,
  Upload,
  Loader,
  PlayCircle,
  Video,
  Headphones,
  ClipboardCheck,
  AlertTriangle,
  RefreshCcw,
} from 'lucide-react';
import {
  ACCEPTED_AUDIO_EXTENSIONS,
  LECTURE_MEDIA_TYPES,
  R2_STORAGE_QUOTA_BYTES,
  R2_UPLOAD_BLOCK_THRESHOLD_BYTES,
  createCourseLecture,
  fetchR2StorageUsage,
  formatBytesDecimalGb,
  hasLectureUploadedVideo,
  inferLectureMediaType,
  isCourseLectureSlugTaken,
  isValidHttpUrl,
  maybeDeleteCourseLectureVideoAsset,
  updateCourseLecture,
  uploadCourseLectureMedia,
  validateLectureMediaFile,
} from '../../services/courseLecturesService';
import { getYouTubeEmbedUrl } from '../../lib/youtube';
import { normalizeSlug, SLUG_REGEX } from '../../lib/slug';
import {
  LECTURE_TRANSLATION_SPECS,
  getMissingTranslations,
} from '../../i18n/content.js';
import TranslationTabs from './components/TranslationTabs';

const EMPTY_FORM = {
  slug: '',
  title: '',
  title_en: '',
  title_tr: '',
  description: '',
  description_en: '',
  description_tr: '',
  media_type: LECTURE_MEDIA_TYPES.YOUTUBE,
  youtube_url: '',
  test_url: '',
  sort_order: 0,
  is_published: true,
};

const DUPLICATE_LECTURE_SLUG_ERROR =
  'الرابط المختصر للمحاضرة مستخدم بالفعل داخل هذه الدورة. اختر رابطاً مختلفاً ثم أعد الحفظ.';

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return 'غير معروف';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function CourseLectureFormModal({ course, lecture, onClose, onSaved }) {
  const isEdit = Boolean(lecture);
  const defaultMediaType = lecture
    ? inferLectureMediaType(lecture)
    : course?.is_free
      ? LECTURE_MEDIA_TYPES.YOUTUBE
      : LECTURE_MEDIA_TYPES.R2_VIDEO;

  const mediaInputRef = useRef(null);

  const [form, setForm] = useState(
    lecture
      ? {
          slug: lecture.slug ?? '',
          title: lecture.title ?? '',
          title_en: lecture.title_en ?? '',
          title_tr: lecture.title_tr ?? '',
          description: lecture.description ?? '',
          description_en: lecture.description_en ?? '',
          description_tr: lecture.description_tr ?? '',
          media_type: inferLectureMediaType(lecture),
          youtube_url: lecture.youtube_url ?? '',
          test_url: lecture.test_url ?? '',
          sort_order: lecture.sort_order ?? 0,
          is_published: lecture.is_published ?? true,
        }
      : { ...EMPTY_FORM, media_type: defaultMediaType }
  );
  const [activeLang, setActiveLang] = useState('ar');
  const [mediaFile, setMediaFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(Boolean(lecture));
  const [r2Usage, setR2Usage] = useState(null);
  const [r2UsageLoading, setR2UsageLoading] = useState(false);
  const [r2UsageError, setR2UsageError] = useState('');

  useEffect(() => {
    setActiveLang('ar');
  }, [lecture?.id]);

  const loadR2Usage = useCallback(async () => {
    setR2UsageLoading(true);
    setR2UsageError('');
    try {
      const usage = await fetchR2StorageUsage();
      setR2Usage(usage);
      return usage;
    } catch (err) {
      console.error('[modal r2 usage fetch failed]', err);
      setR2UsageError(err?.message ?? 'تعذر التحقق من مساحة التخزين على Cloudflare R2.');
      return null;
    } finally {
      setR2UsageLoading(false);
    }
  }, []);

  const isR2Mode =
    form.media_type === LECTURE_MEDIA_TYPES.R2_VIDEO ||
    form.media_type === LECTURE_MEDIA_TYPES.R2_AUDIO;
  const isAudioMode = form.media_type === LECTURE_MEDIA_TYPES.R2_AUDIO;

  useEffect(() => {
    if (isR2Mode && !r2Usage && !r2UsageLoading && !r2UsageError) {
      loadR2Usage();
    }
  }, [isR2Mode, r2Usage, r2UsageLoading, r2UsageError, loadR2Usage]);

  const { missingEn, missingTr } = getMissingTranslations(form, LECTURE_TRANSLATION_SPECS);

  const youtubePreview =
    form.media_type === LECTURE_MEDIA_TYPES.YOUTUBE
      ? getYouTubeEmbedUrl(form.youtube_url)
      : null;

  const existingMediaType = lecture ? inferLectureMediaType(lecture) : null;
  const hasExistingSameTypeR2 = Boolean(
    isEdit &&
    hasLectureUploadedVideo(lecture) &&
    existingMediaType === form.media_type
  );
  const existingMediaName = lecture?.original_file_name || lecture?.r2_object_key || '';
  const uploadsBlocked = Boolean(r2Usage?.uploadsBlocked);

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

  const handleMediaTypeChange = (nextMediaType) => {
    if (nextMediaType === form.media_type) return;

    setForm((prev) => ({ ...prev, media_type: nextMediaType }));
    setMediaFile(null);
    setUploadProgress(0);
    setUploadMessage('');
    setError('');
    if (mediaInputRef.current) {
      mediaInputRef.current.value = '';
    }
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

  const handleMediaFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (uploadsBlocked) {
      setError(
        `تم إيقاف رفع الملفات لأن المساحة المستخدمة في Cloudflare R2 بلغت ${formatBytesDecimalGb(r2Usage.usedBytes)} GB من أصل ${formatBytesDecimalGb(R2_STORAGE_QUOTA_BYTES)} GB.`
      );
      event.target.value = '';
      return;
    }

    const validation = validateLectureMediaFile(file, form.media_type);
    if (!validation.valid) {
      setError(
        isAudioMode
          ? `صيغ الصوت المعتمدة هي: ${ACCEPTED_AUDIO_EXTENSIONS.join(', ').toUpperCase()}`
          : 'صيغة الفيديو المعتمدة حالياً هي MP4 فقط.'
      );
      event.target.value = '';
      return;
    }

    if (r2Usage && r2Usage.usedBytes + file.size > (r2Usage.quotaBytes ?? R2_STORAGE_QUOTA_BYTES)) {
      setError(
        `حجم الملف (${formatFileSize(file.size)}) سيتجاوز الحد الأقصى المسموح للتخزين (${formatBytesDecimalGb(R2_STORAGE_QUOTA_BYTES)} GB).`
      );
      event.target.value = '';
      return;
    }

    setError('');
    setMediaFile(file);
    setUploadProgress(0);
    setUploadMessage(
      isAudioMode
        ? 'سيتم رفع الملف الصوتي عند حفظ المحاضرة.'
        : 'سيتم رفع ملف الفيديو عند حفظ المحاضرة.'
    );
  };

  const clearSelectedMedia = () => {
    setMediaFile(null);
    setUploadProgress(0);
    setUploadMessage(
      hasExistingSameTypeR2
        ? 'سيبقى الملف الحالي كما هو حتى ترفع ملفاً جديداً.'
        : ''
    );

    if (mediaInputRef.current) {
      mediaInputRef.current.value = '';
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.title.trim()) {
      setActiveLang('ar');
      setError('يرجى إدخال عنوان المحاضرة باللغة العربية.');
      return;
    }

    const trimmedTestUrl = form.test_url.trim();
    if (trimmedTestUrl && !isValidHttpUrl(trimmedTestUrl)) {
      setError('رابط الاختبار يجب أن يبدأ بـ http:// أو https:// وأن يكون رابطاً صحيحاً.');
      return;
    }

    setSaving(true);

    let uploadedMedia = null;

    try {
      const payload = {
        course_id: course.id,
        slug: normalizeSlug(form.slug),
        title: form.title.trim(),
        title_en: form.title_en.trim() || null,
        title_tr: form.title_tr.trim() || null,
        description: form.description.trim() || null,
        description_en: form.description_en.trim() || null,
        description_tr: form.description_tr.trim() || null,
        media_type: form.media_type,
        test_url: trimmedTestUrl || null,
        sort_order: Number(form.sort_order) || 0,
        is_published: Boolean(form.is_published),
      };

      if (!SLUG_REGEX.test(payload.slug)) {
        throw new Error('الرابط المختصر للمحاضرة يجب أن يحتوي على حروف إنجليزية صغيرة وأرقام وواصلات فقط (مثال: lesson-one).');
      }

      if (form.media_type === LECTURE_MEDIA_TYPES.YOUTUBE) {
        if (!youtubePreview) {
          throw new Error('يرجى إدخال رابط يوتيوب صحيح للمحاضرة.');
        }

        payload.youtube_url = form.youtube_url.trim();
        payload.r2_object_key = null;
        payload.original_file_name = null;
        payload.r2_content_type = null;
      } else {
        if (!mediaFile && !hasExistingSameTypeR2) {
          throw new Error(
            isAudioMode
              ? 'يرجى اختيار ملف صوتي قبل حفظ المحاضرة الصوتية.'
              : 'يرجى اختيار ملف MP4 قبل حفظ محاضرة الفيديو.'
          );
        }

        if (mediaFile) {
          const latestUsage = r2Usage ?? (await loadR2Usage());
          if (latestUsage?.uploadsBlocked) {
            throw new Error(
              `تم إيقاف الرفع لأن مساحة Cloudflare R2 المستخدمة بلغت ${formatBytesDecimalGb(latestUsage.usedBytes)} GB (الحد الأقصى قبل الإيقاف ${formatBytesDecimalGb(R2_UPLOAD_BLOCK_THRESHOLD_BYTES)} GB).`
            );
          }
          if (
            latestUsage &&
            latestUsage.usedBytes + mediaFile.size > (latestUsage.quotaBytes ?? R2_STORAGE_QUOTA_BYTES)
          ) {
            throw new Error(
              `لا توجد مساحة كافية على R2 لرفع هذا الملف (الحد الأقصى ${formatBytesDecimalGb(R2_STORAGE_QUOTA_BYTES)} GB).`
            );
          }
        }
      }

      const slugTaken = await isCourseLectureSlugTaken(course.id, payload.slug, {
        excludeLectureId: lecture?.id,
      });

      if (slugTaken) {
        throw new Error(DUPLICATE_LECTURE_SLUG_ERROR);
      }

      if (isR2Mode && mediaFile) {
        setUploadingMedia(true);
        setUploadProgress(0);
        setUploadMessage(isAudioMode ? 'جارٍ رفع الملف الصوتي...' : 'جارٍ رفع ملف الفيديو...');

        uploadedMedia = await uploadCourseLectureMedia({
          courseId: course.id,
          lectureId: lecture?.id,
          lectureSlug: payload.slug,
          mediaType: form.media_type,
          file: mediaFile,
          onProgress: (progress) => {
            setUploadProgress(progress);
            setUploadMessage(
              `${isAudioMode ? 'جارٍ رفع الملف الصوتي' : 'جارٍ رفع ملف الفيديو'}... ${progress}%`
            );
          },
        });

        Object.assign(payload, uploadedMedia);
        setUploadProgress(100);
        setUploadMessage(
          isAudioMode
            ? 'تم رفع الملف الصوتي وسيتم الآن حفظ بيانات المحاضرة.'
            : 'تم رفع ملف الفيديو وسيتم الآن حفظ بيانات المحاضرة.'
        );
      } else if (isR2Mode && hasExistingSameTypeR2) {
        payload.youtube_url = null;
      }

      const saved = isEdit
        ? await updateCourseLecture(lecture.id, payload)
        : await createCourseLecture(payload);

      onSaved(saved);

      if (
        isEdit &&
        lecture?.r2_object_key &&
        saved?.r2_object_key !== lecture.r2_object_key
      ) {
        maybeDeleteCourseLectureVideoAsset(lecture).catch((cleanupError) => {
          console.error('[cleanup old course lecture asset failed]', cleanupError);
        });
      }

      onClose();
    } catch (saveError) {
      if (
        uploadedMedia?.r2_object_key &&
        uploadedMedia.r2_object_key !== lecture?.r2_object_key
      ) {
        maybeDeleteCourseLectureVideoAsset(uploadedMedia).catch((cleanupError) => {
          console.error('[cleanup new course lecture asset failed]', cleanupError);
        });
      }

      setUploadProgress(0);
      setUploadMessage('');

      console.error(saveError);
      if (
        saveError?.message?.includes('quran_course_lectures_course_slug_key') ||
        saveError?.message?.includes('duplicate key value violates unique constraint') ||
        saveError?.message?.includes('Lecture slug already exists for this course') ||
        saveError?.message === DUPLICATE_LECTURE_SLUG_ERROR
      ) {
        setError(DUPLICATE_LECTURE_SLUG_ERROR);
      } else {
        setError(saveError.message ?? 'حدث خطأ أثناء حفظ المحاضرة.');
      }
    } finally {
      setUploadingMedia(false);
      setSaving(false);
    }
  };

  const langSuffix = activeLang === 'ar' ? '' : `_${activeLang}`;
  const langLabel = activeLang === 'en' ? 'English' : 'Türkçe';
  const r2Accept = isAudioMode
    ? `${ACCEPTED_AUDIO_EXTENSIONS.join(',')},audio/*`
    : 'video/mp4,.mp4';

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
          <TranslationTabs
            activeLang={activeLang}
            onChange={setActiveLang}
            missingEn={missingEn}
            missingTr={missingTr}
          />

          {activeLang === 'ar' ? (
            <>
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
            </>
          ) : (
            <div dir="ltr" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="admin-field-group">
                <label htmlFor={`course-lecture-title-${activeLang}`} className="admin-label" dir="rtl">
                  عنوان المحاضرة ({langLabel})
                </label>
                {form.title.trim() && (
                  <p className="admin-field-hint" dir="rtl">النص العربي: {form.title}</p>
                )}
                <input
                  id={`course-lecture-title-${activeLang}`}
                  type="text"
                  className="admin-input"
                  value={form[`title${langSuffix}`]}
                  onChange={(event) => handleField(`title${langSuffix}`, event.target.value)}
                  placeholder={activeLang === 'en' ? 'e.g. Lecture 1 - Articulation Points' : 'Örn: 1. Ders - Harflerin Mahreçleri'}
                />
              </div>

              <div className="admin-field-group">
                <label htmlFor={`course-lecture-description-${activeLang}`} className="admin-label" dir="rtl">
                  وصف مختصر ({langLabel})
                </label>
                <textarea
                  id={`course-lecture-description-${activeLang}`}
                  className="admin-input admin-textarea"
                  value={form[`description${langSuffix}`]}
                  onChange={(event) => handleField(`description${langSuffix}`, event.target.value)}
                  placeholder={activeLang === 'en' ? 'Brief summary of what students will learn...' : 'Öğrencilerin bu derste öğreneceklerinin özeti...'}
                  rows={3}
                />
              </div>
            </div>
          )}

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

          {/* 3-way Media Type Selector */}
          <div className="admin-field-group" style={{ gap: '0.6rem' }}>
            <label className="admin-label">نوع محتوى المحاضرة *</label>
            <div
              role="radiogroup"
              aria-label="نوع محتوى المحاضرة"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.55rem' }}
            >
              {[
                { value: LECTURE_MEDIA_TYPES.YOUTUBE, label: 'رابط يوتيوب', Icon: PlayCircle },
                { value: LECTURE_MEDIA_TYPES.R2_VIDEO, label: 'فيديو MP4 (R2)', Icon: Video },
                { value: LECTURE_MEDIA_TYPES.R2_AUDIO, label: 'محاضرة صوتية (R2)', Icon: Headphones },
              ].map(({ value, label, Icon }) => {
                const selected = form.media_type === value;
                return (
                  <button
                    key={value}
                    type="button"
                    id={`lecture-media-type-${value}`}
                    role="radio"
                    aria-checked={selected}
                    onClick={() => handleMediaTypeChange(value)}
                    disabled={saving}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.45rem',
                      padding: '0.65rem 0.75rem',
                      borderRadius: '10px',
                      border: `1px solid ${selected ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
                      background: selected ? 'rgba(78, 173, 136, 0.14)' : 'var(--admin-surface2)',
                      color: selected ? 'var(--admin-accent)' : 'var(--admin-text)',
                      fontWeight: selected ? 800 : 600,
                      fontSize: '0.85rem',
                      cursor: saving ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <Icon size={16} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
            {isEdit && lecture?.r2_object_key && form.media_type !== existingMediaType && (
              <p className="admin-field-hint" style={{ color: 'var(--admin-gold)' }}>
                سيتم حذف الملف القديم من Cloudflare R2 تلقائياً بعد حفظ التعديل بالنوع الجديد.
              </p>
            )}
          </div>

          {form.media_type === LECTURE_MEDIA_TYPES.YOUTUBE ? (
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
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <label className="admin-label" style={{ margin: 0 }}>
                  {isAudioMode ? 'الملف الصوتي للمحاضرة *' : 'ملف الفيديو MP4 *'}
                </label>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {r2UsageLoading ? (
                    <span className="admin-muted" style={{ fontSize: '0.75rem' }}>جارٍ فحص مساحة R2…</span>
                  ) : r2Usage ? (
                    <span
                      className="admin-badge"
                      style={{
                        fontSize: '0.74rem',
                        background: uploadsBlocked ? 'rgba(248, 81, 73, 0.14)' : 'rgba(78, 173, 136, 0.12)',
                        color: uploadsBlocked ? 'var(--admin-danger)' : 'var(--admin-accent)',
                      }}
                    >
                      R2: {r2Usage.usedPercent.toFixed(1)}% ({formatBytesDecimalGb(r2Usage.usedBytes)} / {formatBytesDecimalGb(r2Usage.quotaBytes)} GB)
                    </span>
                  ) : null}

                  <button
                    type="button"
                    className="admin-icon-btn admin-icon-btn--neutral"
                    onClick={loadR2Usage}
                    disabled={r2UsageLoading}
                    title="تحديث مساحة التخزين"
                    aria-label="تحديث مساحة التخزين"
                  >
                    <RefreshCcw size={13} className={r2UsageLoading ? 'admin-spin' : ''} />
                  </button>
                </div>
              </div>

              {uploadsBlocked && (
                <div className="admin-error-banner" role="alert">
                  <AlertTriangle size={16} />
                  <span>
                    تم إيقاف رفع الملفات لأن مساحة R2 وصلت إلى {formatBytesDecimalGb(r2Usage.usedBytes)} GB (≥ {formatBytesDecimalGb(R2_UPLOAD_BLOCK_THRESHOLD_BYTES)} GB). احذف ملفات قديمة أولاً لتتمكن من رفع ملفات جديدة.
                  </span>
                </div>
              )}

              {r2UsageError && !r2Usage && (
                <p className="admin-field-hint" style={{ color: '#f5b942' }}>
                  ⚠️ {r2UsageError}
                </p>
              )}

              <div
                role="button"
                tabIndex={uploadsBlocked ? -1 : 0}
                aria-disabled={uploadsBlocked}
                onClick={() => {
                  if (!uploadsBlocked && !saving) mediaInputRef.current?.click();
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !uploadsBlocked && !saving) {
                    mediaInputRef.current?.click();
                  }
                }}
                className="rounded-2xl border border-dashed p-5 text-center"
                style={{
                  borderColor: 'var(--admin-border)',
                  backgroundColor: 'var(--admin-surface2)',
                  cursor: uploadsBlocked || saving ? 'not-allowed' : 'pointer',
                  opacity: uploadsBlocked ? 0.5 : 1,
                }}
                aria-label={isAudioMode ? 'رفع صوت المحاضرة' : 'رفع فيديو المحاضرة'}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.65rem', color: 'var(--admin-muted)' }}>
                  <Upload size={28} />
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--admin-text)' }}>
                      {isAudioMode ? 'اختر ملفاً صوتياً للمحاضرة' : 'اختر ملف MP4 للمحاضرة'}
                    </div>
                    <div style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
                      {isAudioMode
                        ? 'الصيغ المدعومة: MP3, M4A, AAC, WAV, OGG, WEBM — يتم الرفع مباشرة إلى Cloudflare R2.'
                        : 'سيتم طلب رابط رفع مؤقت من خدمة التخزين الخلفية ثم رفع الملف مباشرة إلى Cloudflare R2.'}
                    </div>
                  </div>
                </div>
              </div>

              <input
                ref={mediaInputRef}
                type="file"
                accept={r2Accept}
                onChange={handleMediaFileChange}
                className="admin-hidden-input"
                id="course-lecture-media-input"
                disabled={uploadsBlocked || saving}
              />

              {(mediaFile || hasExistingSameTypeR2) && (
                <div
                  className="rounded-xl"
                  style={{
                    border: '1px solid var(--admin-border)',
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    padding: '0.85rem 1rem',
                  }}
                >
                  {mediaFile ? (
                    <>
                      <div style={{ fontWeight: 700, color: 'var(--admin-text)' }}>{mediaFile.name}</div>
                      <div className="admin-field-hint">الحجم: {formatFileSize(mediaFile.size)}</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontWeight: 700, color: 'var(--admin-text)' }}>{existingMediaName}</div>
                      <div className="admin-field-hint">هذا هو الملف المرتبط بالمحاضرة حالياً.</div>
                    </>
                  )}

                  {mediaFile && (
                    <button
                      type="button"
                      className="admin-photo-clear"
                      onClick={clearSelectedMedia}
                      style={{ marginTop: '0.5rem' }}
                    >
                      إزالة الملف المختار
                    </button>
                  )}
                </div>
              )}

              {(uploadingMedia || uploadProgress > 0 || uploadMessage) && (
                <div className="admin-field-group" style={{ gap: '0.45rem' }}>
                  <div className="admin-field-hint" style={{ lineHeight: 1.8 }}>{uploadMessage}</div>
                  {(uploadingMedia || uploadProgress > 0) && (
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

          {/* Optional Lecture Quiz / Test Link */}
          <div className="admin-field-group">
            <label htmlFor="course-lecture-test-url" className="admin-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ClipboardCheck size={15} style={{ color: 'var(--admin-gold)' }} />
              <span>رابط اختبار المحاضرة (اختياري)</span>
            </label>
            <input
              id="course-lecture-test-url"
              type="url"
              className="admin-input"
              value={form.test_url}
              onChange={(event) => handleField('test_url', event.target.value)}
              placeholder="https://forms.gle/..."
              dir="ltr"
            />
            <p className="admin-field-hint">
              يظهر للطالب كزر اختبار مباشر أسفل مشغل المحاضرة (يفتح في نافذة جديدة).
            </p>
          </div>

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
