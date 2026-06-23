import { useEffect, useRef, useState } from 'react';
import { X, Upload, Loader } from 'lucide-react';

const EMPTY_FORM = {
  sort_order: 0,
  is_published: true,
};

export default function ReviewImageFormModal({
  review,
  onClose,
  onSaved,
  onUploadImage,
  onDeleteImage,
  onCreate,
  onUpdate,
  extraPayload = {},
  titleAdd = 'إضافة مراجعة',
  titleEdit = 'تعديل المراجعة',
  helperText = 'ارفع لقطة واتساب بعد إخفاء أي بيانات شخصية (الأرقام، الصور، الأسماء).',
}) {
  const isEdit = Boolean(review);
  const [form, setForm] = useState(
    review
      ? {
          sort_order: review.sort_order ?? 0,
          is_published: review.is_published ?? true,
        }
      : { ...EMPTY_FORM }
  );
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(review?.image_url ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    let uploadedImage = null;
    try {
      const payload = {
        ...extraPayload,
        sort_order: Number(form.sort_order) || 0,
        is_published: Boolean(form.is_published),
      };

      if (imageFile) {
        uploadedImage = await onUploadImage(imageFile);
        payload.image_url = uploadedImage.image_url;
        payload.image_path = uploadedImage.image_path;
      }

      if (!isEdit && !payload.image_url) {
        throw new Error('يرجى رفع صورة المراجعة أولاً');
      }

      const saved = isEdit
        ? await onUpdate(review.id, payload)
        : await onCreate(payload);

      onSaved(saved);

      if (isEdit && uploadedImage && review?.image_path && review.image_path !== uploadedImage.image_path) {
        onDeleteImage(review.image_path).catch((cleanupError) => {
          console.error('[cleanup old review image failed]', cleanupError);
        });
      }

      onClose();
    } catch (err) {
      if (uploadedImage?.image_path) {
        onDeleteImage(uploadedImage.image_path).catch((cleanupError) => {
          console.error('[cleanup new review image failed]', cleanupError);
        });
      }
      console.error(err);
      setError(err.message ?? 'حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="admin-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? titleEdit : titleAdd}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="admin-modal">
        <div className="admin-modal-header">
          <h2 className="admin-modal-title">{isEdit ? titleEdit : titleAdd}</h2>
          <button className="admin-modal-close" onClick={onClose} aria-label="إغلاق">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="admin-modal-body" id="review-image-form">
          <div className="admin-photo-upload">
            <div
              className="w-full rounded-xl border border-dashed cursor-pointer overflow-hidden flex items-center justify-center"
              style={{ borderColor: 'var(--admin-border)', minHeight: 180, backgroundColor: '#0b141a' }}
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') inputRef.current?.click(); }}
              aria-label="رفع صورة المراجعة"
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="معاينة المراجعة"
                  className="w-full h-[420px] object-contain"
                />
              ) : (
                <div className="h-[200px] flex flex-col items-center justify-center gap-2" style={{ color: 'var(--admin-muted)' }}>
                  <Upload size={26} />
                  <span className="text-sm font-semibold">رفع صورة المراجعة</span>
                </div>
              )}
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
              onChange={handleImageChange}
              className="admin-hidden-input"
              id="review-image-input"
            />

            <p className="admin-field-hint text-center" style={{ lineHeight: 1.8 }}>
              {helperText}
            </p>
          </div>

          <div className="admin-field-row">
            <div className="admin-field-group" style={{ flex: 1 }}>
              <label htmlFor="review-sort" className="admin-label">الترتيب</label>
              <input
                id="review-sort"
                type="number"
                className="admin-input"
                value={form.sort_order}
                onChange={(e) => handleField('sort_order', parseInt(e.target.value, 10) || 0)}
                min={0}
              />
            </div>
            <div className="admin-field-group" style={{ flex: 1 }}>
              <label className="admin-label">الحالة</label>
              <label className="admin-checkbox-label">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) => handleField('is_published', e.target.checked)}
                  className="admin-checkbox"
                  id="review-published"
                />
                <span>منشور</span>
              </label>
            </div>
          </div>

          {error && (
            <div className="admin-error-banner" role="alert">⚠️ {error}</div>
          )}

          <div className="admin-modal-actions">
            <button
              type="button"
              className="admin-btn admin-btn--ghost"
              onClick={onClose}
              disabled={saving}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="admin-btn admin-btn--primary"
              disabled={saving}
            >
              {saving ? <Loader size={16} className="admin-spin" /> : null}
              {saving ? 'جارٍ الحفظ…' : (isEdit ? 'حفظ التعديلات' : 'إضافة المراجعة')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
