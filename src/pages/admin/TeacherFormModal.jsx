import { useEffect, useRef, useState } from 'react';
import { X, Upload, Loader } from 'lucide-react';
import {
  createTeacher,
  updateTeacher,
  uploadTeacherPhoto,
} from '../../services/adminService';

const EMPTY_FORM = {
  name: '',
  gender: 'male',
  bio: '',
  photo_url: '',
  recitation_url: '',
  recitation_type: '',
};

export default function TeacherFormModal({ teacher, onClose, onSaved }) {
  const [form, setForm] = useState(teacher ? {
    name: teacher.name ?? '',
    gender: teacher.gender ?? 'male',
    bio: teacher.bio ?? '',
    photo_url: teacher.photo_url ?? '',
    recitation_url: teacher.recitation_url ?? '',
    recitation_type: teacher.recitation_type ?? '',
  } : EMPTY_FORM);

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(teacher?.photo_url ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const isEdit = Boolean(teacher);

  // Trap focus inside modal
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      let payload = { ...form };

      // Upload photo if a new file was selected
      if (photoFile) {
        const photoUrl = await uploadTeacherPhoto(photoFile, teacher?.id);
        payload.photo_url = photoUrl;
      }

      // Clean up empty strings → null
      if (!payload.recitation_type) payload.recitation_type = null;
      if (!payload.recitation_url) payload.recitation_url = null;
      if (!payload.photo_url) payload.photo_url = null;

      const saved = isEdit
        ? await updateTeacher(teacher.id, payload)
        : await createTeacher(payload);

      onSaved(saved);
      onClose();
    } catch (err) {
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
      aria-label={isEdit ? 'تعديل معلم' : 'إضافة معلم جديد'}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="admin-modal">
        {/* Header */}
        <div className="admin-modal-header">
          <h2 className="admin-modal-title">
            {isEdit ? 'تعديل بيانات المعلم' : 'إضافة معلم جديد'}
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

        <form onSubmit={handleSubmit} className="admin-modal-body" id="teacher-form">
          {/* Photo upload */}
          <div className="admin-photo-upload">
            <div
              className="admin-photo-preview"
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') fileInputRef.current?.click(); }}
              aria-label="رفع صورة المعلم"
            >
              {photoPreview ? (
                <img src={photoPreview} alt="معاينة الصورة" className="admin-photo-img" />
              ) : (
                <div className="admin-photo-placeholder">
                  <Upload size={28} />
                  <span>رفع صورة</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange}
              className="admin-hidden-input"
              id="teacher-photo-input"
            />
            {photoPreview && (
              <button
                type="button"
                className="admin-photo-clear"
                onClick={() => { setPhotoFile(null); setPhotoPreview(null); handleField('photo_url', ''); }}
              >
                إزالة الصورة
              </button>
            )}
          </div>

          {/* Name */}
          <div className="admin-field-group">
            <label htmlFor="teacher-name" className="admin-label">الاسم *</label>
            <input
              id="teacher-name"
              type="text"
              className="admin-input"
              value={form.name}
              onChange={(e) => handleField('name', e.target.value)}
              placeholder="الشيخ / الأستاذة …"
              required
            />
          </div>

          {/* Gender */}
          <div className="admin-field-group">
            <label className="admin-label">النوع *</label>
            <div className="admin-radio-group">
              {[{ val: 'male', label: 'معلم' }, { val: 'female', label: 'معلمة' }].map(({ val, label }) => (
                <label key={val} className="admin-radio-label">
                  <input
                    type="radio"
                    name="teacher-gender"
                    value={val}
                    checked={form.gender === val}
                    onChange={() => handleField('gender', val)}
                    className="admin-radio"
                    id={`teacher-gender-${val}`}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Bio */}
          <div className="admin-field-group">
            <label htmlFor="teacher-bio" className="admin-label">النبذة التعريفية</label>
            <textarea
              id="teacher-bio"
              className="admin-input admin-textarea"
              value={form.bio}
              onChange={(e) => handleField('bio', e.target.value)}
              placeholder="اكتب نبذة عن المعلم…"
              rows={4}
            />
          </div>

          {/* Recitation URL */}
          <div className="admin-field-group">
            <label htmlFor="teacher-recitation-url" className="admin-label">رابط التلاوة</label>
            <input
              id="teacher-recitation-url"
              type="url"
              className="admin-input"
              value={form.recitation_url}
              onChange={(e) => handleField('recitation_url', e.target.value)}
              placeholder="https://…"
              dir="ltr"
            />
          </div>

          {/* Recitation type */}
          <div className="admin-field-group">
            <label htmlFor="teacher-recitation-type" className="admin-label">نوع التلاوة</label>
            <select
              id="teacher-recitation-type"
              className="admin-input admin-select"
              value={form.recitation_type}
              onChange={(e) => handleField('recitation_type', e.target.value)}
            >
              <option value="">— بدون —</option>
              <option value="audio">صوت</option>
              <option value="video">فيديو</option>
            </select>
          </div>

          {error && (
            <div className="admin-error-banner" role="alert">⚠️ {error}</div>
          )}

          {/* Actions */}
          <div className="admin-modal-actions">
            <button
              type="button"
              id="teacher-form-cancel-btn"
              className="admin-btn admin-btn--ghost"
              onClick={onClose}
              disabled={saving}
            >
              إلغاء
            </button>
            <button
              type="submit"
              id="teacher-form-save-btn"
              className="admin-btn admin-btn--primary"
              disabled={saving}
            >
              {saving ? <Loader size={16} className="admin-spin" /> : null}
              {saving ? 'جارٍ الحفظ…' : (isEdit ? 'حفظ التعديلات' : 'إضافة المعلم')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
