import { isValidStudentPhone, normalizeStudentPhone } from './studentPhone.js';

export function prepareStudentRequest({ student_name, whatsapp }) {
  const name = String(student_name ?? '').trim();
  if (!name || name.length > 200) {
    throw new Error('يرجى إدخال اسم الطالب، بحد أقصى ٢٠٠ حرف.');
  }
  // An international number cannot start with a zero country code. Rejecting
  // it also keeps the canonical digits stable when the database normalizes it.
  if (!isValidStudentPhone(whatsapp) || normalizeStudentPhone(whatsapp).startsWith('0')) {
    throw new Error('يرجى إدخال رقم واتساب صحيح من ١٠ إلى ١٥ رقماً، مع رمز الدولة للأرقام الدولية.');
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
    throw new Error('يرجى إدخال عمر صحيح بين ٥ و٩٩ عاماً، أو تركه فارغاً.');
  }
  const description = String(values.description ?? '').trim();
  if (description.length > 4000) throw new Error('يرجى اختصار وصف احتياجك إلى ٤٠٠٠ حرف.');
  return {
    ...contact,
    age,
    description,
    gender_preference: ['male', 'female', 'any'].includes(values.gender_preference)
      ? values.gender_preference : null,
  };
}
