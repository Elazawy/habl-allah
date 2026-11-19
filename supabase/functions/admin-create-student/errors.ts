const DUPLICATE_AUTH_ERROR_CODES = new Set([
  'email_exists',
  'email_already_exists',
  'phone_exists',
  'phone_already_exists',
  'user_already_exists',
  'user_already_registered',
]);

// Auth versions differ in both code and wording. The code is the primary signal;
// this covers older responses such as DEV's "already been registered" without
// treating unrelated Auth failures as a phone conflict.
const DUPLICATE_AUTH_MESSAGE_PATTERN =
  /already(?:\s+been)?\s+registered|already\s+exists/i;

/**
 * Returns true only when an Auth admin createUser error means the account
 * already exists. Keep this pure so it can be covered without Auth/network.
 */
export function isDuplicateAuthUserError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;

  const { code, message } = error as { code?: unknown; message?: unknown };

  if (typeof code === 'string' && DUPLICATE_AUTH_ERROR_CODES.has(code.trim().toLowerCase())) {
    return true;
  }

  return typeof message === 'string' && DUPLICATE_AUTH_MESSAGE_PATTERN.test(message);
}
