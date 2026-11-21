/* global process */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_DIR,
  LANGUAGE_LABELS,
  LANGUAGE_LOCALE,
  PREFIXED_LANGUAGES,
  STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  SWITCHER_ENABLED,
} from '../src/i18n/config.js';
import {
  getLanguageFromPath,
  isAdminPath,
  localizePath,
  normalizeLanguage,
  replaceLanguageInPath,
  stripLanguagePrefix,
} from '../src/i18n/routing.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

test('i18n config exports expected language metadata and defaults', () => {
  assert.deepEqual(SUPPORTED_LANGUAGES, ['ar', 'en', 'tr']);
  assert.equal(DEFAULT_LANGUAGE, 'ar');
  assert.deepEqual(PREFIXED_LANGUAGES, ['en', 'tr']);
  assert.deepEqual(LANGUAGE_DIR, { ar: 'rtl', en: 'ltr', tr: 'ltr' });
  assert.deepEqual(LANGUAGE_LOCALE, { ar: 'ar-EG', en: 'en-GB', tr: 'tr-TR' });
  assert.deepEqual(LANGUAGE_LABELS, {
    ar: 'العربية',
    en: 'English',
    tr: 'Türkçe',
  });
  assert.equal(STORAGE_KEY, 'habl_lang');
  assert.equal(typeof SWITCHER_ENABLED, 'boolean');
});

test('normalizeLanguage normalizes regional tags and falls back to ar', () => {
  assert.equal(normalizeLanguage('ar'), 'ar');
  assert.equal(normalizeLanguage('ar-EG'), 'ar');
  assert.equal(normalizeLanguage('en'), 'en');
  assert.equal(normalizeLanguage('EN-GB'), 'en');
  assert.equal(normalizeLanguage('tr-TR'), 'tr');
  assert.equal(normalizeLanguage('fr'), 'ar');
  assert.equal(normalizeLanguage(''), 'ar');
  assert.equal(normalizeLanguage(null), 'ar');
  assert.equal(normalizeLanguage(undefined), 'ar');
});

test('isAdminPath detects unprefixed and language-prefixed admin routes only at boundaries', () => {
  assert.equal(isAdminPath('/admin'), true);
  assert.equal(isAdminPath('/admin/login'), true);
  assert.equal(isAdminPath('/en/admin/quran'), true);
  assert.equal(isAdminPath('/tr/admin/quran/users/1'), true);
  assert.equal(isAdminPath('/admin?tab=1'), true);
  assert.equal(isAdminPath('/admin#top'), true);

  assert.equal(isAdminPath('/administrator'), false);
  assert.equal(isAdminPath('/en/administrator'), false);
  assert.equal(isAdminPath('/quran/courses'), false);
  assert.equal(isAdminPath(''), false);
  assert.equal(isAdminPath(null), false);
});

test('getLanguageFromPath resolves prefixed routes, respects word boundaries, and forces ar for admin', () => {
  assert.equal(getLanguageFromPath('/'), 'ar');
  assert.equal(getLanguageFromPath('/quran/courses'), 'ar');
  assert.equal(getLanguageFromPath('/en'), 'en');
  assert.equal(getLanguageFromPath('/en/'), 'en');
  assert.equal(getLanguageFromPath('/tr/quran?a=1#top'), 'tr');
  assert.equal(getLanguageFromPath('/en?tab=1'), 'en');
  assert.equal(getLanguageFromPath('/tr#top'), 'tr');

  // Must not partially match /english or /turkey
  assert.equal(getLanguageFromPath('/english'), 'ar');
  assert.equal(getLanguageFromPath('/turkey'), 'ar');

  // Admin is always Arabic
  assert.equal(getLanguageFromPath('/admin/login'), 'ar');
  assert.equal(getLanguageFromPath('/en/admin/quran'), 'ar');
  assert.equal(getLanguageFromPath('/tr/admin/quran/users/1'), 'ar');

  assert.equal(getLanguageFromPath(''), 'ar');
  assert.equal(getLanguageFromPath(null), 'ar');
});

