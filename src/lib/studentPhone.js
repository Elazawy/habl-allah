/** Canonical phone format shared by student accounts and request capture. */
export function normalizeStudentPhone(phone) {
  const raw = String(phone ?? '').replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (digit) => {
    const code = digit.charCodeAt(0);
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  }).trim();
  const digits = raw.replace(/\D/g, '');
  if (!digits || raw.startsWith('+')) return digits;
  return digits.startsWith('0') ? `2${digits}` : digits;
}

export function isValidStudentPhone(phone) {
  return /^\d{10,15}$/.test(normalizeStudentPhone(phone));
}
