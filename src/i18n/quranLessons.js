import { DEFAULT_LANGUAGE } from './config.js';
import { normalizeLanguage } from './routing.js';

export const QURAN_SURAHS = [
  { number: 1, ar: 'الفاتحة', en: 'Al-Fatihah', tr: 'Fâtiha' },
  { number: 2, ar: 'البقرة', en: 'Al-Baqarah', tr: 'Bakara' },
  { number: 3, ar: 'آل عمران', en: 'Aal-Imran', tr: 'Âl-i İmrân' },
  { number: 4, ar: 'النساء', en: 'An-Nisa', tr: 'Nisâ' },
  { number: 5, ar: 'المائدة', en: "Al-Ma'idah", tr: 'Mâide' },
  { number: 6, ar: 'الأنعام', en: "Al-An'am", tr: "En'âm" },
  { number: 7, ar: 'الأعراف', en: "Al-A'raf", tr: "A'râf" },
  { number: 8, ar: 'الأنفال', en: 'Al-Anfal', tr: 'Enfâl' },
  { number: 9, ar: 'التوبة', en: 'At-Tawbah', tr: 'Tevbe', aliases: ['براءة'] },
  { number: 10, ar: 'يونس', en: 'Yunus', tr: 'Yûnus' },
  { number: 11, ar: 'هود', en: 'Hud', tr: 'Hûd' },
  { number: 12, ar: 'يوسف', en: 'Yusuf', tr: 'Yûsuf' },
  { number: 13, ar: 'الرعد', en: "Ar-Ra'd", tr: "Ra'd" },
  { number: 14, ar: 'إبراهيم', en: 'Ibrahim', tr: 'İbrâhîm' },
  { number: 15, ar: 'الحجر', en: 'Al-Hijr', tr: 'Hicr' },
  { number: 16, ar: 'النحل', en: 'An-Nahl', tr: 'Nahl' },
  { number: 17, ar: 'الإسراء', en: 'Al-Isra', tr: 'İsrâ', aliases: ['بني إسرائيل'] },
  { number: 18, ar: 'الكهف', en: 'Al-Kahf', tr: 'Kehf' },
  { number: 19, ar: 'مريم', en: 'Maryam', tr: 'Meryem' },
  { number: 20, ar: 'طه', en: 'Ta-Ha', tr: 'Tâhâ' },
  { number: 21, ar: 'الأنبياء', en: 'Al-Anbiya', tr: 'Enbiyâ' },
  { number: 22, ar: 'الحج', en: 'Al-Hajj', tr: 'Hac' },
  { number: 23, ar: 'المؤمنون', en: "Al-Mu'minun", tr: "Mü'minûn" },
  { number: 24, ar: 'النور', en: 'An-Nur', tr: 'Nûr' },
  { number: 25, ar: 'الفرقان', en: 'Al-Furqan', tr: 'Furkân' },
  { number: 26, ar: 'الشعراء', en: "Ash-Shu'ara", tr: 'Şuarâ' },
  { number: 27, ar: 'النمل', en: 'An-Naml', tr: 'Neml' },
  { number: 28, ar: 'القصص', en: 'Al-Qasas', tr: 'Kasas' },
  { number: 29, ar: 'العنكبوت', en: 'Al-Ankabut', tr: 'Ankebût' },
  { number: 30, ar: 'الروم', en: 'Ar-Rum', tr: 'Rûm' },
  { number: 31, ar: 'لقمان', en: 'Luqman', tr: 'Lokmân' },
  { number: 32, ar: 'السجدة', en: 'As-Sajdah', tr: 'Secde' },
  { number: 33, ar: 'الأحزاب', en: 'Al-Ahzab', tr: 'Ahzâb' },
  { number: 34, ar: 'سبأ', en: 'Saba', tr: "Sebe'" },
  { number: 35, ar: 'فاطر', en: 'Fatir', tr: 'Fâtır' },
  { number: 36, ar: 'يس', en: 'Ya-Sin', tr: 'Yâsîn', aliases: ['ياسين'] },
  { number: 37, ar: 'الصافات', en: 'As-Saffat', tr: 'Sâffât' },
  { number: 38, ar: 'ص', en: 'Sad', tr: 'Sâd', aliases: ['صاد'] },
  { number: 39, ar: 'الزمر', en: 'Az-Zumar', tr: 'Zümer' },
  { number: 40, ar: 'غافر', en: 'Ghafir', tr: "Mü'min", aliases: ['المؤمن'] },
  { number: 41, ar: 'فصلت', en: 'Fussilat', tr: 'Fussilet' },
  { number: 42, ar: 'الشورى', en: 'Ash-Shura', tr: 'Şûrâ' },
  { number: 43, ar: 'الزخرف', en: 'Az-Zukhruf', tr: 'Zuhruf' },
  { number: 44, ar: 'الدخان', en: 'Ad-Dukhan', tr: 'Duhân' },
  { number: 45, ar: 'الجاثية', en: 'Al-Jathiyah', tr: 'Câsiye' },
  { number: 46, ar: 'الأحقاف', en: 'Al-Ahqaf', tr: 'Ahkâf' },
  { number: 47, ar: 'محمد', en: 'Muhammad', tr: 'Muhammed' },
  { number: 48, ar: 'الفتح', en: 'Al-Fath', tr: 'Fetih' },
  { number: 49, ar: 'الحجرات', en: 'Al-Hujurat', tr: 'Hucurât' },
  { number: 50, ar: 'ق', en: 'Qaf', tr: 'Kâf', aliases: ['قاف'] },
  { number: 51, ar: 'الذاريات', en: 'Adh-Dhariyat', tr: 'Zâriyât' },
  { number: 52, ar: 'الطور', en: 'At-Tur', tr: 'Tûr' },
  { number: 53, ar: 'النجم', en: 'An-Najm', tr: 'Necm' },
  { number: 54, ar: 'القمر', en: 'Al-Qamar', tr: 'Kamer' },
  { number: 55, ar: 'الرحمن', en: 'Ar-Rahman', tr: 'Rahmân' },
  { number: 56, ar: 'الواقعة', en: "Al-Waqi'ah", tr: 'Vâkıa' },
  { number: 57, ar: 'الحديد', en: 'Al-Hadid', tr: 'Hadîd' },
  { number: 58, ar: 'المجادلة', en: 'Al-Mujadila', tr: 'Mücâdele', aliases: ['المجادل'] },
  { number: 59, ar: 'الحشر', en: 'Al-Hashr', tr: 'Haşr' },
  { number: 60, ar: 'الممتحنة', en: 'Al-Mumtahanah', tr: 'Mümtehine' },
  { number: 61, ar: 'الصف', en: 'As-Saff', tr: 'Saf' },
  { number: 62, ar: 'الجمعة', en: "Al-Jumu'ah", tr: 'Cuma' },
  { number: 63, ar: 'المنافقون', en: 'Al-Munafiqun', tr: 'Münâfikûn' },
  { number: 64, ar: 'التغابن', en: 'At-Taghabun', tr: 'Teğâbün' },
  { number: 65, ar: 'الطلاق', en: 'At-Talaq', tr: 'Talâk' },
  { number: 66, ar: 'التحريم', en: 'At-Tahrim', tr: 'Tahrîm' },
  { number: 67, ar: 'الملك', en: 'Al-Mulk', tr: 'Mülk', aliases: ['تبارك'] },
  { number: 68, ar: 'القلم', en: 'Al-Qalam', tr: 'Kalem', aliases: ['ن'] },
  { number: 69, ar: 'الحاقة', en: 'Al-Haqqah', tr: 'Hâkka' },
  { number: 70, ar: 'المعارج', en: "Al-Ma'arij", tr: 'Meâric' },
  { number: 71, ar: 'نوح', en: 'Nuh', tr: 'Nûh' },
  { number: 72, ar: 'الجن', en: 'Al-Jinn', tr: 'Cin' },
  { number: 73, ar: 'المزمل', en: 'Al-Muzzammil', tr: 'Müzzemmil' },
  { number: 74, ar: 'المدثر', en: 'Al-Muddaththir', tr: 'Müddessir' },
  { number: 75, ar: 'القيامة', en: 'Al-Qiyamah', tr: 'Kıyâmet' },
  { number: 76, ar: 'الإنسان', en: 'Al-Insan', tr: 'İnsân', aliases: ['الدهر'] },
  { number: 77, ar: 'المرسلات', en: 'Al-Mursalat', tr: 'Mürselât' },
  { number: 78, ar: 'النبأ', en: 'An-Naba', tr: "Nebe'", aliases: ['عم'] },
  { number: 79, ar: 'النازعات', en: "An-Nazi'at", tr: 'Nâziât' },
  { number: 80, ar: 'عبس', en: 'Abasa', tr: 'Abese' },
  { number: 81, ar: 'التكوير', en: 'At-Takwir', tr: 'Tekvîr' },
  { number: 82, ar: 'الانفطار', en: 'Al-Infitar', tr: 'İnfitâr' },
  { number: 83, ar: 'المطففين', en: 'Al-Mutaffifin', tr: 'Mutaffifîn' },
  { number: 84, ar: 'الانشقاق', en: 'Al-Inshiqaq', tr: 'İnşikâk' },
  { number: 85, ar: 'البروج', en: 'Al-Buruj', tr: 'Burûc' },
  { number: 86, ar: 'الطارق', en: 'At-Tariq', tr: 'Târık' },
  { number: 87, ar: 'الأعلى', en: "Al-A'la", tr: "A'lâ" },
  { number: 88, ar: 'الغاشية', en: 'Al-Ghashiyah', tr: 'Gâşiye' },
  { number: 89, ar: 'الفجر', en: 'Al-Fajr', tr: 'Fecr' },
  { number: 90, ar: 'البلد', en: 'Al-Balad', tr: 'Beled' },
  { number: 91, ar: 'الشمس', en: 'Ash-Shams', tr: 'Şems' },
  { number: 92, ar: 'الليل', en: 'Al-Layl', tr: 'Leyl' },
  { number: 93, ar: 'الضحى', en: 'Ad-Duha', tr: 'Duhâ' },
  { number: 94, ar: 'الشرح', en: 'Ash-Sharh', tr: 'İnşirâh', aliases: ['الانشراح'] },
  { number: 95, ar: 'التين', en: 'At-Tin', tr: 'Tîn' },
  { number: 96, ar: 'العلق', en: 'Al-Alaq', tr: 'Alak', aliases: ['اقرأ'] },
  { number: 97, ar: 'القدر', en: 'Al-Qadr', tr: 'Kadir' },
  { number: 98, ar: 'البينة', en: 'Al-Bayyinah', tr: 'Beyyine' },
  { number: 99, ar: 'الزلزلة', en: 'Az-Zalzalah', tr: 'Zilzâl', aliases: ['الزلزال'] },
  { number: 100, ar: 'العاديات', en: 'Al-Adiyat', tr: 'Âdiyât' },
  { number: 101, ar: 'القارعة', en: "Al-Qari'ah", tr: 'Kâria' },
  { number: 102, ar: 'التكاثر', en: 'At-Takathur', tr: 'Tekâsür' },
  { number: 103, ar: 'العصر', en: 'Al-Asr', tr: 'Asr' },
  { number: 104, ar: 'الهمزة', en: 'Al-Humazah', tr: 'Hümeze' },
  { number: 105, ar: 'الفيل', en: 'Al-Fil', tr: 'Fîl' },
  { number: 106, ar: 'قريش', en: 'Quraysh', tr: 'Kureyş' },
  { number: 107, ar: 'الماعون', en: "Al-Ma'un", tr: 'Mâûn' },
  { number: 108, ar: 'الكوثر', en: 'Al-Kawthar', tr: 'Kevser' },
  { number: 109, ar: 'الكافرون', en: 'Al-Kafirun', tr: 'Kâfirûn' },
  { number: 110, ar: 'النصر', en: 'An-Nasr', tr: 'Nasr' },
  { number: 111, ar: 'المسد', en: 'Al-Masad', tr: 'Tebbet', aliases: ['اللهب', 'تبت'] },
  { number: 112, ar: 'الإخلاص', en: 'Al-Ikhlas', tr: 'İhlâs', aliases: ['التوحيد'] },
  { number: 113, ar: 'الفلق', en: 'Al-Falaq', tr: 'Felak' },
  { number: 114, ar: 'الناس', en: 'An-Nas', tr: 'Nâs' },
];

