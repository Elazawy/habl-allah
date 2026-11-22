import { useEffect, useState } from 'react';
import { X, Loader } from 'lucide-react';
import { addQuranLesson, updateQuranLesson } from '../../services/quranLessonsService';
import TranslationTabs from './components/TranslationTabs';
import {
  QURAN_LESSON_TRANSLATION_SPECS,
  getMissingTranslations,
} from '../../i18n/content.js';
import { lookupSurahTranslation } from '../../i18n/quranLessons.js';

const EMPTY_LESSON = {
  lesson_date: new Date().toISOString().split('T')[0],
  hijri_date: '',
  hijri_date_en: '',
  hijri_date_tr: '',
  recitation_today_surah: '',
  recitation_today_surah_en: '',
  recitation_today_surah_tr: '',
  recitation_today_from: '',
  recitation_today_to: '',
  recitation_today_level: 'ممتاز',
  recitation_past_surah: '',
  recitation_past_surah_en: '',
  recitation_past_surah_tr: '',
  recitation_past_level: 'ممتاز',
  reading_surah: '',
  reading_surah_en: '',
  reading_surah_tr: '',
  reading_from: '',
  reading_to: '',
  reading_level: 'ممتاز',
  tajweed_lesson: '',
  tajweed_lesson_en: '',
  tajweed_lesson_tr: '',
  general_notes: '',
  general_notes_en: '',
  general_notes_tr: '',
  interaction_level: 'ممتاز',
  homework_today_surah: '',
  homework_today_surah_en: '',
  homework_today_surah_tr: '',
  homework_today_from: '',
  homework_today_to: '',
  homework_past_surah: '',
  homework_past_surah_en: '',
  homework_past_surah_tr: '',
};

const LEVELS = ['ممتاز', 'جيد جداً', 'جيد', 'مقبول', 'ضعيف'];

const PREFERRED_LANGUAGE_LABELS = {
  ar: 'العربية',
  en: 'الإنجليزية (English)',
  tr: 'التركية (Türkçe)',
};

const TRANSLATABLE_FIELDS = [
  {
    field: 'hijri_date',
    idPrefix: 'hijri-date',
    label: 'التاريخ الهجري',
    placeholders: {
      en: 'e.g. 23 Dhu al-Hijjah 1447 AH',
      tr: 'Örn: 23 Zilhicce 1447',
    },
  },
  {
    field: 'recitation_today_surah',
    idPrefix: 'rec-today-surah',
    label: '📌 تسميع اليوم (الحاضر): السورة / المقطع',
    isSurah: true,
    placeholders: {
      en: 'e.g. At-Talaq / Juz Amma',
      tr: 'Örn: Talâk / Amme Cüzü',
    },
  },
  {
    field: 'recitation_past_surah',
    idPrefix: 'rec-past-surah',
    label: '📌 تسميع اليوم (الماضي): السورة / الجزء',
    isSurah: true,
    placeholders: {
      en: 'e.g. Al-Qalam / Juz 29',
      tr: 'Örn: Kalem / 29. Cüz',
    },
  },
  {
    field: 'reading_surah',
    idPrefix: 'reading-surah',
    label: '📌 القراءة: السورة / المقطع',
    isSurah: true,
    placeholders: {
      en: 'e.g. At-Talaq',
      tr: 'Örn: Talâk',
    },
  },
  {
    field: 'tajweed_lesson',
    idPrefix: 'tajweed-lesson',
    label: 'التجويد',
    placeholders: {
      en: 'e.g. Tuhfat al-Atfal',
      tr: 'Örn: Tuhfetü’l-Etfâl',
    },
  },
  {
    field: 'general_notes',
    idPrefix: 'general-notes',
    label: 'ملاحظات عامة',
    type: 'textarea',
    placeholders: {
      en: 'May Allah accept from you...',
      tr: 'Allah kabul etsin...',
    },
  },
  {
    field: 'homework_today_surah',
    idPrefix: 'hw-today-surah',
    label: '📌 الواجب (الحاضر): السورة / المقطع',
    isSurah: true,
    placeholders: {
      en: 'e.g. At-Talaq',
      tr: 'Örn: Talâk',
    },
  },
  {
    field: 'homework_past_surah',
    idPrefix: 'hw-past-surah',
    label: '📌 الواجب (الماضي): السورة / الجزء',
    isSurah: true,
    placeholders: {
      en: 'e.g. Al-Haqqah',
      tr: 'Örn: Hâkka',
    },
  },
];

