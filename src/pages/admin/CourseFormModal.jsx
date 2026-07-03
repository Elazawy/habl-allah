import { useEffect, useRef, useState } from 'react';
import { X, Upload, Loader, Plus, Trash2 } from 'lucide-react';
import { createCourse, updateCourse, uploadCourseImage, deleteCourseImage } from '../../services/coursesService';
import { fetchCourseLectureStats } from '../../services/courseLecturesService';
import { normalizeSlug, SLUG_REGEX } from '../../lib/slug';

const EMPTY_FORM = {
  name: '',
  slug: '',
  short_description: '',
  long_description: '',
  price: '',
  is_free: false,
  image_url: '',
  image_path: '',
  learning_outcomes: [],
  sort_order: 0,
  is_published: true,
};

export default function CourseFormModal({ course, onClose, onSaved }) {
  const isEdit = Boolean(course);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(
    course
      ? {
          name: course.name ?? '',
          slug: course.slug ?? '',
          short_description: course.short_description ?? '',
          long_description: course.long_description ?? '',
          price: course.price ?? '',
          is_free: course.is_free ?? false,
          image_url: course.image_url ?? '',
          image_path: course.image_path ?? '',
          learning_outcomes: Array.isArray(course.learning_outcomes) ? course.learning_outcomes : [],
          sort_order: course.sort_order ?? 0,
          is_published: course.is_published ?? true,
        }
      : { ...EMPTY_FORM }
  );

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(course?.image_url ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [lectureLock, setLectureLock] = useState(() => ({
    loading: Boolean(course?.id),
    count: 0,
    error: '',
  }));

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

  // Learning Outcomes handlers (Dynamic array of strings)
  const addOutcome = () => {
    setForm((prev) => ({
      ...prev,
      learning_outcomes: [...prev.learning_outcomes, ''],
    }));
  };

  const updateOutcome = (index, value) => {
    setForm((prev) => {
      const nextOutcomes = [...prev.learning_outcomes];
      nextOutcomes[index] = value;
      return { ...prev, learning_outcomes: nextOutcomes };
    });
  };

  const removeOutcome = (index) => {
    setForm((prev) => ({
      ...prev,
      learning_outcomes: prev.learning_outcomes.filter((_, idx) => idx !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

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

      let payload = { ...form };

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

      // Format Outcomes (Filter out empty bullets)
      payload.learning_outcomes = payload.learning_outcomes
        .map((x) => x.trim())
        .filter((x) => x !== '');

      // Pricing values cleanup
      if (payload.is_free) {
        payload.price = '';
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
                style={{ height: '180px', borderRadius: '16px' }}
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

          {/* Name */}
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

          {/* Slug */}
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

          {/* Image URL (Optional external fallback override) */}
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

          {/* Short Description */}
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

          {/* Long Description */}
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

          {/* Is Free & Price Row */}
          <div className="admin-field-row" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div className="admin-field-group" style={{ flex: 1 }}>
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
            
            {!form.is_free && (
              <div className="admin-field-group" style={{ flex: 2 }}>
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
          </div>

          {/* Learning Outcomes (Dynamic list) */}
          <div className="admin-field-group" style={{ gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="admin-label">مخرجات التعلم والمهارات المكتسبة</label>
              <button
                type="button"
                onClick={addOutcome}
                className="admin-btn admin-btn--ghost admin-btn--sm"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', display: 'flex', items: 'center', gap: '0.25rem' }}
              >
                <Plus size={14} />
                إضافة مخرج
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {form.learning_outcomes.map((outcome, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="admin-input"
                    value={outcome}
                    onChange={(e) => updateOutcome(idx, e.target.value)}
                    placeholder="مثال: إتقان مخارج الحروف والصفات..."
                  />
                  <button
                    type="button"
                    onClick={() => removeOutcome(idx)}
                    className="admin-icon-btn admin-icon-btn--delete"
                    style={{ flexShrink: 0 }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {form.learning_outcomes.length === 0 && (
                <p className="admin-muted" style={{ fontSize: '0.8rem', textAlign: 'center', padding: '1rem', border: '1px dashed var(--admin-border)', borderRadius: '8px' }}>
                  لم يتم إضافة أي مخرج تعليمي بعد. أضف بعض النقاط لتظهر في صفحة التفاصيل.
                </p>
              )}
            </div>
          </div>

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