const LESSON_LEVEL_KEYS = {
  ممتاز: 'excellent',
  'جيد جدا': 'veryGood',
  جيد: 'good',
  مقبول: 'acceptable',
  ضعيف: 'weak',
};

/**
 * Normalize Arabic lookup strings by removing diacritics/tatweel, standardizing
 * hamza/alef/taa-marbuta/yaa forms, and stripping an optional "سورة " prefix.
 */
export function normalizeArabicLookup(value) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^سوره\s+/, '');
}

const SURAH_BY_NORMALIZED_AR = new Map();

for (const surah of QURAN_SURAHS) {
  const names = [surah.ar, ...(surah.aliases ?? [])];
  for (const name of names) {
    const normalized = normalizeArabicLookup(name);
    if (normalized) {
      SURAH_BY_NORMALIZED_AR.set(normalized, surah);
    }
  }
}

function findSurahEntry(arabicText) {
  const normalized = normalizeArabicLookup(arabicText);
  if (!normalized) return null;
  return SURAH_BY_NORMALIZED_AR.get(normalized) ?? null;
}

/**
 * Look up the localized English or Turkish Surah name for an Arabic Surah entry.
 * Returns null for Arabic or unrecognized free-text strings.
 */
export function lookupSurahTranslation(arabicText, lang = DEFAULT_LANGUAGE) {
  const normalizedLang = normalizeLanguage(lang);
  if (normalizedLang === DEFAULT_LANGUAGE) return null;

  const entry = findSurahEntry(arabicText);
  if (!entry) return null;
  return entry[normalizedLang] ?? null;
}

