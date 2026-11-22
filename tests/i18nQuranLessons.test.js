import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import {
  QURAN_SURAHS,
  formatLessonAyahRef,
  getLessonLevelKey,
  isKnownArabicSurah,
  lookupSurahTranslation,
  normalizeArabicLookup,
  resolveLessonLevel,
  resolveLessonSurah,
} from '../src/i18n/quranLessons.js';
import {
  QURAN_LESSON_TRANSLATION_SPECS,
  getMissingTranslations,
} from '../src/i18n/content.js';

const require = createRequire(import.meta.url);
const arStudent = require('../src/locales/ar/student.json');
const enStudent = require('../src/locales/en/student.json');
const trStudent = require('../src/locales/tr/student.json');

test('QURAN_SURAHS covers all 114 unique Surahs with non-empty ar, en, and tr', () => {
  assert.equal(QURAN_SURAHS.length, 114);
  const numbers = new Set();
  const arabicNames = new Set();

  for (let i = 0; i < QURAN_SURAHS.length; i += 1) {
    const surah = QURAN_SURAHS[i];
    assert.equal(surah.number, i + 1);
    assert.ok(typeof surah.ar === 'string' && surah.ar.trim().length > 0);
    assert.ok(typeof surah.en === 'string' && surah.en.trim().length > 0);
    assert.ok(typeof surah.tr === 'string' && surah.tr.trim().length > 0);
    numbers.add(surah.number);
    arabicNames.add(normalizeArabicLookup(surah.ar));
  }

  assert.equal(numbers.size, 114);
  assert.equal(arabicNames.size, 114);
});

test('lookupSurahTranslation handles tashkeel, hamza variants, surah prefix, and aliases', () => {
  assert.equal(lookupSurahTranslation('الفاتحة', 'en'), 'Al-Fatihah');
  assert.equal(lookupSurahTranslation('الفاتحة', 'tr'), 'Fâtiha');
  assert.equal(lookupSurahTranslation('الفاتحة', 'ar'), null);

  // Tashkeel & optional "سورة " prefix
  assert.equal(lookupSurahTranslation('سُورَةُ الطَّلَاقِ', 'en'), 'At-Talaq');
  assert.equal(lookupSurahTranslation('سورة الطلاق', 'tr'), 'Talâk');

  // Hamza / alef variants
  assert.equal(lookupSurahTranslation('آل عمران', 'en'), 'Aal-Imran');
  assert.equal(lookupSurahTranslation('ال عمران', 'en'), 'Aal-Imran');
  assert.equal(lookupSurahTranslation('الأنعام', 'tr'), "En'âm");
  assert.equal(lookupSurahTranslation('الانعام', 'tr'), "En'âm");
  assert.equal(lookupSurahTranslation('سبا', 'en'), 'Saba');

  // Known aliases
  assert.equal(lookupSurahTranslation('براءة', 'en'), 'At-Tawbah');
  assert.equal(lookupSurahTranslation('سورة ياسين', 'tr'), 'Yâsîn');
  assert.equal(lookupSurahTranslation('بني إسرائيل', 'en'), 'Al-Isra');
  assert.equal(lookupSurahTranslation('تبت', 'tr'), 'Tebbet');
  assert.equal(lookupSurahTranslation('اللهب', 'en'), 'Al-Masad');
  assert.equal(lookupSurahTranslation('الدهر', 'tr'), 'İnsân');
  assert.equal(lookupSurahTranslation('تبارك', 'en'), 'Al-Mulk');
  assert.equal(lookupSurahTranslation('سورة الانشراح', 'tr'), 'İnşirâh');

  // Unknown free text
  assert.equal(lookupSurahTranslation('جزء عم', 'en'), null);
  assert.equal(isKnownArabicSurah('سورة الناس'), true);
  assert.equal(isKnownArabicSurah('جزء عم كاملاً'), false);
});

test('resolveLessonSurah prefers explicit translation, then 114-Surah lookup, then Arabic RTL fallback', () => {
  const lessonWithKnownSurah = {
    recitation_today_surah: 'الملك',
    recitation_today_surah_en: '',
    recitation_today_surah_tr: null,
  };

  assert.deepEqual(resolveLessonSurah(lessonWithKnownSurah, 'recitation_today_surah', 'ar'), {
    text: 'الملك',
    dir: 'rtl',
    isFallback: false,
  });
  assert.deepEqual(resolveLessonSurah(lessonWithKnownSurah, 'recitation_today_surah', 'en'), {
    text: 'Al-Mulk',
    dir: 'ltr',
    isFallback: false,
  });
  assert.deepEqual(resolveLessonSurah(lessonWithKnownSurah, 'recitation_today_surah', 'tr'), {
    text: 'Mülk',
    dir: 'ltr',
    isFallback: false,
  });

  // Explicit DB override wins over automatic lookup
  const lessonWithOverride = {
    recitation_past_surah: 'جزء عم',
    recitation_past_surah_en: 'Juz Amma (Complete)',
    recitation_past_surah_tr: '  ',
  };

  assert.deepEqual(resolveLessonSurah(lessonWithOverride, 'recitation_past_surah', 'en'), {
    text: 'Juz Amma (Complete)',
    dir: 'ltr',
    isFallback: false,
  });

  // Unknown free-text without translation falls back to Arabic RTL
  assert.deepEqual(resolveLessonSurah(lessonWithOverride, 'recitation_past_surah', 'tr'), {
    text: 'جزء عم',
    dir: 'rtl',
    isFallback: true,
  });

  // Null/empty fields
  assert.deepEqual(resolveLessonSurah({}, 'reading_surah', 'en'), {
    text: '',
    dir: 'rtl',
    isFallback: false,
  });
});

