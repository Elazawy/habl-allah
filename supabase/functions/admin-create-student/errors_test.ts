import { assertEquals } from 'jsr:@std/assert@1';

import { isDuplicateAuthUserError } from './errors.ts';

Deno.test('detects duplicate Auth users by known error code', () => {
  for (const code of [
    'email_exists',
    'email_already_exists',
    'phone_exists',
    'phone_already_exists',
    'user_already_exists',
    'user_already_registered',
  ]) {
    assertEquals(isDuplicateAuthUserError({ code, message: 'unrelated' }), true);
  }
});

Deno.test('detects duplicate Auth users by fallback message', () => {
  for (const message of [
    'A user with this email address has already been registered',
    'User already registered',
    'User already exists',
  ]) {
    assertEquals(isDuplicateAuthUserError({ code: 'unexpected_failure', message }), true);
  }
});

Deno.test('does not treat unrelated Auth failures as a duplicate', () => {
  for (const error of [
    { code: 'weak_password', message: 'Password should be at least 6 characters' },
    { code: 'validation_failed', message: 'Unable to validate email address' },
    { code: 'over_email_send_rate_limit', message: 'Email rate limit exceeded' },
    { code: 'unexpected_failure', message: 'Database error saving new user' },
    { message: 'User not found' },
    null,
    undefined,
    'already exists',
  ]) {
    assertEquals(isDuplicateAuthUserError(error), false);
  }
});
