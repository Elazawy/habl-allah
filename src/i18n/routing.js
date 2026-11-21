import {
  DEFAULT_LANGUAGE,
  PREFIXED_LANGUAGES,
  STORAGE_KEY,
  SUPPORTED_LANGUAGES,
} from './config.js';

const PREFIX_PATTERN = new RegExp(
  `^\\/(${PREFIXED_LANGUAGES.join('|')})(?=\\/|\\?|#|$)`,
);
const ADMIN_PATTERN = new RegExp(
  `^(?:\\/(?:${PREFIXED_LANGUAGES.join('|')}))?\\/admin(?=\\/|\\?|#|$)`,
);
const EXTERNAL_URL_PATTERN = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

/**
 * Normalize a language tag (e.g. 'en-GB' -> 'en') to a supported language code.
 */
export function normalizeLanguage(lang) {
  if (!lang || typeof lang !== 'string') return DEFAULT_LANGUAGE;
  const base = lang.toLowerCase().split('-')[0];
  return SUPPORTED_LANGUAGES.includes(base) ? base : DEFAULT_LANGUAGE;
}

/**
 * Returns true if the pathname targets the Arabic-only admin area.
 */
export function isAdminPath(pathname = '') {
  if (typeof pathname !== 'string') return false;
  return ADMIN_PATTERN.test(pathname);
}

/**
 * Derive the active language code from a URL pathname.
 * Admin paths always resolve to DEFAULT_LANGUAGE ('ar').
 */
export function getLanguageFromPath(pathname = '/') {
  if (typeof pathname !== 'string' || !pathname) return DEFAULT_LANGUAGE;
  if (isAdminPath(pathname)) return DEFAULT_LANGUAGE;

  const match = pathname.match(PREFIX_PATTERN);
  if (match && SUPPORTED_LANGUAGES.includes(match[1])) {
    return match[1];
  }
  return DEFAULT_LANGUAGE;
}

/**
 * Remove a leading /en or /tr language prefix from a pathname.
 */
export function stripLanguagePrefix(pathname = '/') {
  if (typeof pathname !== 'string' || !pathname) return '/';
  const stripped = pathname.replace(PREFIX_PATTERN, '');
  if (!stripped) return '/';
  return stripped.startsWith('/') ? stripped : `/${stripped}`;
}

/**
 * Prefix an internal absolute path with /en or /tr when lang is non-default.
 * Leaves external URLs, hash-only/query-only links, relative paths, /admin paths,
 * and already-prefixed paths untouched.
 */
export function localizePath(path, lang = DEFAULT_LANGUAGE) {
  if (typeof path !== 'string' || !path) return path;

  if (
    EXTERNAL_URL_PATTERN.test(path) ||
    path.startsWith('#') ||
    path.startsWith('?') ||
    !path.startsWith('/')
  ) {
    return path;
  }

  if (isAdminPath(path)) {
    return path;
  }

  if (PREFIX_PATTERN.test(path)) {
    return path;
  }

  const targetLang = normalizeLanguage(lang);
  if (targetLang === DEFAULT_LANGUAGE) {
    return path;
  }

  if (path === '/') {
    return `/${targetLang}`;
  }

  if (path.startsWith('/?') || path.startsWith('/#')) {
    return `/${targetLang}${path.slice(1)}`;
  }

  return `/${targetLang}${path}`;
}

/**
 * Switch a pathname to a different language (strips any existing prefix first).
 * Admin paths are returned unprefixed.
 */
export function replaceLanguageInPath(pathname, targetLang) {
  const stripped = stripLanguagePrefix(pathname);
  return localizePath(stripped, targetLang);
}

/**
 * Safely read the stored language preference from localStorage.
 */
export function getStoredLanguage() {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value && SUPPORTED_LANGUAGES.includes(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * Safely persist the user's chosen language to localStorage.
 */
export function setStoredLanguage(lang) {
  if (typeof window === 'undefined') return;
  const normalized = normalizeLanguage(lang);
  try {
    window.localStorage.setItem(STORAGE_KEY, normalized);
  } catch {
    // Ignore storage failures (e.g. private mode / blocked cookies)
  }
}
