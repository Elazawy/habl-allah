import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPETITION_TRANSLATION_SPECS,
  COURSE_TRANSLATION_SPECS,
  FAQ_TRANSLATION_SPECS,
  LECTURE_TRANSLATION_SPECS,
  PAGE_TRANSLATION_SPECS,
  STAGE_TRANSLATION_SPECS,
  TEACHER_TRANSLATION_SPECS,
  getLocalizedField,
  getLocalizedOptionLabel,
  getMissingTranslations,
  resolveLocalizedField,
  resolveLocalizedLatinName,
  resolveLocalizedList,
  resolveLocalizedOptions,
} from '../src/i18n/content.js';

test('resolveLocalizedField resolves ar, en, tr and falls back to Arabic RTL when blank', () => {
  const course = {
    name: 'دورة التجويد',
    name_en: 'Tajweed Course',
    name_tr: '   ',
    long_description: 'السطر الأول\nالسطر الثاني',
    long_description_en: 'Line one\nLine two',
    long_description_tr: null,
  };

  assert.deepEqual(resolveLocalizedField(course, 'name'), {
    text: 'دورة التجويد',
    dir: 'rtl',
    isFallback: false,
  });

  assert.deepEqual(resolveLocalizedField(course, 'name', 'ar-EG'), {
    text: 'دورة التجويد',
    dir: 'rtl',
    isFallback: false,
  });

  assert.deepEqual(resolveLocalizedField(course, 'name', 'en-GB'), {
    text: 'Tajweed Course',
    dir: 'ltr',
    isFallback: false,
  });

  assert.deepEqual(resolveLocalizedField(course, 'long_description', 'en'), {
    text: 'Line one\nLine two',
    dir: 'ltr',
    isFallback: false,
  });

  assert.deepEqual(resolveLocalizedField(course, 'name', 'tr'), {
    text: 'دورة التجويد',
    dir: 'rtl',
    isFallback: true,
  });

  assert.deepEqual(resolveLocalizedField(course, 'long_description', 'tr-TR'), {
    text: 'السطر الأول\nالسطر الثاني',
    dir: 'rtl',
    isFallback: true,
  });

  // Unsupported language normalizes to default 'ar'
  assert.deepEqual(resolveLocalizedField(course, 'name', 'fr'), {
    text: 'دورة التجويد',
    dir: 'rtl',
    isFallback: false,
  });

  // Null/missing records and empty fields never crash and set isFallback: false
  assert.deepEqual(resolveLocalizedField(null, 'name', 'en'), {
    text: '',
    dir: 'rtl',
    isFallback: false,
  });

  assert.deepEqual(resolveLocalizedField({ name: '', name_en: '' }, 'name', 'en'), {
    text: '',
    dir: 'rtl',
    isFallback: false,
  });
});

test('getLocalizedField returns the resolved string text directly', () => {
  const faq = {
    question: 'ما هي المواعيد؟',
    question_en: 'What are the schedules?',
    question_tr: '',
  };

  assert.equal(getLocalizedField(faq, 'question', 'ar'), 'ما هي المواعيد؟');
  assert.equal(getLocalizedField(faq, 'question', 'en'), 'What are the schedules?');
  assert.equal(getLocalizedField(faq, 'question', 'tr'), 'ما هي المواعيد؟');
  assert.equal(getLocalizedField(undefined, 'question', 'en'), '');
});

test('resolveLocalizedLatinName resolves shared Latin name for en/tr and falls back to Arabic', () => {
  const teacher = {
    name: 'الشيخ أحمد',
    name_latin: 'Sheikh Ahmed',
  };

  assert.deepEqual(resolveLocalizedLatinName(teacher, 'name', 'name_latin', 'ar'), {
    text: 'الشيخ أحمد',
    dir: 'rtl',
    isFallback: false,
  });

  assert.deepEqual(resolveLocalizedLatinName(teacher, 'name', 'name_latin', 'en'), {
    text: 'Sheikh Ahmed',
    dir: 'ltr',
    isFallback: false,
  });

  assert.deepEqual(resolveLocalizedLatinName(teacher, 'name', 'name_latin', 'tr'), {
    text: 'Sheikh Ahmed',
    dir: 'ltr',
    isFallback: false,
  });

  // Default latinField derives from field name (`teacher_name` -> `teacher_name_latin`)
  const course = {
    teacher_name: 'أ. فاطمة',
    teacher_name_latin: 'Ustadha Fatima',
  };
  assert.deepEqual(resolveLocalizedLatinName(course, 'teacher_name', undefined, 'tr'), {
    text: 'Ustadha Fatima',
    dir: 'ltr',
    isFallback: false,
  });

  // Missing or blank Latin name falls back to Arabic RTL
  assert.deepEqual(
    resolveLocalizedLatinName({ name: 'أ. سارة', name_latin: '  ' }, 'name', 'name_latin', 'en'),
    {
      text: 'أ. سارة',
      dir: 'rtl',
      isFallback: true,
    },
  );

  // Empty Arabic and empty Latin -> isFallback false
  assert.deepEqual(resolveLocalizedLatinName({}, 'name', 'name_latin', 'en'), {
    text: '',
    dir: 'rtl',
    isFallback: false,
  });
});