/**
 * Returns true when the input matches one of the 114 Quran Surahs (or known aliases).
 */
export function isKnownArabicSurah(arabicText) {
  return Boolean(findSurahEntry(arabicText));
}

/**
 * Resolve a lesson's Surah field, preferring an explicit `<field>_en`/`<field>_tr`
 * value, falling back to automatic 114-Surah lookup, and finally falling back to
 * Arabic RTL when the text is custom/untranslatable.
 */
export function resolveLessonSurah(lesson, fieldName, lang = DEFAULT_LANGUAGE) {
  const normalizedLang = normalizeLanguage(lang);
  const rawAr = lesson?.[fieldName];
  const arabicText =
    rawAr === null || rawAr === undefined
      ? ''
      : typeof rawAr === 'string'
        ? rawAr
        : String(rawAr);

  if (normalizedLang === DEFAULT_LANGUAGE) {
    return {
      text: arabicText,
      dir: 'rtl',
      isFallback: false,
    };
  }

  const explicit = lesson?.[`${fieldName}_${normalizedLang}`];
  if (typeof explicit === 'string' && explicit.trim() !== '') {
    return {
      text: explicit.trim(),
      dir: 'ltr',
      isFallback: false,
    };
  }

  const autoSurah = lookupSurahTranslation(arabicText, normalizedLang);
  if (autoSurah) {
    return {
      text: autoSurah,
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
 * Map a canonical Arabic evaluation level to its student.json `lessons.levels.*` key.
 */
export function getLessonLevelKey(rawLevel) {
  const normalized = normalizeArabicLookup(rawLevel);
  if (!normalized) return null;
  return LESSON_LEVEL_KEYS[normalized] ?? null;
}

/**
 * Resolve an evaluation level label using `translateKey(key)` for known levels,
 * falling back to the raw value with appropriate text direction if unrecognized.
 */
export function resolveLessonLevel(rawLevel, lang = DEFAULT_LANGUAGE, translateKey) {
  const rawText =
    rawLevel === null || rawLevel === undefined ? '' : String(rawLevel).trim();
  if (!rawText) {
    return {
      text: '',
      dir: 'rtl',
      isFallback: false,
    };
  }

  const normalizedLang = normalizeLanguage(lang);
  const key = getLessonLevelKey(rawText);

  if (key && typeof translateKey === 'function') {
    const translated = translateKey(key);
    if (typeof translated === 'string' && translated.trim() !== '') {
      return {
        text: translated,
        dir: normalizedLang === DEFAULT_LANGUAGE ? 'rtl' : 'ltr',
        isFallback: false,
      };
    }
  }

  const hasArabic = /[\u0600-\u06FF]/.test(rawText);
  return {
    text: rawText,
    dir: hasArabic ? 'rtl' : 'ltr',
    isFallback: normalizedLang !== DEFAULT_LANGUAGE && hasArabic,
  };
}

/**
 * Format an ayah range endpoint, converting Arabic-Indic digits to ASCII integers
 * and passing pure integers through the active locale's number formatter.
 */
export function formatLessonAyahRef(rawRef, formatNumber) {
  if (rawRef === null || rawRef === undefined) return '';
  const trimmed = String(rawRef).trim();
  if (!trimmed) return '';

  const ascii = trimmed
    .replace(/[\u0660-\u0669]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (digit) => String(digit.charCodeAt(0) - 0x06F0));

  if (/^\d+$/.test(ascii)) {
    const num = Number(ascii);
    if (typeof formatNumber === 'function') {
      return formatNumber(num);
    }
    return ascii;
  }

  return trimmed;
}
