import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DEFAULT_LANGUAGE, LANGUAGE_DIR, LANGUAGE_LOCALE } from './config.js';
import {
  getLocalizedField,
  getLocalizedOptionLabel,
  resolveLocalizedField,
  resolveLocalizedLatinName,
  resolveLocalizedList,
  resolveLocalizedOptions,
} from './content.js';
import { localizePath, normalizeLanguage } from './routing.js';

export { LocalizedLink, LocalizedNavLink, DirectionalIcon } from './components.jsx';

/**
 * Returns the active normalized language code, text direction, BCP 47 locale, and isRTL flag.
 */
export function useLanguage() {
  const { i18n } = useTranslation();
  const language = normalizeLanguage(i18n.language);
  const dir = LANGUAGE_DIR[language] || 'rtl';
  const locale = LANGUAGE_LOCALE[language] || LANGUAGE_LOCALE[DEFAULT_LANGUAGE];
  return {
    language,
    dir,
    locale,
    isRTL: dir === 'rtl',
  };
}

/**
 * Returns a memoized helper `(path) => localizedPath` for the current language.
 */
export function useLocalizedPath() {
  const { language } = useLanguage();
  return useCallback((path) => localizePath(path, language), [language]);
}

/**
 * Drop-in wrapper around react-router-dom's useNavigate that localizes string
 * and Location-object targets while leaving numeric deltas (e.g. -1) unchanged.
 */
export function useLocalizedNavigate() {
  const navigate = useNavigate();
  const { language } = useLanguage();

  return useCallback(
    (to, options) => {
      if (typeof to === 'number') {
        navigate(to);
        return;
      }
      if (typeof to === 'string') {
        navigate(localizePath(to, language), options);
        return;
      }
      if (to && typeof to === 'object' && typeof to.pathname === 'string') {
        navigate(
          {
            ...to,
            pathname: localizePath(to.pathname, language),
          },
          options,
        );
        return;
      }
      navigate(to, options);
    },
    [navigate, language],
  );
}

/**
 * Returns locale-aware date and number formatters bound to the current language's
 * BCP 47 locale (ar-EG, en-GB, tr-TR).
 */
export function useFormatters() {
  const { locale } = useLanguage();

  const formatDate = useCallback(
    (value, options) => {
      if (value === null || value === undefined || value === '') return '';
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      return new Intl.DateTimeFormat(locale, options).format(date);
    },
    [locale],
  );

  const formatNumber = useCallback(
    (value, options) => {
      if (value === null || value === undefined || value === '') return '';
      const num = typeof value === 'number' ? value : Number(value);
      if (Number.isNaN(num)) return '';
      return new Intl.NumberFormat(locale, options).format(num);
    },
    [locale],
  );

  return useMemo(
    () => ({ formatDate, formatNumber, locale }),
    [formatDate, formatNumber, locale],
  );
}

/**
 * Returns memoized DB-content localization helpers bound to the active language.
 */
export function useLocalizedContent() {
  const { language } = useLanguage();

  return useMemo(
    () => ({
      language,
      field: (record, fieldName) => resolveLocalizedField(record, fieldName, language),
      text: (record, fieldName) => getLocalizedField(record, fieldName, language),
      latinName: (record, fieldName = 'name', latinField = `${fieldName}_latin`) =>
        resolveLocalizedLatinName(record, fieldName, latinField, language),
      list: (record, fieldName) => resolveLocalizedList(record, fieldName, language),
      options: (record, fieldName) => resolveLocalizedOptions(record, fieldName, language),
      optionLabel: (record, fieldName, canonicalValue) =>
        getLocalizedOptionLabel(record, fieldName, canonicalValue, language),
    }),
    [language],
  );
}
