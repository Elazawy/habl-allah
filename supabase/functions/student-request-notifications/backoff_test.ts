import { assertEquals } from 'jsr:@std/assert@1';

import {
  getBackoffDelayMs,
  getRetrySchedule,
  MAX_NOTIFICATION_ATTEMPTS,
  NOTIFICATION_LEASE_MS,
} from './backoff.ts';

Deno.test('backoff delays increase after each claimed attempt', () => {
  assertEquals(getBackoffDelayMs(1), 60 * 1000);
  assertEquals(getBackoffDelayMs(2), 5 * 60 * 1000);
  assertEquals(getBackoffDelayMs(3), 15 * 60 * 1000);
  assertEquals(getBackoffDelayMs(4), 60 * 60 * 1000);
  assertEquals(getBackoffDelayMs(5), null);
  assertEquals(getBackoffDelayMs(99), null);
});

Deno.test('unexpected attempt values fall back to the first delay', () => {
  assertEquals(getBackoffDelayMs(0), 60 * 1000);
  assertEquals(getBackoffDelayMs(-1), 60 * 1000);
  assertEquals(getBackoffDelayMs(Number.NaN), 60 * 1000);
});

Deno.test('attempt five is exhausted but remains due for admin retry', () => {
  const now = Date.parse('2026-11-06T10:00:00.000Z');
  const first = getRetrySchedule(1, now);
  const fifth = getRetrySchedule(MAX_NOTIFICATION_ATTEMPTS, now);

  assertEquals(first, {
    exhausted: false,
    nextAttemptAt: '2026-11-06T10:01:00.000Z',
  });
  assertEquals(fifth, {
    exhausted: true,
    nextAttemptAt: '2026-11-06T10:00:00.000Z',
  });
});

Deno.test('lease constant matches the worker contract', () => {
  assertEquals(NOTIFICATION_LEASE_MS, 2 * 60 * 1000);
});
