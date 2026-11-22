export const SUPPORTED_LANGUAGES = ['ar', 'en', 'tr'];

export const DEFAULT_LANGUAGE = 'ar';

export const PREFIXED_LANGUAGES = SUPPORTED_LANGUAGES.filter(
  (lang) => lang !== DEFAULT_LANGUAGE,
);

export const LANGUAGE_DIR = {
  ar: 'rtl',
  en: 'ltr',
  tr: 'ltr',
};

export const LANGUAGE_LOCALE = {
  ar: 'ar-EG',
  en: 'en-GB',
  tr: 'tr-TR',
};

export const LANGUAGE_LABELS = {
  ar: 'العربية',
  en: 'English',
  tr: 'Türkçe',
};

export const STORAGE_KEY = 'habl_lang';

export const SWITCHER_ENABLED = Boolean(
  import.meta.env && import.meta.env.VITE_ENABLE_LANGUAGE_SWITCHER === 'true',
);
