import i18n from '../i18n';

/**
 * App-wide constants
 * ─────────────────
 * Update WHATSAPP_NUMBER with the academy's real number before going live.
 * Format: country code + number, no spaces, no + (e.g. "201001234567")
 */

export const WHATSAPP_NUMBER = '201024744963';

export function getGenderLabel(gender) {
  if (gender === 'male') return i18n.t('home:gender.male');
  if (gender === 'female') return i18n.t('home:gender.female');
  return i18n.t('home:gender.default');
}

export const GENDER_LABELS = {
  get male() {
    return i18n.t('home:gender.male');
  },
  get female() {
    return i18n.t('home:gender.female');
  },
};

export const GENDER_PATHS = {
  male: '/quran/teachers/male',
  female: '/quran/teachers/female',
};
