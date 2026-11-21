import { useEffect, useState } from 'react';
import { X, Loader, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import {
  createCompetition,
  updateCompetition,
  fetchCompetitionStages,
  createCompetitionStage,
  updateCompetitionStage,
  deleteCompetitionStage,
  checkStageHasStudents,
} from '../../services/competitionsService';
import {
  COMPETITION_TRANSLATION_SPECS,
  STAGE_TRANSLATION_SPECS,
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
  complete_description: '',
  complete_description_en: '',
  complete_description_tr: '',
  start_date: '',
  registration_deadline: '',
  awards_short_description: '',
  awards_short_description_en: '',
  awards_short_description_tr: '',
  awards_complete_description: '',
  awards_complete_description_en: '',
  awards_complete_description_tr: '',
  participation_terms: '',
  participation_terms_en: '',
  participation_terms_tr: '',
  sort_order: 0,
  is_published: true,
  available_levels: [],
  available_levels_en: [],
  available_levels_tr: [],
};

function alignLevelsArray(values, length) {
  const arr = Array.isArray(values) ? values : [];
  return Array.from({ length }, (_, idx) => (typeof arr[idx] === 'string' ? arr[idx] : ''));
}

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
  const [form, setForm] = useState(() => {
    if (!competition) return { ...EMPTY_FORM };

    const arLevels = Array.isArray(competition.available_levels)
      ? competition.available_levels
      : [];

    return {
      name: competition.name ?? '',
      name_en: competition.name_en ?? '',
      name_tr: competition.name_tr ?? '',
      slug: competition.slug ?? '',
      short_description: competition.short_description ?? '',
      short_description_en: competition.short_description_en ?? '',
      short_description_tr: competition.short_description_tr ?? '',
      complete_description: competition.complete_description ?? '',
      complete_description_en: competition.complete_description_en ?? '',
      complete_description_tr: competition.complete_description_tr ?? '',
      start_date: formatDateForDisplay(competition.start_date),
      registration_deadline: formatDateForDisplay(competition.registration_deadline),
      awards_short_description: competition.awards_short_description ?? '',
      awards_short_description_en: competition.awards_short_description_en ?? '',
      awards_short_description_tr: competition.awards_short_description_tr ?? '',
      awards_complete_description: competition.awards_complete_description ?? '',
      awards_complete_description_en: competition.awards_complete_description_en ?? '',
      awards_complete_description_tr: competition.awards_complete_description_tr ?? '',
      participation_terms: competition.participation_terms ?? '',
      participation_terms_en: competition.participation_terms_en ?? '',
      participation_terms_tr: competition.participation_terms_tr ?? '',
      sort_order: competition.sort_order ?? 0,
      is_published: competition.is_published ?? true,
      available_levels: arLevels,
      available_levels_en: alignLevelsArray(competition.available_levels_en, arLevels.length),
      available_levels_tr: alignLevelsArray(competition.available_levels_tr, arLevels.length),
    };
  });

  const [activeLang, setActiveLang] = useState('ar');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Stages state
  const [stages, setStages] = useState([]);
  const [loadingStages, setLoadingStages] = useState(isEdit);
  const [deletedStageIds, setDeletedStageIds] = useState([]);

  useEffect(() => {
    setActiveLang('ar');
  }, [competition?.id]);

  useEffect(() => {
    if (isEdit) {
      fetchCompetitionStages(competition.id)
        .then((data) => {
          setStages(
            data.map((stg) => ({
              ...stg,
              name: stg.name ?? '',
              name_en: stg.name_en ?? '',
              name_tr: stg.name_tr ?? '',
              description: stg.description ?? '',
              description_en: stg.description_en ?? '',
              description_tr: stg.description_tr ?? '',
              deadline: formatDateForDisplay(stg.deadline),
            }))
          );
        })
        .catch(console.error)
        .finally(() => setLoadingStages(false));
    }
  }, [isEdit, competition]);

  // Handle escape key to close
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const compMissing = getMissingTranslations(form, COMPETITION_TRANSLATION_SPECS);
  const stagesMissingEn = stages.some(
    (stg) => getMissingTranslations(stg, STAGE_TRANSLATION_SPECS).missingEn
  );
  const stagesMissingTr = stages.some(
    (stg) => getMissingTranslations(stg, STAGE_TRANSLATION_SPECS).missingTr
  );
  const missingEn = compMissing.missingEn || stagesMissingEn;
  const missingTr = compMissing.missingTr || stagesMissingTr;

  // Levels handlers (Dynamic array of strings synchronized across AR/EN/TR)
  const addLevel = () => {
    setForm((prev) => {
      const arLevels = [...(prev.available_levels ?? []), ''];
      return {
        ...prev,
        available_levels: arLevels,
        available_levels_en: [...alignLevelsArray(prev.available_levels_en, arLevels.length - 1), ''],
        available_levels_tr: [...alignLevelsArray(prev.available_levels_tr, arLevels.length - 1), ''],
      };
    });
  };

  const updateLevel = (index, value) => {
    setForm((prev) => {
      const nextLevels = [...(prev.available_levels ?? [])];
      nextLevels[index] = value;
      return { ...prev, available_levels: nextLevels };
    });
  };

  const updateLocalizedLevel = (lang, index, value) => {
    const field = `available_levels_${lang}`;
    setForm((prev) => {
      const targetLen = (prev.available_levels ?? []).length;
      const nextLocalized = alignLevelsArray(prev[field], targetLen);
      nextLocalized[index] = value;
      return { ...prev, [field]: nextLocalized };
    });
  };

  const removeLevel = (index) => {
    setForm((prev) => {
      const arLevels = prev.available_levels ?? [];
      const enLevels = alignLevelsArray(prev.available_levels_en, arLevels.length);
      const trLevels = alignLevelsArray(prev.available_levels_tr, arLevels.length);
      return {
        ...prev,
        available_levels: arLevels.filter((_, idx) => idx !== index),
        available_levels_en: enLevels.filter((_, idx) => idx !== index),
        available_levels_tr: trLevels.filter((_, idx) => idx !== index),
      };
    });
  };

  // Stages handlers
  const addStage = () => {
    setStages((prev) => [
      ...prev,
      {
        name: '',
        name_en: '',
        name_tr: '',
        description: '',
        description_en: '',
        description_tr: '',
        deadline: '',
      },
    ]);
  };

  const updateStage = (index, field, value) => {
    setStages((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeStage = async (index) => {
    const stage = stages[index];
    if (stage.id) {
      try {
        const hasStudents = await checkStageHasStudents(stage.id);
        if (hasStudents) {
          alert('لا يمكن حذف هذه المرحلة لأن هناك طلاباً مسجلين فيها.');
          return;
        }
      } catch (err) {
        console.error(err);
        alert('حدث خطأ أثناء التحقق من الطلاب المرتبطين بالمرحلة.');
        return;
      }
      setDeletedStageIds((prev) => [...prev, stage.id]);
    }
    setStages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const moveStage = (index, direction) => {
    if (direction === -1 && index === 0) return;
    if (direction === 1 && index === stages.length - 1) return;
    setStages((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index + direction];
      next[index + direction] = temp;
      return next;
    });
  };

  const handleField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setActiveLang('ar');
      setError('يرجى إدخال اسم المسابقة باللغة العربية.');
      return;
    }

    if (!form.short_description.trim()) {
      setActiveLang('ar');
      setError('يرجى إدخال الوصف القصير باللغة العربية.');
      return;
    }

    if (!form.complete_description.trim()) {
      setActiveLang('ar');
      setError('يرجى إدخال الوصف الكامل للمسابقة باللغة العربية.');
      return;
    }

    if (!form.participation_terms.trim()) {
      setActiveLang('ar');
      setError('يرجى إدخال شروط وأحكام المشاركة باللغة العربية.');
      return;
    }

    if (stages.some((stg) => !String(stg.name ?? '').trim())) {
      setActiveLang('ar');
      setError('يرجى إدخال اسم كل مرحلة باللغة العربية.');
      return;
    }

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
      const rawLevels = form.available_levels ?? [];
      const rawLevelsEn = alignLevelsArray(form.available_levels_en, rawLevels.length);
      const rawLevelsTr = alignLevelsArray(form.available_levels_tr, rawLevels.length);

      const seenLevels = new Set();
      const uniqueLevels = [];
      const alignedLevelsEn = [];
      const alignedLevelsTr = [];

      for (let i = 0; i < rawLevels.length; i += 1) {
        const trimmed = String(rawLevels[i] ?? '').trim();
        if (!trimmed || seenLevels.has(trimmed)) continue;
        seenLevels.add(trimmed);
        uniqueLevels.push(trimmed);
        alignedLevelsEn.push(String(rawLevelsEn[i] ?? '').trim());
        alignedLevelsTr.push(String(rawLevelsTr[i] ?? '').trim());
      }

      const payload = {
        ...form,
        name: form.name.trim(),
        name_en: form.name_en.trim() || null,
        name_tr: form.name_tr.trim() || null,
        short_description: form.short_description.trim(),
        short_description_en: form.short_description_en.trim() || null,
        short_description_tr: form.short_description_tr.trim() || null,
        complete_description: form.complete_description.trim(),
        complete_description_en: form.complete_description_en.trim() || null,
        complete_description_tr: form.complete_description_tr.trim() || null,
        awards_short_description_en: form.awards_short_description_en.trim() || null,
        awards_short_description_tr: form.awards_short_description_tr.trim() || null,
        awards_complete_description_en: form.awards_complete_description_en.trim() || null,
        awards_complete_description_tr: form.awards_complete_description_tr.trim() || null,
        participation_terms: form.participation_terms.trim(),
        participation_terms_en: form.participation_terms_en.trim() || null,
        participation_terms_tr: form.participation_terms_tr.trim() || null,
        start_date: startDateIso,
        registration_deadline: registrationDeadlineIso,
        sort_order: parseInt(form.sort_order) || 0,
        available_levels: uniqueLevels,
        available_levels_en: alignedLevelsEn.some(Boolean) ? alignedLevelsEn : null,
        available_levels_tr: alignedLevelsTr.some(Boolean) ? alignedLevelsTr : null,
      };

      const saved = isEdit
        ? await updateCompetition(competition.id, payload)
        : await createCompetition(payload);

      // Save stages
      if (isEdit) {
        for (const id of deletedStageIds) {
          await deleteCompetitionStage(id);
        }
      }

      for (let i = 0; i < stages.length; i += 1) {
        const stage = stages[i];
        const parsedDeadline = stage.deadline ? parseDisplayDate(stage.deadline) : null;

        const stagePayload = {
          competition_id: saved.id,
          name: stage.name.trim(),
          name_en: String(stage.name_en ?? '').trim() || null,
          name_tr: String(stage.name_tr ?? '').trim() || null,
          description: String(stage.description ?? '').trim() || null,
          description_en: String(stage.description_en ?? '').trim() || null,
          description_tr: String(stage.description_tr ?? '').trim() || null,
          deadline: parsedDeadline,
          sort_order: i,
        };
        if (stage.id) {
          await updateCompetitionStage(stage.id, stagePayload);
        } else {
          await createCompetitionStage(stagePayload);
        }
      }

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

  const langSuffix = activeLang === 'ar' ? '' : `_${activeLang}`;
  const langLabel = activeLang === 'en' ? 'English' : 'Türkçe';
  const arLevels = form.available_levels ?? [];
  const activeLocalizedLevels =
    activeLang === 'ar'
      ? arLevels
      : alignLevelsArray(form[`available_levels${langSuffix}`], arLevels.length);

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
          {/* Slug (Non-translatable) */}
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

          {/* Date Row (Non-translatable: Start date & Deadline) */}
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

              {/* Short Description (AR) */}
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

              {/* Complete Description (AR) */}
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

              {/* Awards Short Description (AR) */}
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

              {/* Awards Complete Description (AR) */}
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

              {/* Participation Terms (AR) */}
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

              {/* Available Levels (AR) */}
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
                  {arLevels.map((lvl, idx) => (
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
                        aria-label="حذف المستوى"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {arLevels.length === 0 && (
                    <p className="admin-muted" style={{ fontSize: '0.8rem', textAlign: 'center', padding: '1rem', border: '1px dashed var(--admin-border)', borderRadius: '8px' }}>
                      إذا لم تُضف مستويات هنا، سيُسمح للطالب بكتابة مستواه يدوياً.
                    </p>
                  )}
                </div>
              </div>

              {/* Stages (AR) */}
              <div className="admin-field-group" style={{ gap: '0.75rem', marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="admin-label">المراحل (Stages)</label>
                  <button
                    type="button"
                    onClick={addStage}
                    className="admin-btn admin-btn--ghost admin-btn--sm"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <Plus size={14} />
                    إضافة مرحلة
                  </button>
                </div>

                {loadingStages ? (
                  <div style={{ textAlign: 'center', padding: '1rem' }}>
                    <Loader className="admin-spin" size={20} />
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {stages.map((stage, idx) => (
                      <div key={stage.id || idx} style={{ border: '1px solid var(--admin-border)', padding: '1rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 'bold' }}>مرحلة {idx + 1}</span>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button type="button" onClick={() => moveStage(idx, -1)} disabled={idx === 0} className="admin-icon-btn" aria-label="تحريك لأعلى"><ArrowUp size={16} /></button>
                            <button type="button" onClick={() => moveStage(idx, 1)} disabled={idx === stages.length - 1} className="admin-icon-btn" aria-label="تحريك لأسفل"><ArrowDown size={16} /></button>
                            <button type="button" onClick={() => removeStage(idx)} className="admin-icon-btn admin-icon-btn--delete" aria-label="حذف المرحلة"><Trash2 size={16} /></button>
                          </div>
                        </div>
                        <div className="admin-field-group">
                          <label className="admin-label">اسم المرحلة *</label>
                          <input type="text" className="admin-input" value={stage.name} onChange={(e) => updateStage(idx, 'name', e.target.value)} required placeholder="مثال: التصفيات الأولى" />
                        </div>
                        <div className="admin-field-group">
                          <label className="admin-label">وصف المرحلة (اختياري)</label>
                          <textarea className="admin-input admin-textarea" rows={2} value={stage.description || ''} onChange={(e) => updateStage(idx, 'description', e.target.value)} placeholder="وصف قصير للمرحلة..." />
                        </div>
                        <div className="admin-field-group">
                          <label className="admin-label">آخر موعد للمرحلة (اختياري)</label>
                          <input type="text" className="admin-input" value={stage.deadline || ''} onChange={(e) => updateStage(idx, 'deadline', normalizeDateInput(e.target.value))} placeholder="dd/mm/yyyy" inputMode="numeric" dir="ltr" />
                        </div>
                      </div>
                    ))}
                    {stages.length === 0 && (
                      <p className="admin-muted" style={{ fontSize: '0.8rem', textAlign: 'center', padding: '1rem', border: '1px dashed var(--admin-border)', borderRadius: '8px' }}>
                        إذا لم تُضف مراحل، ستعمل المسابقة بدون نظام تصفية.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div dir="ltr" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Name (EN/TR) */}
              <div className="admin-field-group">
                <label htmlFor={`competition-name-${activeLang}`} className="admin-label" dir="rtl">
                  اسم المسابقة ({langLabel})
                </label>
                {form.name.trim() && (
                  <p className="admin-field-hint" dir="rtl">النص العربي: {form.name}</p>
                )}
                <input
                  id={`competition-name-${activeLang}`}
                  type="text"
                  className="admin-input"
                  value={form[`name${langSuffix}`]}
                  onChange={(e) => handleField(`name${langSuffix}`, e.target.value)}
                  placeholder={activeLang === 'en' ? 'Competition name in English...' : 'Yarışma adı...'}
                />
              </div>

              {/* Short Description (EN/TR) */}
              <div className="admin-field-group">
                <label htmlFor={`competition-short-desc-${activeLang}`} className="admin-label" dir="rtl">
                  وصف قصير ({langLabel})
                </label>
                <textarea
                  id={`competition-short-desc-${activeLang}`}
                  className="admin-input admin-textarea"
                  value={form[`short_description${langSuffix}`]}
                  onChange={(e) => handleField(`short_description${langSuffix}`, e.target.value)}
                  placeholder={activeLang === 'en' ? 'Short description for competition cards...' : 'Yarışma kartı için kısa açıklama...'}
                  rows={2}
                />
              </div>

              {/* Complete Description (EN/TR) */}
              <div className="admin-field-group">
                <label htmlFor={`competition-complete-desc-${activeLang}`} className="admin-label" dir="rtl">
                  نبذة عن المسابقة - الوصف الكامل ({langLabel})
                </label>
                <textarea
                  id={`competition-complete-desc-${activeLang}`}
                  className="admin-input admin-textarea"
                  value={form[`complete_description${langSuffix}`]}
                  onChange={(e) => handleField(`complete_description${langSuffix}`, e.target.value)}
                  placeholder={activeLang === 'en' ? 'Full competition details...' : 'Yarışma hakkında detaylı bilgi...'}
                  rows={5}
                />
              </div>

              {/* Awards Short Description (EN/TR) */}
              <div className="admin-field-group">
                <label htmlFor={`competition-awards-short-${activeLang}`} className="admin-label" dir="rtl">
                  الجوائز - مختصر ({langLabel})
                </label>
                {form.awards_short_description.trim() && (
                  <p className="admin-field-hint" dir="rtl">النص العربي: {form.awards_short_description}</p>
                )}
                <input
                  id={`competition-awards-short-${activeLang}`}
                  type="text"
                  className="admin-input"
                  value={form[`awards_short_description${langSuffix}`]}
                  onChange={(e) => handleField(`awards_short_description${langSuffix}`, e.target.value)}
                  placeholder={activeLang === 'en' ? 'e.g. Valuable prizes for top 10 winners' : 'Örn: İlk 10 kazanan için değerli ödüller'}
                />
              </div>

              {/* Awards Complete Description (EN/TR) */}
              <div className="admin-field-group">
                <label htmlFor={`competition-awards-complete-${activeLang}`} className="admin-label" dir="rtl">
                  تفاصيل الجوائز والتكريم ({langLabel})
                </label>
                <textarea
                  id={`competition-awards-complete-${activeLang}`}
                  className="admin-input admin-textarea"
                  value={form[`awards_complete_description${langSuffix}`]}
                  onChange={(e) => handleField(`awards_complete_description${langSuffix}`, e.target.value)}
                  placeholder={activeLang === 'en' ? 'Prize breakdown and award details...' : 'Ödül ve takdir detayları...'}
                  rows={3}
                />
              </div>

              {/* Participation Terms (EN/TR) */}
              <div className="admin-field-group">
                <label htmlFor={`competition-terms-${activeLang}`} className="admin-label" dir="rtl">
                  شروط وأحكام المشاركة ({langLabel})
                </label>
                <textarea
                  id={`competition-terms-${activeLang}`}
                  className="admin-input admin-textarea"
                  value={form[`participation_terms${langSuffix}`]}
                  onChange={(e) => handleField(`participation_terms${langSuffix}`, e.target.value)}
                  placeholder={activeLang === 'en' ? 'Participation rules and eligibility...' : 'Katılım şartları ve kuralları...'}
                  rows={4}
                />
              </div>

              {/* Available Levels Translations (index-aligned with AR) */}
              <div className="admin-field-group" style={{ gap: '0.75rem' }}>
                <label className="admin-label" dir="rtl">
                  ترجمة المستويات المتاحة ({langLabel})
                </label>
                {arLevels.length === 0 ? (
                  <p
                    dir="rtl"
                    className="admin-muted"
                    style={{ fontSize: '0.8rem', textAlign: 'center', padding: '1rem', border: '1px dashed var(--admin-border)', borderRadius: '8px' }}
                  >
                    أضف المستويات أولاً في تبويب «العربية» لتظهر حقول ترجمتها هنا.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {arLevels.map((arLevel, idx) => (
                      <div key={idx} className="admin-field-group" style={{ gap: '0.3rem' }}>
                        <label
                          htmlFor={`competition-level-${activeLang}-${idx}`}
                          className="admin-field-hint"
                          dir="rtl"
                        >
                          المستوى {idx + 1} (العربية): {arLevel.trim() || '—'}
                        </label>
                        <input
                          id={`competition-level-${activeLang}-${idx}`}
                          type="text"
                          className="admin-input"
                          value={activeLocalizedLevels[idx] ?? ''}
                          onChange={(e) => updateLocalizedLevel(activeLang, idx, e.target.value)}
                          placeholder={activeLang === 'en' ? 'English level label...' : 'Türkçe seviye adı...'}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stages Translations */}
              <div className="admin-field-group" style={{ gap: '0.75rem', marginTop: '0.5rem' }}>
                <label className="admin-label" dir="rtl">
                  ترجمة المراحل ({langLabel})
                </label>

                {loadingStages ? (
                  <div style={{ textAlign: 'center', padding: '1rem' }}>
                    <Loader className="admin-spin" size={20} />
                  </div>
                ) : stages.length === 0 ? (
                  <p
                    dir="rtl"
                    className="admin-muted"
                    style={{ fontSize: '0.8rem', textAlign: 'center', padding: '1rem', border: '1px dashed var(--admin-border)', borderRadius: '8px' }}
                  >
                    أضف المراحل أولاً في تبويب «العربية» لتظهر حقول ترجمتها هنا.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {stages.map((stage, idx) => (
                      <div
                        key={stage.id || idx}
                        style={{
                          border: '1px solid var(--admin-border)',
                          padding: '1rem',
                          borderRadius: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem',
                        }}
                      >
                        <div dir="rtl" style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                          مرحلة {idx + 1}: {stage.name.trim() || 'بدون اسم عربي'}
                        </div>
                        <div className="admin-field-group">
                          <label className="admin-label" dir="rtl">
                            اسم المرحلة ({langLabel})
                          </label>
                          <input
                            type="text"
                            className="admin-input"
                            value={stage[`name${langSuffix}`] || ''}
                            onChange={(e) => updateStage(idx, `name${langSuffix}`, e.target.value)}
                            placeholder={activeLang === 'en' ? 'e.g. First Qualifier' : 'Örn: İlk Eleme Aşaması'}
                          />
                        </div>
                        <div className="admin-field-group">
                          <label className="admin-label" dir="rtl">
                            وصف المرحلة ({langLabel})
                          </label>
                          {stage.description?.trim() && (
                            <p className="admin-field-hint" dir="rtl">
                              الوصف العربي: {stage.description}
                            </p>
                          )}
                          <textarea
                            className="admin-input admin-textarea"
                            rows={2}
                            value={stage[`description${langSuffix}`] || ''}
                            onChange={(e) => updateStage(idx, `description${langSuffix}`, e.target.value)}
                            placeholder={activeLang === 'en' ? 'Short stage description...' : 'Aşama için kısa açıklama...'}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sort order & Published (Non-translatable) */}
          <div className="admin-field-row" style={{ marginTop: '1rem' }}>
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
