import { assertEquals } from 'jsr:@std/assert@1';

import { safeFailureReason } from './errors.ts';

Deno.test('only known safe failure reasons are persisted', () => {
  assertEquals(safeFailureReason('telegram_send_failed'), 'telegram_send_failed');
  assertEquals(safeFailureReason('request_load_failed'), 'request_load_failed');
});

Deno.test('unknown errors never leak tokens, request URLs or PII', () => {
  const sensitive = [
    'https://api.telegram.org/bot123456:AA-secret/sendMessage',
    'request https://example.test/admin/quran/requests?type=preference&id=abc',
    'student أحمد 201128472424',
    { message: 'boom' },
  ];

  for (const value of sensitive) {
    assertEquals(safeFailureReason(value), 'notification_delivery_failed');
  }
});