test('resolveLocalizedList cleans arrays and falls back to Arabic when localized list is empty', () => {
  const course = {
    learning_outcomes: [' إتقان المخارج ', '', '   ', null, 'أحكام النون الساكنة'],
    learning_outcomes_en: [' Master articulation points ', '  ', 'Noon Sakinah rules'],
    learning_outcomes_tr: ['   ', ''],
  };

  assert.deepEqual(resolveLocalizedList(course, 'learning_outcomes', 'ar'), {
    items: ['إتقان المخارج', 'أحكام النون الساكنة'],
    dir: 'rtl',
    isFallback: false,
  });

  assert.deepEqual(resolveLocalizedList(course, 'learning_outcomes', 'en'), {
    items: ['Master articulation points', 'Noon Sakinah rules'],
    dir: 'ltr',
    isFallback: false,
  });

  assert.deepEqual(resolveLocalizedList(course, 'learning_outcomes', 'tr'), {
    items: ['إتقان المخارج', 'أحكام النون الساكنة'],
    dir: 'rtl',
    isFallback: true,
  });

  assert.deepEqual(resolveLocalizedList(null, 'learning_outcomes', 'en'), {
    items: [],
    dir: 'rtl',
    isFallback: false,
  });

  assert.deepEqual(
    resolveLocalizedList({ learning_outcomes: [], learning_outcomes_en: null }, 'learning_outcomes', 'en'),
    {
      items: [],
      dir: 'rtl',
      isFallback: false,
    },
  );
});

test('resolveLocalizedOptions keeps canonical Arabic values and resolves per-index labels with fallback', () => {
  const competition = {
    available_levels: ['القرآن كاملاً', 'نصف القرآن', 'عشرة أجزاء'],
    available_levels_en: ['Full Quran', '', 'Ten Juz'],
    available_levels_tr: ['Tam Kur’an'],
  };

  assert.deepEqual(resolveLocalizedOptions(competition, 'available_levels', 'ar'), [
    { value: 'القرآن كاملاً', label: 'القرآن كاملاً', dir: 'rtl', isFallback: false },
    { value: 'نصف القرآن', label: 'نصف القرآن', dir: 'rtl', isFallback: false },
    { value: 'عشرة أجزاء', label: 'عشرة أجزاء', dir: 'rtl', isFallback: false },
  ]);

  assert.deepEqual(resolveLocalizedOptions(competition, 'available_levels', 'en'), [
    { value: 'القرآن كاملاً', label: 'Full Quran', dir: 'ltr', isFallback: false },
    { value: 'نصف القرآن', label: 'نصف القرآن', dir: 'rtl', isFallback: true },
    { value: 'عشرة أجزاء', label: 'Ten Juz', dir: 'ltr', isFallback: false },
  ]);

  assert.deepEqual(resolveLocalizedOptions(competition, 'available_levels', 'tr'), [
    { value: 'القرآن كاملاً', label: 'Tam Kur’an', dir: 'ltr', isFallback: false },
    { value: 'نصف القرآن', label: 'نصف القرآن', dir: 'rtl', isFallback: true },
    { value: 'عشرة أجزاء', label: 'عشرة أجزاء', dir: 'rtl', isFallback: true },
  ]);

  // Preserves index alignment if raw Arabic array contains an empty entry
  const sparse = {
    available_levels: ['', 'جزء عم'],
    available_levels_en: ['Unused', 'Juz Amma'],
  };
  assert.deepEqual(resolveLocalizedOptions(sparse, 'available_levels', 'en'), [
    { value: 'جزء عم', label: 'Juz Amma', dir: 'ltr', isFallback: false },
  ]);

  assert.deepEqual(resolveLocalizedOptions(null, 'available_levels', 'en'), []);
});

