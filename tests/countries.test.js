import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COUNTRY_OPTIONS,
  DEFAULT_COUNTRY,
  filterCountryOptions,
  getCountryOptions,
  guessCountryFromPhone,
  guessCountryFromTimezone,
  normalizeCountrySearchText,
} from '../src/data/countries.js';

test('DEFAULT_COUNTRY is EG (Egypt)', () => {
  assert.equal(DEFAULT_COUNTRY, 'EG');
});

test('normalizeCountrySearchText normalizes Arabic alef, ta marbuta, and diacritics', () => {
  assert.equal(normalizeCountrySearchText('أحمد'), normalizeCountrySearchText('احمد'));
  assert.equal(normalizeCountrySearchText('السعودية'), normalizeCountrySearchText('السعوديه'));
  assert.equal(normalizeCountrySearchText('عُمان'), normalizeCountrySearchText('عمان'));
  assert.equal(normalizeCountrySearchText('الإمارات'), normalizeCountrySearchText('الامارات'));
});

test('filterCountryOptions matches Arabic, localized English, and ISO code', () => {
  const enOptions = getCountryOptions('en');

  const byArabicWithoutDiacritics = filterCountryOptions(COUNTRY_OPTIONS, 'عمان');
  assert.ok(byArabicWithoutDiacritics.some((c) => c.code === 'OM'));

  const byAlefVariant = filterCountryOptions(COUNTRY_OPTIONS, 'الامارات');
  assert.ok(byAlefVariant.some((c) => c.code === 'AE'));

  const byTaMarbutaVariant = filterCountryOptions(COUNTRY_OPTIONS, 'السعوديه');
  assert.ok(byTaMarbutaVariant.some((c) => c.code === 'SA'));

  const byEnglishName = filterCountryOptions(enOptions, 'egypt');
  assert.ok(byEnglishName.some((c) => c.code === 'EG'));

  const byArabicAgainstEnglishOptions = filterCountryOptions(enOptions, 'مصر');
  assert.ok(byArabicAgainstEnglishOptions.some((c) => c.code === 'EG'));

  const byIsoCode = filterCountryOptions(COUNTRY_OPTIONS, 'tr');
  assert.ok(byIsoCode.some((c) => c.code === 'TR'));
});

test('guessCountryFromTimezone resolves known timezones and returns null for unknown', () => {
  assert.equal(guessCountryFromTimezone('Africa/Cairo'), 'EG');
  assert.equal(guessCountryFromTimezone('Asia/Riyadh'), 'SA');
  assert.equal(guessCountryFromTimezone('Europe/Istanbul'), 'TR');
  assert.equal(guessCountryFromTimezone('Invalid/Zone'), null);
});

test('guessCountryFromPhone detects local Egyptian numbers and international prefixes', () => {
  assert.equal(guessCountryFromPhone('01012345678'), 'EG');
  assert.equal(guessCountryFromPhone('٠١١٢٨٤٧٢٤٢٤'), 'EG');
  assert.equal(guessCountryFromPhone('+201128472424'), 'EG');
  assert.equal(guessCountryFromPhone('+966501234567'), 'SA');
  assert.equal(guessCountryFromPhone('00905551234567'), 'TR');
  assert.equal(guessCountryFromPhone('+15551234567'), null);
  assert.equal(guessCountryFromPhone(''), null);
});