export default function QuranLessonFormModal({
  lesson,
  studentId,
  studentName,
  studentPreferredLanguage,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState(EMPTY_LESSON);
  const [activeLang, setActiveLang] = useState('ar');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEdit = Boolean(lesson);

  useEffect(() => {
    setActiveLang('ar');
    if (lesson) {
      setForm({
        lesson_date: lesson.lesson_date ?? new Date().toISOString().split('T')[0],
        hijri_date: lesson.hijri_date ?? '',
        hijri_date_en: lesson.hijri_date_en ?? '',
        hijri_date_tr: lesson.hijri_date_tr ?? '',
        recitation_today_surah: lesson.recitation_today_surah ?? '',
        recitation_today_surah_en: lesson.recitation_today_surah_en ?? '',
        recitation_today_surah_tr: lesson.recitation_today_surah_tr ?? '',
        recitation_today_from: lesson.recitation_today_from ?? '',
        recitation_today_to: lesson.recitation_today_to ?? '',
        recitation_today_level: lesson.recitation_today_level ?? 'ممتاز',
        recitation_past_surah: lesson.recitation_past_surah ?? '',
        recitation_past_surah_en: lesson.recitation_past_surah_en ?? '',
        recitation_past_surah_tr: lesson.recitation_past_surah_tr ?? '',
        recitation_past_level: lesson.recitation_past_level ?? 'ممتاز',
        reading_surah: lesson.reading_surah ?? '',
        reading_surah_en: lesson.reading_surah_en ?? '',
        reading_surah_tr: lesson.reading_surah_tr ?? '',
        reading_from: lesson.reading_from ?? '',
        reading_to: lesson.reading_to ?? '',
        reading_level: lesson.reading_level ?? 'ممتاز',
        tajweed_lesson: lesson.tajweed_lesson ?? '',
        tajweed_lesson_en: lesson.tajweed_lesson_en ?? '',
        tajweed_lesson_tr: lesson.tajweed_lesson_tr ?? '',
        general_notes: lesson.general_notes ?? '',
        general_notes_en: lesson.general_notes_en ?? '',
        general_notes_tr: lesson.general_notes_tr ?? '',
        interaction_level: lesson.interaction_level ?? 'ممتاز',
        homework_today_surah: lesson.homework_today_surah ?? '',
        homework_today_surah_en: lesson.homework_today_surah_en ?? '',
        homework_today_surah_tr: lesson.homework_today_surah_tr ?? '',
        homework_today_from: lesson.homework_today_from ?? '',
        homework_today_to: lesson.homework_today_to ?? '',
        homework_past_surah: lesson.homework_past_surah ?? '',
        homework_past_surah_en: lesson.homework_past_surah_en ?? '',
        homework_past_surah_tr: lesson.homework_past_surah_tr ?? '',
      });
    } else {
      setForm({
        ...EMPTY_LESSON,
        lesson_date: new Date().toISOString().split('T')[0],
      });
    }
  }, [lesson]);

  const { missingEn, missingTr } = getMissingTranslations(
    form,
    QURAN_LESSON_TRANSLATION_SPECS,
  );

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const payload = { ...form };
      // Trim text fields and normalize empty strings to null
      Object.keys(payload).forEach((key) => {
        if (typeof payload[key] === 'string') {
          const trimmed = payload[key].trim();
          payload[key] = trimmed === '' ? null : trimmed;
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

  const langLabel = activeLang === 'en' ? 'English' : 'Türkçe';
  const preferredLangLabel = studentPreferredLanguage
    ? (PREFERRED_LANGUAGE_LABELS[studentPreferredLanguage] ?? PREFERRED_LANGUAGE_LABELS.ar)
    : null;

  return (
    <div
      className="admin-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'تعديل درس القرآن' : 'إضافة درس قرآن جديد'}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="admin-modal admin-modal--wide">
        <div className="admin-modal-header">
          <h2 className="admin-modal-title">
            {isEdit
              ? 'تعديل تقرير درس القرآن'
              : studentName
                ? `إضافة حصة قرآن جديدة للطالب: ${studentName}`
                : 'إضافة تقرير درس قرآن جديد'}
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

        <form onSubmit={handleSubmit} className="admin-modal-body" id="quran-lesson-form">
          {preferredLangLabel && (
            <p className="admin-field-hint" style={{ marginBottom: '0.25rem' }}>
              اللغة المفضلة للطالب: <strong>{preferredLangLabel}</strong>
            </p>
          )}

          <TranslationTabs
            activeLang={activeLang}
            onChange={setActiveLang}
            missingEn={missingEn}
            missingTr={missingTr}
          />

          {activeLang === 'ar' ? (
            <>
              {/* Date Fields */}
              <div className="admin-form-grid-2" style={{ marginBottom: '0.25rem' }}>
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

              <hr style={{ border: 'none', borderTop: '1px solid var(--admin-border)', margin: '0.5rem 0' }} />

              {/* Today's Recitation */}
              <h3 className="admin-section-title" style={{ color: 'var(--admin-accent)', margin: 0 }}>📌 تسميع اليوم (الحاضر)</h3>
              <div className="admin-form-grid-4">
                <div className="admin-field-group admin-field-group--span-full-mobile">
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
                <div className="admin-field-group admin-field-group--level-mobile">
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

              <hr style={{ border: 'none', borderTop: '1px solid var(--admin-border)', margin: '0.5rem 0' }} />

              {/* Past Recitation */}
              <h3 className="admin-section-title" style={{ color: 'var(--admin-accent)', margin: 0 }}>📌 تسميع اليوم (الماضي)</h3>
              <div className="admin-form-grid-past">
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

              <hr style={{ border: 'none', borderTop: '1px solid var(--admin-border)', margin: '0.5rem 0' }} />

              {/* Reading */}
              <h3 className="admin-section-title" style={{ color: 'var(--admin-accent)', margin: 0 }}>📌 القراءة</h3>
              <div className="admin-form-grid-4">
                <div className="admin-field-group admin-field-group--span-full-mobile">
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
                <div className="admin-field-group admin-field-group--level-mobile">
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

              <hr style={{ border: 'none', borderTop: '1px solid var(--admin-border)', margin: '0.5rem 0' }} />

              {/* Other Fields */}
              <div className="admin-form-grid-2">
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

              <div className="admin-field-group">
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

              <hr style={{ border: 'none', borderTop: '1px solid var(--admin-border)', margin: '0.5rem 0' }} />

              {/* Homework */}
              <h3 className="admin-section-title" style={{ color: 'var(--admin-accent)', margin: 0 }}>📌 الواجبات</h3>
              <div className="admin-form-grid-3">
                <div className="admin-field-group admin-field-group--span-full-mobile">
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

              <div className="admin-field-group">
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
            </>
          ) : (
            <div dir="ltr" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p className="admin-field-hint" dir="rtl">
                التاريخ الميلادي وأرقام الآيات ومستويات التقييم (ممتاز، جيد جداً، …) وأسماء السور المعروفة تُترجم تلقائياً حسب لغة الطالب.
              </p>

              {TRANSLATABLE_FIELDS.map((config) => {
                const targetField = `${config.field}_${activeLang}`;
                const inputId = `${config.idPrefix}-${activeLang}`;
                const arabicValue = (form[config.field] ?? '').trim();
                const autoSurah = config.isSurah
                  ? lookupSurahTranslation(arabicValue, activeLang)
                  : null;
                const placeholder = autoSurah
                  ? `Auto: ${autoSurah}`
                  : config.placeholders[activeLang];

                return (
                  <div className="admin-field-group" key={targetField}>
                    <label htmlFor={inputId} className="admin-label" dir="rtl">
                      {config.label} ({langLabel})
                    </label>
                    {arabicValue && (
                      <p className="admin-field-hint" dir="rtl">
                        النص العربي: {arabicValue}
                        {autoSurah ? ` (ترجمة تلقائية: ${autoSurah})` : ''}
                      </p>
                    )}
                    {config.type === 'textarea' ? (
                      <textarea
                        id={inputId}
                        className="admin-input admin-textarea"
                        placeholder={placeholder}
                        rows={3}
                        value={form[targetField]}
                        onChange={(e) => handleChange(targetField, e.target.value)}
                      />
                    ) : (
                      <input
                        id={inputId}
                        type="text"
                        className="admin-input"
                        placeholder={placeholder}
                        value={form[targetField]}
                        onChange={(e) => handleChange(targetField, e.target.value)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

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