test('resolveLessonLevel translates all 5 canonical levels across ar/en/tr and falls back safely', () => {
  const dicts = { ar: arStudent, en: enStudent, tr: trStudent };
  const expected = {
    ممتاز: { ar: 'ممتاز', en: 'Excellent', tr: 'Mükemmel', key: 'excellent' },
    'جيد جداً': { ar: 'جيد جداً', en: 'Very Good', tr: 'Çok İyi', key: 'veryGood' },
    'جيد جدا': { ar: 'جيد جداً', en: 'Very Good', tr: 'Çok İyi', key: 'veryGood' },
    جيد: { ar: 'جيد', en: 'Good', tr: 'İyi', key: 'good' },
    مقبول: { ar: 'مقبول', en: 'Acceptable', tr: 'Orta', key: 'acceptable' },
    ضعيف: { ar: 'ضعيف', en: 'Weak', tr: 'Zayıf', key: 'weak' },
  };

  for (const [rawLevel, info] of Object.entries(expected)) {
    assert.equal(getLessonLevelKey(rawLevel), info.key);
    for (const lang of ['ar', 'en', 'tr']) {
      const translateKey = (k) => dicts[lang].lessons.levels[k];
      assert.deepEqual(resolveLessonLevel(rawLevel, lang, translateKey), {
        text: info[lang],
        dir: lang === 'ar' ? 'rtl' : 'ltr',
        isFallback: false,
      });
    }
  }

  // Custom unrecognized Arabic level falls back safely with RTL direction
  assert.deepEqual(
    resolveLessonLevel('متميز جداً', 'en', (k) => enStudent.lessons.levels[k]),
    {
      text: 'متميز جداً',
      dir: 'rtl',
      isFallback: true,
    },
  );

  // Empty level
  assert.deepEqual(
    resolveLessonLevel('', 'tr', (k) => trStudent.lessons.levels[k]),
    {
      text: '',
      dir: 'rtl',
      isFallback: false,
    },
  );
});

test('formatLessonAyahRef formats ASCII and Arabic-Indic integers and preserves text ranges', () => {
  const arFmt = new Intl.NumberFormat('ar-EG').format;
  const enFmt = new Intl.NumberFormat('en-GB').format;

  assert.equal(formatLessonAyahRef('5', enFmt), '5');
  assert.equal(formatLessonAyahRef('١٢', enFmt), '12');
  assert.equal(formatLessonAyahRef(' 12 ', arFmt), arFmt(12));
  assert.equal(formatLessonAyahRef('آية الكرسي', enFmt), 'آية الكرسي');
  assert.equal(formatLessonAyahRef('', enFmt), '');
  assert.equal(formatLessonAyahRef(null, enFmt), '');
});

test('getMissingTranslations with QURAN_LESSON_TRANSLATION_SPECS skips auto-translated Surahs and flags free text', () => {
  // Known 114 Surahs only, no custom text -> complete in both EN and TR
  const autoOnlyLesson = {
    hijri_date: '',
    recitation_today_surah: 'سورة الطلاق',
    recitation_past_surah: 'القلم',
    reading_surah: 'الملك',
    tajweed_lesson: '',
    general_notes: '',
    homework_today_surah: 'الإخلاص',
    homework_past_surah: 'الناس',
  };

  assert.deepEqual(getMissingTranslations(autoOnlyLesson, QURAN_LESSON_TRANSLATION_SPECS), {
    missingEn: false,
    missingTr: false,
    missingLanguages: [],
  });

  // Custom Surah/Juz phrase, Hijri date, Tajweed, and notes missing TR only
  const partialTranslatedLesson = {
    hijri_date: '٢٣ ذو الحجة ١٤٤٧ هـ',
    hijri_date_en: '23 Dhu al-Hijjah 1447 AH',
    hijri_date_tr: '23 Zilhicce 1447',
    recitation_today_surah: 'سورة البقرة',
    recitation_past_surah: 'جزء عم',
    recitation_past_surah_en: 'Juz Amma',
    recitation_past_surah_tr: '',
    tajweed_lesson: 'تحفة الأطفال',
    tajweed_lesson_en: 'Tuhfat al-Atfal',
    tajweed_lesson_tr: 'Tuhfetü’l-Etfâl',
    general_notes: 'أحسنت بارك الله فيك',
    general_notes_en: 'Well done, may Allah bless you',
    general_notes_tr: 'Aferin, Allah mübarek kılsın',
  };

  assert.deepEqual(
    getMissingTranslations(partialTranslatedLesson, QURAN_LESSON_TRANSLATION_SPECS),
    {
      missingEn: false,
      missingTr: true,
      missingLanguages: ['tr'],
    },
  );
});