test('getLocalizedOptionLabel maps canonical Arabic value to localized label or falls back', () => {
  const competition = {
    available_levels: ['القرآن كاملاً', 'نصف القرآن', 'عشرة أجزاء'],
    available_levels_en: ['Full Quran', '  ', 'Ten Juz'],
    available_levels_tr: ['Tam Kur’an', 'Yarım Kur’an'],
  };

  assert.deepEqual(
    getLocalizedOptionLabel(competition, 'available_levels', 'القرآن كاملاً', 'ar'),
    { text: 'القرآن كاملاً', dir: 'rtl', isFallback: false },
  );

  assert.deepEqual(
    getLocalizedOptionLabel(competition, 'available_levels', '  عشرة أجزاء  ', 'en'),
    { text: 'Ten Juz', dir: 'ltr', isFallback: false },
  );

  assert.deepEqual(
    getLocalizedOptionLabel(competition, 'available_levels', 'نصف القرآن', 'en'),
    { text: 'نصف القرآن', dir: 'rtl', isFallback: true },
  );

  assert.deepEqual(
    getLocalizedOptionLabel(competition, 'available_levels', 'نصف القرآن', 'tr'),
    { text: 'Yarım Kur’an', dir: 'ltr', isFallback: false },
  );

  // Unknown stored value falls back to canonical string in RTL
  assert.deepEqual(
    getLocalizedOptionLabel(competition, 'available_levels', 'خمسة أجزاء', 'en'),
    { text: 'خمسة أجزاء', dir: 'rtl', isFallback: true },
  );

  // Empty canonical value
  assert.deepEqual(
    getLocalizedOptionLabel(competition, 'available_levels', '', 'en'),
    { text: '', dir: 'rtl', isFallback: false },
  );
});

test('getMissingTranslations handles null inputs and TEACHER_TRANSLATION_SPECS', () => {
  assert.deepEqual(getMissingTranslations(null, TEACHER_TRANSLATION_SPECS), {
    missingEn: false,
    missingTr: false,
    missingLanguages: [],
  });

  // Missing name_latin marks both EN and TR missing
  assert.deepEqual(
    getMissingTranslations({ name: 'أحمد', name_latin: '', bio: '' }, TEACHER_TRANSLATION_SPECS),
    {
      missingEn: true,
      missingTr: true,
      missingLanguages: ['en', 'tr'],
    },
  );

  // Present name_latin with empty Arabic bio -> complete
  assert.deepEqual(
    getMissingTranslations({ name: 'أحمد', name_latin: 'Ahmed', bio: null }, TEACHER_TRANSLATION_SPECS),
    {
      missingEn: false,
      missingTr: false,
      missingLanguages: [],
    },
  );

  // Non-empty Arabic bio missing only Turkish -> missingTr only
  assert.deepEqual(
    getMissingTranslations(
      {
        name: 'أحمد',
        name_latin: 'Ahmed',
        bio: 'معلم قرآن',
        bio_en: 'Quran teacher',
        bio_tr: '',
      },
      TEACHER_TRANSLATION_SPECS,
    ),
    {
      missingEn: false,
      missingTr: true,
      missingLanguages: ['tr'],
    },
  );
});

