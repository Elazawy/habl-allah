import { useEffect, useRef, useState } from 'react';
import { X, Upload, Loader, Plus, Trash2 } from 'lucide-react';
import { createCourse, updateCourse, uploadCourseImage, deleteCourseImage } from '../../services/coursesService';
import { fetchCourseLectureStats } from '../../services/courseLecturesService';
import { normalizeSlug, SLUG_REGEX } from '../../lib/slug';
import {
  COURSE_TRANSLATION_SPECS,
  getMissingTranslations,
} from '../../i18n/content.js';
import TranslationTabs from './components/TranslationTabs';

const EMPTY_FORM = {
  name: '',
  name_en: '',
  name_tr: '',
  slug: '',
  short_description: '',
  short_description_en: '',
  short_description_tr: '',
  long_description: '',
  long_description_en: '',
  long_description_tr: '',
  price: '',
  price_en: '',
  price_tr: '',
  is_free: false,
  image_url: '',
  image_path: '',
  learning_outcomes: [],
  learning_outcomes_en: [],
  learning_outcomes_tr: [],
  sort_order: 0,
  is_published: true,
  teacher_name: '',
  teacher_name_latin: '',
};

export default function CourseFormModal({ course, onClose, onSaved }) {
  const isEdit = Boolean(course);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(
    course
      ? {
          name: course.name ?? '',
          name_en: course.name_en ?? '',
          name_tr: course.name_tr ?? '',
          slug: course.slug ?? '',
          short_description: course.short_description ?? '',
          short_description_en: course.short_description_en ?? '',
          short_description_tr: course.short_description_tr ?? '',
          long_description: course.long_description ?? '',
          long_description_en: course.long_description_en ?? '',
          long_description_tr: course.long_description_tr ?? '',
          price: course.price ?? '',
          price_en: course.price_en ?? '',
          price_tr: course.price_tr ?? '',
          is_free: course.is_free ?? false,
          image_url: course.image_url ?? '',
          image_path: course.image_path ?? '',
          learning_outcomes: Array.isArray(course.learning_outcomes) ? course.learning_outcomes : [],
          learning_outcomes_en: Array.isArray(course.learning_outcomes_en) ? course.learning_outcomes_en : [],
          learning_outcomes_tr: Array.isArray(course.learning_outcomes_tr) ? course.learning_outcomes_tr : [],
          sort_order: course.sort_order ?? 0,
          is_published: course.is_published ?? true,
          teacher_name: course.teacher_name ?? '',
          teacher_name_latin: course.teacher_name_latin ?? '',
        }
      : { ...EMPTY_FORM }
  );

  const [activeLang, setActiveLang] = useState('ar');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(course?.image_url ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [lectureLock, setLectureLock] = useState(() => ({
    loading: Boolean(course?.id),
    count: 0,
    error: '',
  }));

  useEffect(() => {
    setActiveLang('ar');
  }, [course?.id]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    let active = true;

    if (!course?.id) return undefined;

    const loadLectureLock = async () => {
      try {
        const stats = await fetchCourseLectureStats(course.id);
        if (!active) return;

        setLectureLock({ loading: false, count: stats.total ?? 0, error: '' });
      } catch (lockError) {
        console.error(lockError);
        if (!active) return;

        setLectureLock({
          loading: false,
          count: 0,
          error: 'تعذر التحقق من وجود محاضرات لهذه الدورة حالياً. أبقينا نوع الدورة مقفلاً حتى لا يتغير بالخطأ.',
        });
      }
    };

    loadLectureLock();

    return () => {
      active = false;
    };
  }, [course?.id]);

  const { missingEn, missingTr } = getMissingTranslations(form, COURSE_TRANSLATION_SPECS);

  const isCourseTypeLocked = Boolean(course?.id) && (
    lectureLock.loading ||
    lectureLock.count > 0 ||
    Boolean(lectureLock.error)
  );

  const courseTypeHint = !course?.id
    ? 'اختر الآن ما إذا كانت الدورة مجانية أو مدفوعة. بعد إضافة أول محاضرة سيتم قفل هذا الخيار.'
    : lectureLock.loading
      ? 'جارٍ التحقق من وجود محاضرات لهذه الدورة...'
      : lectureLock.error ||
        (lectureLock.count > 0
          ? 'لا يمكن تغيير نوع الدورة بعد إنشاء محاضرات. إذا احتجت نوعاً مختلفاً فأنشئ دورة جديدة.'
          : 'يمكنك التبديل بين المجاني والمدفوع قبل إضافة أي محاضرة فقط.');

  const courseTypeHintColor = lectureLock.error
    ? 'var(--admin-danger)'
    : isCourseTypeLocked
      ? 'var(--admin-gold)'
      : 'var(--admin-muted)';

  const handleField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  // Learning Outcomes handlers (Dynamic array of strings per language)
  const addOutcome = (field = 'learning_outcomes') => {
    setForm((prev) => ({
      ...prev,
      [field]: [...(prev[field] ?? []), ''],
    }));
  };

  const updateOutcome = (field, index, value) => {
    setForm((prev) => {
      const nextOutcomes = [...(prev[field] ?? [])];
      nextOutcomes[index] = value;
      return { ...prev, [field]: nextOutcomes };
    });
  };

  const removeOutcome = (field, index) => {
    setForm((prev) => ({
      ...prev,
      [field]: (prev[field] ?? []).filter((_, idx) => idx !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setActiveLang('ar');
      setError('يرجى إدخال اسم الدورة باللغة العربية.');
      return;
    }

    if (!form.short_description.trim()) {
      setActiveLang('ar');
      setError('يرجى إدخال الوصف القصير باللغة العربية.');
      return;
    }

    if (!SLUG_REGEX.test(form.slug)) {
      setError('الرابط المختصر (slug) يجب أن يحتوي على حروف إنجليزية صغيرة وأرقام وواصلات فقط (مثال: tajweed-diploma).');
      return;
    }

    setSaving(true);
    let uploadedImage;

    try {
      if (isEdit && form.is_free !== Boolean(course.is_free)) {
        const stats = await fetchCourseLectureStats(course.id);

        if ((stats.total ?? 0) > 0) {
          throw new Error('لا يمكن تغيير نوع الدورة بعد إنشاء محاضرات. أنشئ دورة جديدة إذا كنت بحاجة إلى نوع مختلف.');
        }
      }

      const cleanedOutcomesAr = (form.learning_outcomes ?? [])
        .map((x) => x.trim())
        .filter((x) => x !== '');
      const cleanedOutcomesEn = (form.learning_outcomes_en ?? [])
        .map((x) => x.trim())
        .filter((x) => x !== '');
      const cleanedOutcomesTr = (form.learning_outcomes_tr ?? [])
        .map((x) => x.trim())
        .filter((x) => x !== '');

      let payload = {
        ...form,
        name: form.name.trim(),
        name_en: form.name_en.trim() || null,
        name_tr: form.name_tr.trim() || null,
        short_description: form.short_description.trim(),
        short_description_en: form.short_description_en.trim() || null,
        short_description_tr: form.short_description_tr.trim() || null,
        long_description_en: form.long_description_en.trim() || null,
        long_description_tr: form.long_description_tr.trim() || null,
        price_en: form.price_en.trim() || null,
        price_tr: form.price_tr.trim() || null,
        teacher_name: typeof form.teacher_name === 'string' ? form.teacher_name.trim() : form.teacher_name,
        teacher_name_latin: form.teacher_name_latin.trim() || null,
        learning_outcomes: cleanedOutcomesAr,
        learning_outcomes_en: cleanedOutcomesEn.length > 0 ? cleanedOutcomesEn : null,
        learning_outcomes_tr: cleanedOutcomesTr.length > 0 ? cleanedOutcomesTr : null,
      };

      // 1. Upload cover image if a new file is chosen
      if (imageFile) {
        // If there was an old image, delete it from storage first
        if (course?.image_path) {
          try {
            await deleteCourseImage(course.image_path);
          } catch (storageErr) {
            console.warn('Failed to delete old image from storage:', storageErr);
          }
        }

        uploadedImage = await uploadCourseImage(imageFile);
        payload.image_url = uploadedImage.image_url;
        payload.image_path = uploadedImage.image_path;
      }

      // Pricing values cleanup
      if (payload.is_free) {
        payload.price = '';
        payload.price_en = null;
        payload.price_tr = null;
      }

      const saved = isEdit
        ? await updateCourse(course.id, payload)
        : await createCourse(payload);

      onSaved(saved);
      onClose();
    } catch (err) {
      console.error(err);
      if (err.message && err.message.includes('duplicate key value violates unique constraint')) {
        setError('الرابط المختصر للصفحة (slug) مستخدم بالفعل لدورة أخرى. يرجى كتابة رابط فريد.');
      } else {
        setError(err.message ?? 'حدث خطأ أثناء حفظ الدورة.');
      }
    } finally {
      setSaving(false);
    }
  };

  const langSuffix = activeLang === 'ar' ? '' : `_${activeLang}`;
  const langLabel = activeLang === 'en' ? 'English' : 'Türkçe';
  const outcomesField = activeLang === 'ar' ? 'learning_outcomes' : `learning_outcomes${langSuffix}`;
  const activeOutcomes = form[outcomesField] ?? [];

  return (
    <div
      className="admin-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'تعديل دورة' : 'إضافة دورة جديدة'}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="admin-modal admin-modal--wide">
        {/* Header */}
        <div className="admin-modal-header">
          <h2 className="admin-modal-title">
            {isEdit ? 'تعديل بيانات الدورة' : 'إضافة دورة جديدة'}
          </h2>
          <button
            id="admin-modal-close-btn"
            className="admin-modal-close"
            onClick={onClose}
            aria-label="إغلاق"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="admin-modal-body" id="course-form">
          {/* Cover image upload */}
          <div className="admin-field-group">
            <label className="admin-label">صورة غلاف الدورة</label>
            <div className="admin-photo-upload" style={{ margin: '0 auto 1.5rem', width: '100%', maxWidth: '360px' }}>
              <div
                className="admin-photo-preview"
                style={{ width: '100%', height: '180px', borderRadius: '16px' }}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') fileInputRef.current?.click(); }}
                aria-label="رفع صورة الدورة"
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="معاينة الصورة" className="admin-photo-img" style={{ borderRadius: '16px' }} />
                ) : (
                  <div className="admin-photo-placeholder">
                    <Upload size={28} />
                    <span>رفع صورة الغلاف</span>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                className="admin-hidden-input"
                id="course-image-input"
                style={{ display: 'none' }}
              />
              {imagePreview && (
                <button
                  type="button"
                  className="admin-photo-clear"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview(null);
                    handleField('image_url', '');
                    handleField('image_path', '');
                  }}
                >
                  إزالة الصورة
                </button>
              )}
            </div>
          </div>

          {/* Slug (Non-translatable) */}
          <div className="admin-field-group">
            <label htmlFor="course-slug" className="admin-label">الرابط المختصر للصفحة (slug) *</label>
            <input
              id="course-slug"
              type="text"
              className="admin-input"
              value={form.slug}
              onChange={(e) => handleField('slug', normalizeSlug(e.target.value))}
              placeholder="مثال: tajweed-diploma"
              dir="ltr"
              required
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginTop: '0.25rem' }}>
              رابط الصفحة المخصصة سيكون: /quran/courses/tajweed-diploma
            </p>
          </div>

          {/* Image URL (Non-translatable optional external fallback override) */}
          <div className="admin-field-group">
            <label htmlFor="course-image-url" className="admin-label">رابط صورة خارجي (بديل/اختياري)</label>
            <input
              id="course-image-url"
              type="text"
              className="admin-input"
              value={form.image_url}
              onChange={(e) => {
                handleField('image_url', e.target.value);
                setImagePreview(e.target.value);
              }}
              placeholder="https://example.com/image.jpg"
              dir="ltr"
            />
          </div>

          {/* Is Free toggle (Non-translatable) */}
          <div className="admin-field-group">
            <label className="admin-checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                id="course-is-free"
                checked={form.is_free}
                onChange={(e) => handleField('is_free', e.target.checked)}
                disabled={isCourseTypeLocked}
                style={{ width: '1.1rem', height: '1.1rem', accentColor: 'var(--admin-accent)' }}
              />
              <span>هذه الدورة مجانية بالكامل</span>
            </label>
            <p className="admin-field-hint" style={{ lineHeight: 1.8, color: courseTypeHintColor }}>
              {courseTypeHint}
            </p>
          </div>

          <TranslationTabs
            activeLang={activeLang}
            onChange={setActiveLang}
            missingEn={missingEn}
            missingTr={missingTr}
          />

          {activeLang === 'ar' ? (
            <>
              {/* Name (AR) */}
              <div className="admin-field-group">
                <label htmlFor="course-name" className="admin-label">اسم الدورة / المبادرة *</label>
                <input
                  id="course-name"
                  type="text"
                  className="admin-input"
                  value={form.name}
                  onChange={(e) => handleField('name', e.target.value)}
                  placeholder="مثال: دبلوم إتقان التجويد..."
                  required
                />
              </div>

              {/* Teacher Name (AR) */}
              <div className="admin-field-group">
                <label htmlFor="course-teacher-name" className="admin-label">اسم الشيخ</label>
                <input
                  id="course-teacher-name"
                  type="text"
                  className="admin-input"
                  value={form.teacher_name}
                  onChange={(e) => handleField('teacher_name', e.target.value)}
                  placeholder="اسم الشيخ..."
                />
              </div>

              {/* Short Description (AR) */}
              <div className="admin-field-group">
                <label htmlFor="course-short-desc" className="admin-label">الوصف القصير *</label>
                <textarea
                  id="course-short-desc"
                  className="admin-input admin-textarea"
                  value={form.short_description}
                  onChange={(e) => handleField('short_description', e.target.value)}
                  placeholder="يظهر في بطاقة الدورة في صفحة قائمة الدورات (حد أقصى سطرين)..."
                  rows={2}
                  required
                />
              </div>

              {/* Long Description (AR) */}
              <div className="admin-field-group">
                <label htmlFor="course-long-desc" className="admin-label">الوصف التفصيلي (صفحة التفاصيل)</label>
                <textarea
                  id="course-long-desc"
                  className="admin-input admin-textarea"
                  value={form.long_description}
                  onChange={(e) => handleField('long_description', e.target.value)}
                  placeholder="الوصف الكامل للدورة، المتطلبات، المنهج، وتفاصيل الحصص..."
                  rows={5}
                />
              </div>

              {/* Price (AR) */}
              {!form.is_free && (
                <div className="admin-field-group">
                  <label htmlFor="course-price" className="admin-label">سعر الاشتراك / الرسوم</label>
                  <input
                    id="course-price"
                    type="text"
                    className="admin-input"
                    value={form.price}
                    onChange={(e) => handleField('price', e.target.value)}
                    placeholder="مثال: ٢٥٠ جنيه / شهرياً"
                  />
                </div>
              )}

              {/* Learning Outcomes (AR) */}
              <div className="admin-field-group" style={{ gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <label className="admin-label">مخرجات التعلم والمهارات المكتسبة</label>
                  <button
                    type="button"
                    onClick={() => addOutcome('learning_outcomes')}
                    className="admin-btn admin-btn--ghost admin-btn--sm"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <Plus size={14} />
                    إضافة مخرج
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {activeOutcomes.map((outcome, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="admin-input"
                        value={outcome}
                        onChange={(e) => updateOutcome('learning_outcomes', idx, e.target.value)}
                        placeholder="مثال: إتقان مخارج الحروف والصفات..."
                      />
                      <button
                        type="button"
                        onClick={() => removeOutcome('learning_outcomes', idx)}
                        className="admin-icon-btn admin-icon-btn--delete"
                        style={{ flexShrink: 0 }}
                        aria-label="حذف المخرج"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {activeOutcomes.length === 0 && (
                    <p className="admin-muted" style={{ fontSize: '0.8rem', textAlign: 'center', padding: '1rem', border: '1px dashed var(--admin-border)', borderRadius: '8px' }}>
                      لم يتم إضافة أي مخرج تعليمي بعد. أضف بعض النقاط لتظهر في صفحة التفاصيل.
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div dir="ltr" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Name (EN/TR) */}
              <div className="admin-field-group">
                <label htmlFor={`course-name-${activeLang}`} className="admin-label" dir="rtl">
                  اسم الدورة ({langLabel})
                </label>
                {form.name.trim() && (
                  <p className="admin-field-hint" dir="rtl">النص العربي: {form.name}</p>
                )}
                <input
                  id={`course-name-${activeLang}`}
                  type="text"
                  className="admin-input"
                  value={form[`name${langSuffix}`]}
                  onChange={(e) => handleField(`name${langSuffix}`, e.target.value)}
                  placeholder={activeLang === 'en' ? 'e.g. Tajweed Mastery Diploma' : 'Örn: Tecvid Uzmanlık Programı'}
                />
              </div>

              {/* Teacher Name (Latin — shared EN & TR) */}
              <div className="admin-field-group">
                <label htmlFor="course-teacher-name-latin" className="admin-label" dir="rtl">
                  اسم الشيخ بالحروف اللاتينية (مشترك للإنجليزية والتركية)
                </label>
                {form.teacher_name.trim() && (
                  <p className="admin-field-hint" dir="rtl">النص العربي: {form.teacher_name}</p>
                )}
                <input
                  id="course-teacher-name-latin"
                  type="text"
                  className="admin-input"
                  value={form.teacher_name_latin}
                  onChange={(e) => handleField('teacher_name_latin', e.target.value)}
                  placeholder="e.g. Sheikh Muhammad"
                />
              </div>

              {/* Short Description (EN/TR) */}
              <div className="admin-field-group">
                <label htmlFor={`course-short-desc-${activeLang}`} className="admin-label" dir="rtl">
                  الوصف القصير ({langLabel})
                </label>
                <textarea
                  id={`course-short-desc-${activeLang}`}
                  className="admin-input admin-textarea"
                  value={form[`short_description${langSuffix}`]}
                  onChange={(e) => handleField(`short_description${langSuffix}`, e.target.value)}
                  placeholder={activeLang === 'en' ? 'Short course summary for cards...' : 'Kurs kartı için kısa açıklama...'}
                  rows={2}
                />
              </div>

              {/* Long Description (EN/TR) */}
              <div className="admin-field-group">
                <label htmlFor={`course-long-desc-${activeLang}`} className="admin-label" dir="rtl">
                  الوصف التفصيلي ({langLabel})
                </label>
                <textarea
                  id={`course-long-desc-${activeLang}`}
                  className="admin-input admin-textarea"
                  value={form[`long_description${langSuffix}`]}
                  onChange={(e) => handleField(`long_description${langSuffix}`, e.target.value)}
                  placeholder={activeLang === 'en' ? 'Full course details, curriculum, and requirements...' : 'Kursun ayrıntılı açıklaması ve müfredatı...'}
                  rows={5}
                />
              </div>

              {/* Price (EN/TR) */}
              {!form.is_free && (
                <div className="admin-field-group">
                  <label htmlFor={`course-price-${activeLang}`} className="admin-label" dir="rtl">
                    سعر الاشتراك / الرسوم ({langLabel})
                  </label>
                  {form.price.trim() && (
                    <p className="admin-field-hint" dir="rtl">النص العربي: {form.price}</p>
                  )}
                  <input
                    id={`course-price-${activeLang}`}
                    type="text"
                    className="admin-input"
                    value={form[`price${langSuffix}`]}
                    onChange={(e) => handleField(`price${langSuffix}`, e.target.value)}
                    placeholder={activeLang === 'en' ? 'e.g. $25 / month' : 'Örn: Aylık 750 TL'}
                  />
                </div>
              )}

              {/* Learning Outcomes (EN/TR) */}
              <div className="admin-field-group" style={{ gap: '0.75rem' }}>
                <div
                  dir="rtl"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}
                >
                  <label className="admin-label">مخرجات التعلم ({langLabel})</label>
                  <button
                    type="button"
                    onClick={() => addOutcome(outcomesField)}
                    className="admin-btn admin-btn--ghost admin-btn--sm"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <Plus size={14} />
                    إضافة مخرج
                  </button>
                </div>

                {form.learning_outcomes.length > 0 && (
                  <div className="admin-field-hint" dir="rtl">
                    المخرجات العربية ({form.learning_outcomes.length}): {form.learning_outcomes.filter(Boolean).join(' • ')}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {activeOutcomes.map((outcome, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="admin-input"
                        value={outcome}
                        onChange={(e) => updateOutcome(outcomesField, idx, e.target.value)}
                        placeholder={activeLang === 'en' ? 'e.g. Master Arabic letter articulation points' : 'Örn: Harflerin mahreçlerini doğru telaffuz etme'}
                      />
                      <button
                        type="button"
                        onClick={() => removeOutcome(outcomesField, idx)}
                        className="admin-icon-btn admin-icon-btn--delete"
                        style={{ flexShrink: 0 }}
                        aria-label="حذف المخرج"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {activeOutcomes.length === 0 && (
                    <p
                      dir="rtl"
                      className="admin-muted"
                      style={{ fontSize: '0.8rem', textAlign: 'center', padding: '1rem', border: '1px dashed var(--admin-border)', borderRadius: '8px' }}
                    >
                      لم يتم إضافة مخرجات بهذه اللغة بعد. عند تركها فارغة ستظهر المخرجات العربية تلقائياً.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Sort order & Published */}
          <div className="admin-field-row" style={{ display: 'flex', gap: '1rem' }}>
            <div className="admin-field-group" style={{ flex: 1 }}>
              <label htmlFor="course-sort" className="admin-label">ترتيب العرض</label>
              <input
                id="course-sort"
                type="number"
                className="admin-input"
                value={form.sort_order}
                onChange={(e) => handleField('sort_order', parseInt(e.target.value) || 0)}
                min={0}
              />
            </div>

            <div className="admin-field-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <label className="admin-checkbox-label" style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) => handleField('is_published', e.target.checked)}
                  style={{ width: '1.1rem', height: '1.1rem', accentColor: 'var(--admin-accent)' }}
                  id="course-published"
                />
                <span>منشورة (تظهر في الموقع العام)</span>
              </label>
            </div>
          </div>

          {error && (
            <div className="admin-error-banner" role="alert" style={{ background: 'rgba(248,81,73,0.15)', color: 'var(--admin-danger)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(248,81,73,0.2)' }}>
              ⚠️ {error}
            </div>
          )}

          {/* Actions */}
          <div className="admin-modal-actions">
            <button
              type="button"
              id="course-form-cancel-btn"
              className="admin-btn admin-btn--ghost"
              onClick={onClose}
              disabled={saving}
            >
              إلغاء
            </button>
            <button
              type="submit"
              id="course-form-save-btn"
              className="admin-btn admin-btn--primary"
              disabled={saving}
            >
              {saving ? <Loader size={16} className="admin-spin" /> : null}
              {saving ? 'جارٍ الحفظ…' : (isEdit ? 'حفظ التعديلات' : 'إضافة الدورة')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
