import { DEFAULT_LANGUAGE } from './config.js';
import { isKnownArabicSurah } from './quranLessons.js';
import { normalizeLanguage } from './routing.js';

function hasNonEmptyText(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function toText(value) {
  if (value === null || value === undefined) return '';
  return typeof value === 'string' ? value : String(value);
}

function cleanStringList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Resolve a localized text field (`<field>_en` / `<field>_tr`) with automatic
 * Arabic RTL fallback when the requested translation is missing or blank.
 */
export function resolveLocalizedField(record, field, lang = DEFAULT_LANGUAGE) {
  const normalizedLang = normalizeLanguage(lang);
  const arabicText = toText(record?.[field]);

  if (normalizedLang === DEFAULT_LANGUAGE) {
    return {
      text: arabicText,
      dir: 'rtl',
      isFallback: false,
    };
  }

  const translated = record?.[`${field}_${normalizedLang}`];
  if (hasNonEmptyText(translated)) {
    return {
      text: translated,
      dir: 'ltr',
      isFallback: false,
    };
  }

  return {
    text: arabicText,
    dir: 'rtl',
    isFallback: arabicText.trim() !== '',
  };
}

/**
 * Convenience wrapper returning only the resolved string from resolveLocalizedField.
 */
export function getLocalizedField(record, field, lang = DEFAULT_LANGUAGE) {
  return resolveLocalizedField(record, field, lang).text;
}

/**
 * Resolve a Latin-transliterated name (e.g. `name_latin` / `teacher_name_latin`)
 * for non-Arabic locales, falling back to the Arabic name in RTL when missing.
 */
export function resolveLocalizedLatinName(
  record,
  field = 'name',
  latinField = `${field}_latin`,
  lang = DEFAULT_LANGUAGE,
) {
  const normalizedLang = normalizeLanguage(lang);
  const arabicText = toText(record?.[field]);

  if (normalizedLang === DEFAULT_LANGUAGE) {
    return {
      text: arabicText,
      dir: 'rtl',
      isFallback: false,
    };
  }

  const effectiveLatinField = latinField || `${field}_latin`;
  const latinText = record?.[effectiveLatinField];
  if (hasNonEmptyText(latinText)) {
    return {
      text: latinText,
      dir: 'ltr',
      isFallback: false,
    };
  }

  return {
    text: arabicText,
    dir: 'rtl',
    isFallback: arabicText.trim() !== '',
  };
}

/**
 * Resolve a localized string-array field (e.g. `learning_outcomes`), cleaning
 * arrays to trimmed non-empty strings and falling back to Arabic when empty.
 */
export function resolveLocalizedList(record, field, lang = DEFAULT_LANGUAGE) {
  const normalizedLang = normalizeLanguage(lang);
  const arItems = cleanStringList(record?.[field]);

  if (normalizedLang === DEFAULT_LANGUAGE) {
    return {
      items: arItems,
      dir: 'rtl',
      isFallback: false,
    };
  }

  const localizedItems = cleanStringList(record?.[`${field}_${normalizedLang}`]);
  if (localizedItems.length > 0) {
    return {
      items: localizedItems,
      dir: 'ltr',
      isFallback: false,
    };
  }

  return {
    items: arItems,
    dir: 'rtl',
    isFallback: arItems.length > 0,
  };
}

/**
 * Resolve localized select options (e.g. `available_levels`) where `value` is
 * always the canonical Arabic string and `label` is localized by matching index.
 */
export function resolveLocalizedOptions(record, field, lang = DEFAULT_LANGUAGE) {
  const normalizedLang = normalizeLanguage(lang);
  const rawAr = Array.isArray(record?.[field]) ? record[field] : [];
  const rawLocalized =
    normalizedLang !== DEFAULT_LANGUAGE &&
    Array.isArray(record?.[`${field}_${normalizedLang}`])
      ? record[`${field}_${normalizedLang}`]
      : null;

  const options = [];
  for (let i = 0; i < rawAr.length; i += 1) {
    const rawValue = rawAr[i];
    if (!hasNonEmptyText(rawValue)) continue;
    const value = rawValue.trim();

    if (normalizedLang === DEFAULT_LANGUAGE) {
      options.push({
        value,
        label: value,
        dir: 'rtl',
        isFallback: false,
      });
      continue;
    }

    const candidate = rawLocalized?.[i];
    if (hasNonEmptyText(candidate)) {
      options.push({
        value,
        label: candidate.trim(),
        dir: 'ltr',
        isFallback: false,
      });
    } else {
      options.push({
        value,
        label: value,
        dir: 'rtl',
        isFallback: true,
      });
    }
  }

  return options;
}

/**
 * Resolve the localized display label for a stored canonical Arabic option value
 * (e.g. a student's selected competition level).
 */
export function getLocalizedOptionLabel(
  record,
  field,
  canonicalValue,
  lang = DEFAULT_LANGUAGE,
) {
  const normalizedLang = normalizeLanguage(lang);
  const canonicalText = toText(canonicalValue);

  if (canonicalText.trim() === '') {
    return {
      text: '',
      dir: 'rtl',
      isFallback: false,
    };
  }

  if (normalizedLang === DEFAULT_LANGUAGE) {
    return {
      text: canonicalText,
      dir: 'rtl',
      isFallback: false,
    };
  }

  const rawAr = Array.isArray(record?.[field]) ? record[field] : [];
  const trimmedTarget = canonicalText.trim();

  let matchedIndex = rawAr.findIndex((item) => item === canonicalText);
  if (matchedIndex === -1) {
    matchedIndex = rawAr.findIndex(
      (item) => typeof item === 'string' && item.trim() === trimmedTarget,
    );
  }

  if (matchedIndex !== -1) {
    const translated = record?.[`${field}_${normalizedLang}`]?.[matchedIndex];
    if (hasNonEmptyText(translated)) {
      return {
        text: translated.trim(),
        dir: 'ltr',
        isFallback: false,
      };
    }
  }

  return {
    text: canonicalText,
    dir: 'rtl',
    isFallback: true,
  };
}

/**
 * Inspect a DB record against a list of translation field specs and report
 * whether English and/or Turkish translations are missing.
 */
export function getMissingTranslations(record, specs) {
  if (!record || !Array.isArray(specs) || specs.length === 0) {
    return {
      missingEn: false,
      missingTr: false,
      missingLanguages: [],
    };
  }

  let missingEn = false;
  let missingTr = false;

  for (const spec of specs) {
    if (!spec || !spec.field) continue;
    if (typeof spec.when === 'function' && !spec.when(record)) continue;

    const type = spec.type || 'text';
    const hasArabicSource =
      type === 'list' || type === 'options'
        ? cleanStringList(record[spec.field]).length > 0
        : hasNonEmptyText(record[spec.field]);

    if (!spec.required && !hasArabicSource) continue;

    if (type === 'latin') {
      const latinField = spec.latinField || `${spec.field}_latin`;
      if (!hasNonEmptyText(record[latinField])) {
        missingEn = true;
        missingTr = true;
      }
    } else if (type === 'list') {
      if (cleanStringList(record[`${spec.field}_en`]).length === 0) {
        missingEn = true;
      }
      if (cleanStringList(record[`${spec.field}_tr`]).length === 0) {
        missingTr = true;
      }
    } else if (type === 'options') {
      const rawAr = Array.isArray(record[spec.field]) ? record[spec.field] : [];
      const enArr = Array.isArray(record[`${spec.field}_en`])
        ? record[`${spec.field}_en`]
        : [];
      const trArr = Array.isArray(record[`${spec.field}_tr`])
        ? record[`${spec.field}_tr`]
        : [];

      let nonEmptyCount = 0;
      for (let i = 0; i < rawAr.length; i += 1) {
        if (!hasNonEmptyText(rawAr[i])) continue;
        nonEmptyCount += 1;
        if (!hasNonEmptyText(enArr[i])) missingEn = true;
        if (!hasNonEmptyText(trArr[i])) missingTr = true;
      }

      if (nonEmptyCount === 0 && spec.required) {
        if (cleanStringList(enArr).length === 0) missingEn = true;
        if (cleanStringList(trArr).length === 0) missingTr = true;
      }
    } else {
      if (!hasNonEmptyText(record[`${spec.field}_en`])) {
        missingEn = true;
      }
      if (!hasNonEmptyText(record[`${spec.field}_tr`])) {
        missingTr = true;
      }
    }
  }

  const missingLanguages = [];
  if (missingEn) missingLanguages.push('en');
  if (missingTr) missingLanguages.push('tr');

  return {
    missingEn,
    missingTr,
    missingLanguages,
  };
}

export const TEACHER_TRANSLATION_SPECS = [
  { field: 'name', type: 'latin', latinField: 'name_latin', required: true },
  { field: 'bio', type: 'text' },
];

export const COURSE_TRANSLATION_SPECS = [
  { field: 'name', type: 'text', required: true },
  { field: 'short_description', type: 'text', required: true },
  { field: 'long_description', type: 'text' },
  { field: 'price', type: 'text', when: (record) => !record?.is_free },
  { field: 'teacher_name', type: 'latin', latinField: 'teacher_name_latin' },
  { field: 'learning_outcomes', type: 'list' },
];

export const LECTURE_TRANSLATION_SPECS = [
  { field: 'title', type: 'text', required: true },
  { field: 'description', type: 'text' },
];

export const COMPETITION_TRANSLATION_SPECS = [
  { field: 'name', type: 'text', required: true },
  { field: 'short_description', type: 'text', required: true },
  { field: 'complete_description', type: 'text', required: true },
  { field: 'awards_short_description', type: 'text' },
  { field: 'awards_complete_description', type: 'text' },
  { field: 'participation_terms', type: 'text', required: true },
  { field: 'available_levels', type: 'options' },
];

export const STAGE_TRANSLATION_SPECS = [
  { field: 'name', type: 'text', required: true },
  { field: 'description', type: 'text' },
];

export const FAQ_TRANSLATION_SPECS = [
  { field: 'question', type: 'text', required: true },
  { field: 'answer', type: 'text', required: true },
];

export const PAGE_TRANSLATION_SPECS = [
  { field: 'title', type: 'text', required: true },
  { field: 'content', type: 'text', required: true },
];

export const QURAN_LESSON_TRANSLATION_SPECS = [
  { field: 'hijri_date', type: 'text' },
  {
    field: 'recitation_today_surah',
    type: 'text',
    when: (record) => !isKnownArabicSurah(record?.recitation_today_surah),
  },
  {
    field: 'recitation_past_surah',
    type: 'text',
    when: (record) => !isKnownArabicSurah(record?.recitation_past_surah),
  },
  {
    field: 'reading_surah',
    type: 'text',
    when: (record) => !isKnownArabicSurah(record?.reading_surah),
  },
  { field: 'tajweed_lesson', type: 'text' },
  { field: 'general_notes', type: 'text' },
  {
    field: 'homework_today_surah',
    type: 'text',
    when: (record) => !isKnownArabicSurah(record?.homework_today_surah),
  },
  {
    field: 'homework_past_surah',
    type: 'text',
    when: (record) => !isKnownArabicSurah(record?.homework_past_surah),
  },
];