test('stripLanguagePrefix removes /en and /tr prefixes while preserving query/hash and non-prefix slugs', () => {
  assert.equal(stripLanguagePrefix('/'), '/');
  assert.equal(stripLanguagePrefix('/en'), '/');
  assert.equal(stripLanguagePrefix('/en/'), '/');
  assert.equal(stripLanguagePrefix('/tr/quran?a=1#top'), '/quran?a=1#top');
  assert.equal(stripLanguagePrefix('/en?a=1'), '/?a=1');
  assert.equal(stripLanguagePrefix('/tr#top'), '/#top');
  assert.equal(stripLanguagePrefix('/english'), '/english');
  assert.equal(stripLanguagePrefix('/turkey'), '/turkey');
  assert.equal(stripLanguagePrefix('/admin/login'), '/admin/login');
  assert.equal(stripLanguagePrefix(''), '/');
  assert.equal(stripLanguagePrefix(null), '/');
});

test('localizePath prefixes internal paths appropriately and leaves special/admin/external paths unchanged', () => {
  // Arabic default remains unprefixed
  assert.equal(localizePath('/', 'ar'), '/');
  assert.equal(localizePath('/quran/courses', 'ar'), '/quran/courses');

  // Non-default prefixes
  assert.equal(localizePath('/', 'en'), '/en');
  assert.equal(localizePath('/quran', 'en'), '/en/quran');
  assert.equal(localizePath('/quran?a=1#top', 'tr'), '/tr/quran?a=1#top');
  assert.equal(localizePath('/?a=1', 'en'), '/en?a=1');
  assert.equal(localizePath('/#about', 'tr'), '/tr#about');

  // Must not mistake /english or /turkey for already-prefixed paths
  assert.equal(localizePath('/english', 'tr'), '/tr/english');
  assert.equal(localizePath('/turkey', 'en'), '/en/turkey');

  // Already-prefixed paths stay untouched
  assert.equal(localizePath('/en', 'tr'), '/en');
  assert.equal(localizePath('/en/', 'tr'), '/en/');
  assert.equal(localizePath('/tr/quran?a=1#top', 'en'), '/tr/quran?a=1#top');

  // Admin paths stay unprefixed
  assert.equal(localizePath('/admin/login', 'en'), '/admin/login');
  assert.equal(localizePath('/en/admin/quran', 'tr'), '/en/admin/quran');
  assert.equal(localizePath('/tr/admin/quran/users/1', 'en'), '/tr/admin/quran/users/1');

  // External URLs, hashes, queries, relative paths, and empty/null inputs stay untouched
  assert.equal(localizePath('https://example.com/quran', 'en'), 'https://example.com/quran');
  assert.equal(localizePath('http://example.com', 'tr'), 'http://example.com');
  assert.equal(localizePath('mailto:info@example.com', 'en'), 'mailto:info@example.com');
  assert.equal(localizePath('//cdn.example.com/a.js', 'tr'), '//cdn.example.com/a.js');
  assert.equal(localizePath('#about', 'en'), '#about');
  assert.equal(localizePath('?tab=1', 'tr'), '?tab=1');
  assert.equal(localizePath('foo/bar', 'en'), 'foo/bar');
  assert.equal(localizePath('', 'en'), '');
  assert.equal(localizePath(null, 'en'), null);
});

test('replaceLanguageInPath switches prefixes cleanly and keeps admin routes unprefixed', () => {
  assert.equal(replaceLanguageInPath('/', 'en'), '/en');
  assert.equal(replaceLanguageInPath('/en', 'tr'), '/tr');
  assert.equal(replaceLanguageInPath('/en/', 'ar'), '/');
  assert.equal(replaceLanguageInPath('/tr/quran?a=1#top', 'en'), '/en/quran?a=1#top');
  assert.equal(replaceLanguageInPath('/tr/quran?a=1#top', 'ar'), '/quran?a=1#top');
  assert.equal(replaceLanguageInPath('/english', 'en'), '/en/english');
  assert.equal(replaceLanguageInPath('/turkey', 'tr'), '/tr/turkey');
  assert.equal(replaceLanguageInPath('/admin/login', 'en'), '/admin/login');
  assert.equal(replaceLanguageInPath('/en/admin/quran', 'tr'), '/admin/quran');
  assert.equal(replaceLanguageInPath('/tr/admin/quran/users/1', 'ar'), '/admin/quran/users/1');
});

test('scripts/check-locales.mjs passes on the repository src/locales directory', () => {
  const scriptPath = path.join(REPO_ROOT, 'scripts/check-locales.mjs');
  const localesDir = path.join(REPO_ROOT, 'src/locales');
  const stdout = execFileSync(process.execPath, [scriptPath, localesDir], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  assert.match(stdout, /\[i18n:check\] OK:/);
});
