import { useEffect, useState } from 'react';
import { X, Loader, Plus, Trash2 } from 'lucide-react';
import { createCompetition, updateCompetition } from '../../services/competitionsService';

const EMPTY_FORM = {
  name: '',
  slug: '',
  short_description: '',
  complete_description: '',
  start_date: '',
  registration_deadline: '',
  awards_short_description: '',
  awards_complete_description: '',
  participation_terms: '',
  sort_order: 0,
  is_published: true,
  available_levels: [],
};

function formatDateForDisplay(value) {
  if (!value) return '';

  const [year, month, day] = String(value).split('-');
  if (!year || !month || !day) return value;

  return `${day}/${month}/${year}`;
}

function normalizeDateInput(value) {
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function parseDisplayDate(value) {
  const normalized = normalizeDateInput(value);

  if (normalized.length !== 10) {
    return null;
  }

  const [day, month, year] = normalized.split('/');
  const parsedDay = Number(day);
  const parsedMonth = Number(month);
  const parsedYear = Number(year);

  if (
    !Number.isInteger(parsedDay) ||
    !Number.isInteger(parsedMonth) ||
    !Number.isInteger(parsedYear) ||
    parsedMonth < 1 ||
    parsedMonth > 12 ||
    parsedDay < 1 ||
    parsedDay > 31 ||
    year.length !== 4
  ) {
    return null;
  }

  const date = new Date(Date.UTC(parsedYear, parsedMonth - 1, parsedDay));
  if (
    date.getUTCFullYear() !== parsedYear ||
    date.getUTCMonth() + 1 !== parsedMonth ||
    date.getUTCDate() !== parsedDay
  ) {
    return null;
  }

  return `${year}-${month}-${day}`;
}

export default function CompetitionFormModal({ competition, onClose, onSaved }) {
  const isEdit = Boolean(competition);
  const [form, setForm] = useState(
    competition
      ? {
          name: competition.name ?? '',
          slug: competition.slug ?? '',
          short_description: competition.short_description ?? '',
          complete_description: competition.complete_description ?? '',
          start_date: formatDateForDisplay(competition.start_date),
          registration_deadline: formatDateForDisplay(competition.registration_deadline),
          awards_short_description: competition.awards_short_description ?? '',
          awards_complete_description: competition.awards_complete_description ?? '',
          participation_terms: competition.participation_terms ?? '',
          sort_order: competition.sort_order ?? 0,
          is_published: competition.is_published ?? true,
          available_levels: Array.isArray(competition.available_levels) ? competition.available_levels : [],
        }
      : EMPTY_FORM
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Handle escape key to close
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Levels handlers (Dynamic array of strings)
  const addLevel = () => {
    setForm((prev) => ({
      ...prev,
      available_levels: [...(prev.available_levels ?? []), ''],
    }));
  };

  const updateLevel = (index, value) => {
    setForm((prev) => {
      const nextLevels = [...(prev.available_levels ?? [])];
      nextLevels[index] = value;
      return { ...prev, available_levels: nextLevels };
    });
  };

  const removeLevel = (index) => {
    setForm((prev) => ({
      ...prev,
      available_levels: (prev.available_levels ?? []).filter((_, idx) => idx !== index),
    }));
  };

  const handleField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate slug: lowercase English letters, numbers, and hyphens only
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(form.slug)) {
      setError('الرابط المختصر للصفحة يجب أن يحتوي على حروف إنجليزية صغيرة وأرقام وواصلات فقط (مثال: my-competition-2026).');
      return;
    }

    const startDateIso = parseDisplayDate(form.start_date);
    const registrationDeadlineIso = parseDisplayDate(form.registration_deadline);

    if (!startDateIso || !registrationDeadlineIso) {
      setError('يرجى إدخال التواريخ بصيغة يوم/شهر/سنة مثل 25/08/2026.');
      return;
    }

    // Validate dates: registration_deadline <= start_date
    if (registrationDeadlineIso > startDateIso) {
      setError('آخر موعد للتسجيل يجب أن يكون قبل أو يساوي تاريخ بدء المسابقة.');
      return;
    }

    setSaving(true);
    try {
      const cleanedLevels = (form.available_levels ?? [])
        .map((x) => x.trim())
        .filter((x) => x !== '');
      const uniqueLevels = Array.from(new Set(cleanedLevels));

      const payload = {
        ...form,
        start_date: startDateIso,
        registration_deadline: registrationDeadlineIso,
        sort_order: parseInt(form.sort_order) || 0,
        available_levels: uniqueLevels,
      };

      const saved = isEdit
        ? await updateCompetition(competition.id, payload)
        : await createCompetition(payload);

      onSaved(saved);
      onClose();
    } catch (err) {
      console.error(err);
      if (err.message && err.message.includes('duplicate key value violates unique constraint')) {
        setError('الرابط المختصر للصفحة مستخدم بالفعل في مسابقة أخرى. يرجى اختيار رابط مختلف.');
      } else {
        setError(err.message ?? 'حدث خطأ أثناء الحفظ');
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
      aria-label={isEdit ? 'تعديل مسابقة' : 'إضافة مسابقة جديدة'}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="admin-modal admin-modal--wide">
        {/* Header */}
        <div className="admin-modal-header">
          <h2 className="admin-modal-title">
            {isEdit ? 'تعديل بيانات المسابقة' : 'إضافة مسابقة جديدة'}
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

        <form onSubmit={handleSubmit} className="admin-modal-body" id="competition-form">
          {/* Name */}
          <div className="admin-field-group">
            <label htmlFor="competition-name" className="admin-label">اسم المسابقة *</label>
            <input
              id="competition-name"
              type="text"
              className="admin-input"
              value={form.name}
              onChange={(e) => handleField('name', e.target.value)}
              placeholder="اسم المسابقة..."
              required
            />
          </div>

          {/* Slug */}
          <div className="admin-field-group">
            <label htmlFor="competition-slug" className="admin-label">الرابط المختصر للصفحة (slug) *</label>
            <input
              id="competition-slug"
              type="text"
              className="admin-input"
              value={form.slug}
              onChange={(e) => handleField('slug', e.target.value.toLowerCase())}
              placeholder="competition-slug-here"
              dir="ltr"
              required
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginTop: '0.25rem' }}>
              هذا الجزء يظهر في رابط المسابقة مثل: /quran/competition/hifz-2026
            </p>
          </div>

          {/* Short Description */}
          <div className="admin-field-group">
            <label htmlFor="competition-short-desc" className="admin-label">وصف قصير *</label>
            <textarea
              id="competition-short-desc"
              className="admin-input admin-textarea"
              value={form.short_description}
              onChange={(e) => handleField('short_description', e.target.value)}
              placeholder="يظهر في بطاقات قائمة المسابقات..."
              rows={2}
              required
            />
          </div>

          {/* Complete Description */}
          <div className="admin-field-group">
            <label htmlFor="competition-complete-desc" className="admin-label">نبذة عن المسابقة (الوصف الكامل) *</label>
            <textarea
              id="competition-complete-desc"
              className="admin-input admin-textarea"
              value={form.complete_description}
              onChange={(e) => handleField('complete_description', e.target.value)}
              placeholder="اكتب تفاصيل المسابقة هنا..."
              rows={5}
              required
            />
          </div>

          {/* Date Row (Start date & Deadline) */}
          <div className="admin-field-row">
            <div className="admin-field-group" style={{ flex: 1 }}>
              <label htmlFor="competition-start-date" className="admin-label">تاريخ البدء *</label>
              <input
                id="competition-start-date"
                type="text"
                className="admin-input"
                value={form.start_date}
                onChange={(e) => handleField('start_date', normalizeDateInput(e.target.value))}
                placeholder="dd/mm/yyyy"
                inputMode="numeric"
                dir="ltr"
                autoComplete="off"
                required
              />
              <p className="admin-field-hint">اكتب التاريخ بصيغة يوم/شهر/سنة</p>
            </div>
            <div className="admin-field-group" style={{ flex: 1 }}>
              <label htmlFor="competition-deadline" className="admin-label">آخر موعد للتسجيل *</label>
              <input
                id="competition-deadline"
                type="text"
                className="admin-input"
                value={form.registration_deadline}
                onChange={(e) => handleField('registration_deadline', normalizeDateInput(e.target.value))}
                placeholder="dd/mm/yyyy"
                inputMode="numeric"
                dir="ltr"
                autoComplete="off"
                required
              />
              <p className="admin-field-hint">اكتب التاريخ بصيغة يوم/شهر/سنة</p>
            </div>
          </div>

          {/* Awards Short Description */}
          <div className="admin-field-group">
            <label htmlFor="competition-awards-short" className="admin-label">الجوائز (مختصر)</label>
            <input
              id="competition-awards-short"
              type="text"
              className="admin-input"
              value={form.awards_short_description}
              onChange={(e) => handleField('awards_short_description', e.target.value)}
              placeholder="مثال: جوائز مالية قيمة للعشرة الأوائل"
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginTop: '0.25rem' }}>
              يظهر اختياريًا في بطاقة المسابقة بقائمة المسابقات
            </p>
          </div>

          {/* Awards Complete Description */}
          <div className="admin-field-group">
            <label htmlFor="competition-awards-complete" className="admin-label">تفاصيل الجوائز والتكريم</label>
            <textarea
              id="competition-awards-complete"
              className="admin-input admin-textarea"
              value={form.awards_complete_description}
              onChange={(e) => handleField('awards_complete_description', e.target.value)}
              placeholder="اكتب تفاصيل الجوائز وقيمتها وفئات التكريم..."
              rows={3}
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginTop: '0.25rem' }}>
              يظهر اختياريًا كقسم خاص في صفحة تفاصيل المسابقة
            </p>
          </div>

          {/* Participation Terms */}
          <div className="admin-field-group">
            <label htmlFor="competition-terms" className="admin-label">شروط وأحكام المشاركة *</label>
            <textarea
              id="competition-terms"
              className="admin-input admin-textarea"
              value={form.participation_terms}
              onChange={(e) => handleField('participation_terms', e.target.value)}
              placeholder="مثال: حفظ سورة البقرة كاملاً مع التجويد..."
              rows={4}
              required
            />
          </div>

          {/* Available Levels (Dynamic list) */}
          <div className="admin-field-group" style={{ gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="admin-label">المستويات المتاحة في المسابقة</label>
              <button
                type="button"
                onClick={addLevel}
                className="admin-btn admin-btn--ghost admin-btn--sm"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <Plus size={14} />
                إضافة مستوى
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(form.available_levels ?? []).map((lvl, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="admin-input"
                    value={lvl}
                    onChange={(e) => updateLevel(idx, e.target.value)}
                    placeholder="مثال: مستوى حفظ ثلاثة أجزاء..."
                    required
                  />
                  <button
                    type="button"
                    onClick={() => removeLevel(idx)}
                    className="admin-icon-btn admin-icon-btn--delete"
                    style={{ flexShrink: 0 }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {(form.available_levels ?? []).length === 0 && (
                <p className="admin-muted" style={{ fontSize: '0.8rem', textAlign: 'center', padding: '1rem', border: '1px dashed var(--admin-border)', borderRadius: '8px' }}>
                  إذا لم تُضف مستويات هنا، سيُسمح للطالب بكتابة مستواه يدوياً.
                </p>
              )}
            </div>
          </div>

          {/* Sort order & Published */}
          <div className="admin-field-row">
            <div className="admin-field-group" style={{ flex: 1 }}>
              <label htmlFor="competition-sort" className="admin-label">الترتيب</label>
              <input
                id="competition-sort"
                type="number"
                className="admin-input"
                value={form.sort_order}
                onChange={(e) => handleField('sort_order', parseInt(e.target.value) || 0)}
                min={0}
              />
            </div>
            <div className="admin-field-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <label className="admin-checkbox-label" style={{ marginBottom: '10px' }}>
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) => handleField('is_published', e.target.checked)}
                  className="admin-checkbox"
                  id="competition-published"
                />
                <span>منشورة (تظهر للعامة)</span>
              </label>
            </div>
          </div>

          {error && (
            <div className="admin-error-banner" role="alert">⚠️ {error}</div>
          )}

          {/* Actions */}
          <div className="admin-modal-actions">
            <button
              type="button"
              id="competition-form-cancel-btn"
              className="admin-btn admin-btn--ghost"
              onClick={onClose}
              disabled={saving}
            >
              إلغاء
            </button>
            <button
              type="submit"
              id="competition-form-save-btn"
              className="admin-btn admin-btn--primary"
              disabled={saving}
            >
              {saving ? <Loader size={16} className="admin-spin" /> : null}
              {saving ? 'جارٍ الحفظ…' : (isEdit ? 'حفظ التعديلات' : 'إضافة المسابقة')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