test('getMissingTranslations evaluates COURSE_TRANSLATION_SPECS including conditional price & list', () => {
  const freeCourse = {
    is_free: true,
    name: 'دورة مجانية',
    name_en: 'Free Course',
    name_tr: 'Ücretsiz Kurs',
    short_description: 'وصف',
    short_description_en: 'Desc',
    short_description_tr: 'Açıklama',
    price: '١٠٠ جنيه',
    price_en: null,
    price_tr: null,
    teacher_name: '',
    teacher_name_latin: '',
    learning_outcomes: [],
    learning_outcomes_en: [],
    learning_outcomes_tr: [],
  };

  // Price is ignored when is_free is true; optional empty fields are ignored
  assert.deepEqual(getMissingTranslations(freeCourse, COURSE_TRANSLATION_SPECS), {
    missingEn: false,
    missingTr: false,
    missingLanguages: [],
  });

  // Paid course with non-empty price missing EN price
  assert.deepEqual(
    getMissingTranslations(
      { ...freeCourse, is_free: false, price_tr: '100 TL' },
      COURSE_TRANSLATION_SPECS,
    ),
    {
      missingEn: true,
      missingTr: false,
      missingLanguages: ['en'],
    },
  );

  // Non-empty learning_outcomes missing TR items
  assert.deepEqual(
    getMissingTranslations(
      {
        ...freeCourse,
        learning_outcomes: ['مخرج'],
        learning_outcomes_en: ['Outcome'],
        learning_outcomes_tr: ['  '],
      },
      COURSE_TRANSLATION_SPECS,
    ),
    {
      missingEn: false,
      missingTr: true,
      missingLanguages: ['tr'],
    },
  );

  // Non-empty teacher_name without teacher_name_latin marks both EN & TR
  assert.deepEqual(
    getMissingTranslations(
      { ...freeCourse, teacher_name: 'الشيخ محمد', teacher_name_latin: '' },
      COURSE_TRANSLATION_SPECS,
    ),
    {
      missingEn: true,
      missingTr: true,
      missingLanguages: ['en', 'tr'],
    },
  );
});

test('getMissingTranslations evaluates COMPETITION_TRANSLATION_SPECS including per-index options', () => {
  const completeCompetition = {
    name: 'مسابقة رمضان',
    name_en: 'Ramadan Competition',
    name_tr: 'Ramazan Yarışması',
    short_description: 'مختصر',
    short_description_en: 'Short',
    short_description_tr: 'Kısa',
    complete_description: 'كامل',
    complete_description_en: 'Complete',
    complete_description_tr: 'Tam',
    awards_short_description: null,
    awards_complete_description: '',
    participation_terms: 'شروط',
    participation_terms_en: 'Terms',
    participation_terms_tr: 'Şartlar',
    available_levels: ['القرآن كاملاً', 'نصف القرآن'],
    available_levels_en: ['Full Quran', 'Half Quran'],
    available_levels_tr: ['Tam Kur’an', 'Yarım Kur’an'],
  };

  assert.deepEqual(
    getMissingTranslations(completeCompetition, COMPETITION_TRANSLATION_SPECS),
    {
      missingEn: false,
      missingTr: false,
      missingLanguages: [],
    },
  );

  // Missing second Turkish level marks TR missing
  assert.deepEqual(
    getMissingTranslations(
      {
        ...completeCompetition,
        available_levels_tr: ['Tam Kur’an', ''],
      },
      COMPETITION_TRANSLATION_SPECS,
    ),
    {
      missingEn: false,
      missingTr: true,
      missingLanguages: ['tr'],
    },
  );
});

test('getMissingTranslations evaluates LECTURE, STAGE, FAQ, and PAGE specs', () => {
  assert.deepEqual(
    getMissingTranslations(
      {
        title: 'الدرس الأول',
        title_en: 'Lesson 1',
        title_tr: 'Ders 1',
        description: '',
      },
      LECTURE_TRANSLATION_SPECS,
    ),
    { missingEn: false, missingTr: false, missingLanguages: [] },
  );

  assert.deepEqual(
    getMissingTranslations(
      {
        name: 'المرحلة الأولى',
        name_en: 'Stage 1',
        name_tr: '',
        description: null,
      },
      STAGE_TRANSLATION_SPECS,
    ),
    { missingEn: false, missingTr: true, missingLanguages: ['tr'] },
  );

  assert.deepEqual(
    getMissingTranslations(
      {
        question: 'سؤال',
        question_en: '',
        question_tr: 'Soru',
        answer: 'إجابة',
        answer_en: 'Answer',
        answer_tr: 'Cevap',
      },
      FAQ_TRANSLATION_SPECS,
    ),
    { missingEn: true, missingTr: false, missingLanguages: ['en'] },
  );

  assert.deepEqual(
    getMissingTranslations(
      {
        title: 'من نحن',
        title_en: 'About Us',
        title_tr: 'Hakkımızda',
        content: 'محتوى',
        content_en: 'Content',
        content_tr: 'İçerik',
      },
      PAGE_TRANSLATION_SPECS,
    ),
    { missingEn: false, missingTr: false, missingLanguages: [] },
  );
});
