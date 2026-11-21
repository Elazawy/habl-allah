import i18n from 'i18next';
import { isValidStudentPhone, normalizeStudentPhone } from './studentPhone.js';

function createValidationError(code, key) {
  const message = i18n.isInitialized ? i18n.t(key) : code;
  const err = new Error(message || code);
  err.code = code;
  return err;
}

export function prepareStudentRequest({ student_name, whatsapp }) {
  const name = String(student_name ?? '').trim();
  if (!name || name.length > 200) {
    throw createValidationError('INVALID_STUDENT_NAME', 'errors:validation.invalidStudentName');
  }
  // An international number cannot start with a zero country code. Rejecting
  // it also keeps the canonical digits stable when the database normalizes it.
  if (!isValidStudentPhone(whatsapp) || normalizeStudentPhone(whatsapp).startsWith('0')) {
    throw createValidationError('INVALID_WHATSAPP', 'errors:validation.invalidWhatsapp');
  }
  return { student_name: name, whatsapp: normalizeStudentPhone(whatsapp) };
}

export function preparePreferenceRequest(values) {
  const contact = prepareStudentRequest(values);
  const rawAge = values.age == null ? '' : String(values.age).trim();
  const age = rawAge === ''
    ? null
    : (/^\d+$/.test(rawAge) ? Number(rawAge) : NaN);
  if (age !== null && (!Number.isInteger(age) || age < 5 || age > 99)) {
    throw createValidationError('INVALID_AGE', 'errors:validation.invalidAge');
  }
  const description = String(values.description ?? '').trim();
  if (description.length > 4000) {
    throw createValidationError('DESCRIPTION_TOO_LONG', 'errors:validation.descriptionTooLong');
  }
  return {
    ...contact,
    age,
    description,
    gender_preference: ['male', 'female', 'any'].includes(values.gender_preference)
      ? values.gender_preference : null,
  };
}
