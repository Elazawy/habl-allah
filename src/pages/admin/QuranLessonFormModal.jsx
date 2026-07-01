import { useEffect, useState } from 'react';
import { X, Loader } from 'lucide-react';
import { addQuranLesson, updateQuranLesson } from '../../services/quranLessonsService';

const EMPTY_LESSON = {
  lesson_date: new Date().toISOString().split('T')[0],
  hijri_date: '',
  recitation_today_surah: '',
  recitation_today_from: '',
  recitation_today_to: '',
  recitation_today_level: 'ممتاز',
  recitation_past_surah: '',
  recitation_past_level: 'ممتاز',
  reading_surah: '',
  reading_from: '',
  reading_to: '',
  reading_level: 'ممتاز',
  tajweed_lesson: '',
  general_notes: '',
  interaction_level: 'ممتاز',
  homework_today_surah: '',
  homework_today_from: '',
  homework_today_to: '',
  homework_past_surah: '',
};

const LEVELS = ['ممتاز', 'جيد جداً', 'جيد', 'مقبول', 'ضعيف'];

export default function QuranLessonFormModal({ lesson, studentId, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_LESSON);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEdit = Boolean(lesson);

  useEffect(() => {
    if (lesson) {
      setForm({
        lesson_date: lesson.lesson_date ?? new Date().toISOString().split('T')[0],
        hijri_date: lesson.hijri_date ?? '',
        recitation_today_surah: lesson.recitation_today_surah ?? '',
        recitation_today_from: lesson.recitation_today_from ?? '',
        recitation_today_to: lesson.recitation_today_to ?? '',
        recitation_today_level: lesson.recitation_today_level ?? 'ممتاز',
        recitation_past_surah: lesson.recitation_past_surah ?? '',
        recitation_past_level: lesson.recitation_past_level ?? 'ممتاز',
        reading_surah: lesson.reading_surah ?? '',
        reading_from: lesson.reading_from ?? '',
        reading_to: lesson.reading_to ?? '',
        reading_level: lesson.reading_level ?? 'ممتاز',
        tajweed_lesson: lesson.tajweed_lesson ?? '',
        general_notes: lesson.general_notes ?? '',
        interaction_level: lesson.interaction_level ?? 'ممتاز',
        homework_today_surah: lesson.homework_today_surah ?? '',
        homework_today_from: lesson.homework_today_from ?? '',
        homework_today_to: lesson.homework_today_to ?? '',
        homework_past_surah: lesson.homework_past_surah ?? '',
      });
    } else {
      setForm({
        ...EMPTY_LESSON,
        lesson_date: new Date().toISOString().split('T')[0],
      });
    }
  }, [lesson]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const payload = { ...form };
      // Clean up empty strings to null or keep them
      Object.keys(payload).forEach((key) => {
        if (typeof payload[key] === 'string' && payload[key].trim() === '') {
          payload[key] = null;
        }
      });

      let saved;
      if (isEdit) {
        saved = await updateQuranLesson(lesson.id, payload);
      } else {
        saved = await addQuranLesson(studentId, payload);
      }

      onSaved(saved);
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message ?? 'حدث خطأ أثناء حفظ الدرس.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="admin-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'تعديل درس القرآن' : 'إضافة درس قرآن جديد'}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="admin-modal" style={{ maxWidth: '700px', width: '90%' }}>
        <div className="admin-modal-header">
          <h2 className="admin-modal-title">
            {isEdit ? 'تعديل تقرير درس القرآن' : 'إضافة تقرير درس قرآن جديد'}
          </h2>
          <button
            id="admin-modal-close-btn"
            className="admin-modal-close"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="admin-modal-body" id="quran-lesson-form" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
          
          {/* Date Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="admin-field-group">
              <label htmlFor="lesson-date" className="admin-label">التاريخ الميلادي *</label>
              <input
                id="lesson-date"
                type="date"
                required
                className="admin-input"
                value={form.lesson_date}
                onChange={(e) => handleChange('lesson_date', e.target.value)}
              />
            </div>
            <div className="admin-field-group">
              <label htmlFor="hijri-date" className="admin-label">التاريخ الهجري (مثال: ٢٣ ذو الحجة ١٤٤٧ هـ)</label>
              <input
                id="hijri-date"
                type="text"
                placeholder="التاريخ الهجري…"
                className="admin-input"
                value={form.hijri_date}
                onChange={(e) => handleChange('hijri_date', e.target.value)}
              />
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--admin-border)', margin: '1.5rem 0' }} />

          {/* Today's Recitation */}
          <h3 className="admin-section-title" style={{ color: 'var(--admin-accent)' }}>📌 تسميع اليوم (الحاضر)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="admin-field-group">
              <label htmlFor="rec-today-surah" className="admin-label">السورة</label>
              <input
                id="rec-today-surah"
                type="text"
                placeholder="مثال: الطلاق"
                className="admin-input"
                value={form.recitation_today_surah}
                onChange={(e) => handleChange('recitation_today_surah', e.target.value)}
              />
            </div>
            <div className="admin-field-group">
              <label htmlFor="rec-today-from" className="admin-label">من آية</label>
              <input
                id="rec-today-from"
                type="text"
                placeholder="1"
                className="admin-input"
                value={form.recitation_today_from}
                onChange={(e) => handleChange('recitation_today_from', e.target.value)}
                dir="ltr"
              />
            </div>
            <div className="admin-field-group">
              <label htmlFor="rec-today-to" className="admin-label">إلى آية</label>
              <input
                id="rec-today-to"
                type="text"
                placeholder="5"
                className="admin-input"
                value={form.recitation_today_to}
                onChange={(e) => handleChange('recitation_today_to', e.target.value)}
                dir="ltr"
              />
            </div>
            <div className="admin-field-group">
              <label htmlFor="rec-today-level" className="admin-label">مستوى الحفظ</label>
              <select
                id="rec-today-level"
                className="admin-input admin-select"
                value={form.recitation_today_level}
                onChange={(e) => handleChange('recitation_today_level', e.target.value)}
              >
                {LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--admin-border)', margin: '1.5rem 0' }} />

          {/* Past Recitation */}
          <h3 className="admin-section-title" style={{ color: 'var(--admin-accent)' }}>📌 تسميع اليوم (الماضي)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 1.5fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="admin-field-group">
              <label htmlFor="rec-past-surah" className="admin-label">السورة / الجزء</label>
              <input
                id="rec-past-surah"
                type="text"
                placeholder="مثال: القلم"
                className="admin-input"
                value={form.recitation_past_surah}
                onChange={(e) => handleChange('recitation_past_surah', e.target.value)}
              />
            </div>
            <div className="admin-field-group">
              <label htmlFor="rec-past-level" className="admin-label">مستوى الحفظ</label>
              <select
                id="rec-past-level"
                className="admin-input admin-select"
                value={form.recitation_past_level}
                onChange={(e) => handleChange('recitation_past_level', e.target.value)}
              >
                {LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--admin-border)', margin: '1.5rem 0' }} />

          {/* Reading */}
          <h3 className="admin-section-title" style={{ color: 'var(--admin-accent)' }}>📌 القراءة</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="admin-field-group">
              <label htmlFor="reading-surah" className="admin-label">السورة</label>
              <input
                id="reading-surah"
                type="text"
                placeholder="مثال: الطلاق"
                className="admin-input"
                value={form.reading_surah}
                onChange={(e) => handleChange('reading_surah', e.target.value)}
              />
            </div>
            <div className="admin-field-group">
              <label htmlFor="reading-from" className="admin-label">من آية</label>
              <input
                id="reading-from"
                type="text"
                placeholder="1"
                className="admin-input"
                value={form.reading_from}
                onChange={(e) => handleChange('reading_from', e.target.value)}
                dir="ltr"
              />
            </div>
            <div className="admin-field-group">
              <label htmlFor="reading-to" className="admin-label">إلى آية</label>
              <input
                id="reading-to"
                type="text"
                placeholder="5"
                className="admin-input"
                value={form.reading_to}
                onChange={(e) => handleChange('reading_to', e.target.value)}
                dir="ltr"
              />
            </div>
            <div className="admin-field-group">
              <label htmlFor="reading-level" className="admin-label">مستوى القراءة</label>
              <select
                id="reading-level"
                className="admin-input admin-select"
                value={form.reading_level}
                onChange={(e) => handleChange('reading_level', e.target.value)}
              >
                {LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--admin-border)', margin: '1.5rem 0' }} />

          {/* Other Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="admin-field-group">
              <label htmlFor="tajweed-lesson" className="admin-label">التجويد</label>
              <input
                id="tajweed-lesson"
                type="text"
                placeholder="مثال: تحفة الأطفال"
                className="admin-input"
                value={form.tajweed_lesson}
                onChange={(e) => handleChange('tajweed_lesson', e.target.value)}
              />
            </div>
            <div className="admin-field-group">
              <label htmlFor="interaction-level" className="admin-label">التفاعل</label>
              <select
                id="interaction-level"
                className="admin-input admin-select"
                value={form.interaction_level}
                onChange={(e) => handleChange('interaction_level', e.target.value)}
              >
                {['ممتاز', 'جيد جداً', 'جيد', 'مقبول'].map((lvl) => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="admin-field-group" style={{ marginBottom: '1rem' }}>
            <label htmlFor="general-notes" className="admin-label">ملاحظات عامة</label>
            <textarea
              id="general-notes"
              className="admin-input admin-textarea"
              placeholder="تقبل الله منكم..."
              rows={3}
              value={form.general_notes}
              onChange={(e) => handleChange('general_notes', e.target.value)}
            />
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--admin-border)', margin: '1.5rem 0' }} />

          {/* Homework */}
          <h3 className="admin-section-title" style={{ color: 'var(--admin-accent)' }}>📌 الواجبات</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="admin-field-group">
              <label htmlFor="hw-today-surah" className="admin-label">الواجب (الحاضر): السورة</label>
              <input
                id="hw-today-surah"
                type="text"
                placeholder="مثال: الطلاق"
                className="admin-input"
                value={form.homework_today_surah}
                onChange={(e) => handleChange('homework_today_surah', e.target.value)}
              />
            </div>
            <div className="admin-field-group">
              <label htmlFor="hw-today-from" className="admin-label">من آية</label>
              <input
                id="hw-today-from"
                type="text"
                placeholder="1"
                className="admin-input"
                value={form.homework_today_from}
                onChange={(e) => handleChange('homework_today_from', e.target.value)}
                dir="ltr"
              />
            </div>
            <div className="admin-field-group">
              <label htmlFor="hw-today-to" className="admin-label">إلى آية</label>
              <input
                id="hw-today-to"
                type="text"
                placeholder="5"
                className="admin-input"
                value={form.homework_today_to}
                onChange={(e) => handleChange('homework_today_to', e.target.value)}
                dir="ltr"
              />
            </div>
          </div>

          <div className="admin-field-group" style={{ marginBottom: '1rem' }}>
            <label htmlFor="hw-past-surah" className="admin-label">الواجب (الماضي): السورة / الجزء</label>
            <input
              id="hw-past-surah"
              type="text"
              placeholder="مثال: الحاقة"
              className="admin-input"
              value={form.homework_past_surah}
              onChange={(e) => handleChange('homework_past_surah', e.target.value)}
            />
          </div>

          {error && (
            <div className="admin-error-banner" role="alert">
              ⚠️ {error}
            </div>
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
              {saving ? 'جارٍ الحفظ…' : (isEdit ? 'حفظ التعديلات' : 'إضافة الدرس')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
