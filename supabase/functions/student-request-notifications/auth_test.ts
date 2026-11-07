import { assert, assertEquals } from 'jsr:@std/assert@1';

import {
  constantTimeEqual,
  isAuthorizedWorkerRequest,
  WORKER_SECRET_HEADER,
} from './auth.ts';

const SECRET = 'worker-secret-for-tests-0123456789abcdef';

function requestWithSecret(secret?: string): Request {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (secret !== undefined) {
    headers.set(WORKER_SECRET_HEADER, secret);
  }

  return new Request('https://example.test/functions/v1/student-request-notifications', {
    method: 'POST',
    headers,
    body: '{}',
  });
}

Deno.test('constantTimeEqual accepts only identical strings', () => {
  assert(constantTimeEqual(SECRET, SECRET));
  assertEquals(constantTimeEqual(SECRET, `${SECRET}x`), false);
  assertEquals(constantTimeEqual('', SECRET), false);
  assertEquals(constantTimeEqual(SECRET, ''), false);
});

Deno.test('worker authorization requires the exact shared secret header', () => {
  assert(isAuthorizedWorkerRequest(requestWithSecret(SECRET), SECRET));
  assertEquals(isAuthorizedWorkerRequest(requestWithSecret(`${SECRET}x`), SECRET), false);
  assertEquals(isAuthorizedWorkerRequest(requestWithSecret(), SECRET), false);
  assertEquals(isAuthorizedWorkerRequest(requestWithSecret(SECRET), ''), false);
  assertEquals(isAuthorizedWorkerRequest(requestWithSecret(SECRET), undefined), false);
});
