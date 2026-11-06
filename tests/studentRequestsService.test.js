/* global process */
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'vite';

let vite;
let service;
let studentsService;
let supabaseModule;
let originalFetch;
let calls = [];

function jsonResponse(payload, status = 200) {
  if (status === 204) return new Response(null, { status });
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function queueResponse(payload, status = 200) {
  calls.push('queued');
  globalThis.fetch = async (url, init) => {
    calls[calls.length - 1] = {
      url: String(url),
      method: init?.method ?? 'GET',
      body: init?.body ? JSON.parse(init.body) : null,
      headers: init?.headers,
    };
    return jsonResponse(payload, status);
  };
}

const summaryRow = {
  id: '11111111-1111-4111-8111-111111111111',
  request_type: 'subscription',
  student_name: 'سارة',
  whatsapp: '201128472424',
  teacher_id: 'teacher-requested',
  teacher_name: 'أ. أحمد',
  gender_preference: null,
  age: null,
  status: 'new',
  created_at: '2026-11-06T08:00:00.000Z',
  updated_at: '2026-11-06T08:00:00.000Z',
  student_id: null,
  notes: 'must not be trusted from the list payload',
  history: [{ action: 'created' }],
};

before(async () => {
  originalFetch = globalThis.fetch;
  vite = await createServer({
    configFile: false,
    root: process.cwd(),
    appType: 'custom',
    logLevel: 'silent',
    // Keep the service test's Vite cache away from the dev-server cache used by
    // the Playwright suite; a shared cache can trigger a mid-test page reload.
    cacheDir: path.join(os.tmpdir(), `student-requests-service-vite-${process.pid}`),
    server: { middlewareMode: true, hmr: false },
  });
  service = await vite.ssrLoadModule('/src/services/studentRequestsService.js');
  studentsService = await vite.ssrLoadModule('/src/services/studentsService.js');
  supabaseModule = await vite.ssrLoadModule('/src/lib/supabase.js');
});

after(async () => {
  globalThis.fetch = originalFetch;
  if (vite) await vite.close();
});

test('list uses the exact merged-pagination RPC contract and summary-only rows', async () => {
  queueResponse({ items: [summaryRow], total: 41 });

  const result = await service.fetchStudentRequests({
    type: 'all',
    status: '',
    search: ' ٠١٠١٢٣٤٥٦٧٨ ',
    page: 3,
    pageSize: 20,
  });

  const request = calls.at(-1);
  assert.match(request.url, /\/rest\/v1\/rpc\/admin_list_student_requests$/);
  assert.equal(request.method, 'POST');
  assert.deepEqual(request.body, {
    p_type: 'all',
    p_status: null,
    p_search: '201012345678',
    p_offset: 40,
    p_limit: 20,
  });
  assert.equal(result.total, 41);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].request_type, 'subscription');
  assert.equal(result.items[0].teacher_name, 'أ. أحمد');
  assert.equal(result.items[0].notes, '');
  assert.deepEqual(result.items[0].history, []);
});

test('list sanitizes punctuation and sends null for absent status/search', async () => {
  queueResponse({ items: [], total: 0 });

  await service.fetchStudentRequests({
    type: 'preference',
    status: '',
    search: `أحمد, "." (x); teachers?select=*`,
    page: 1,
    pageSize: 20,
  });

  const request = calls.at(-1);
  assert.equal(request.body.p_type, 'preference');
  assert.equal(request.body.p_status, null);
  assert.equal(request.body.p_search, 'أحمد x teachers select');
  assert.doesNotMatch(request.body.p_search, /[,.:;"'\\()*?=]/);
  assert.equal(request.body.p_offset, 0);
});

test('list rejects an unknown status before making a network call', async () => {
  queueResponse({ items: [], total: 0 });
  const beforeCount = calls.length;

  await assert.rejects(
    () => service.fetchStudentRequests({ status: 'archived' }),
    /حالة الطلب غير معروفة/
  );
  assert.equal(calls.length, beforeCount);
});

test('detail reads the full row, including notes and bounded history', async () => {
  const detail = {
    ...summaryRow,
    notes: 'ملاحظة داخلية',
    history: [
      { action: 'status_update', status: 'contacted', notes: 'تم التواصل هاتفياً' },
    ],
  };
  queueResponse(detail);

  const result = await service.fetchStudentRequest({
    type: 'subscription',
    id: summaryRow.id,
  });

  const request = calls.at(-1);
  assert.match(request.url, /\/rest\/v1\/subscription_requests\?/);
  assert.match(request.url, /select=\*/);
  assert.match(request.url, new RegExp(`id=eq\\.${summaryRow.id}`));
  assert.equal(result.notes, 'ملاحظة داخلية');
  assert.equal(result.history.length, 1);
});

test('workflow mutations call the approved admin RPC names and arguments', async () => {
  queueResponse(null, 204);

  await service.updateStudentRequest({
    type: 'preference',
    id: 'pref-1',
    status: 'contacted',
    notes: '  اتصلنا  ',
  });
  assert.match(calls.at(-1).url, /\/rpc\/admin_update_student_request$/);
  assert.deepEqual(calls.at(-1).body, {
    p_type: 'preference',
    p_id: 'pref-1',
    p_status: 'contacted',
    p_notes: 'اتصلنا',
  });

  queueResponse(null, 204);
  await service.fulfillStudentRequest({
    type: 'subscription',
    id: 'sub-1',
    studentId: 'student-1',
    teacherId: 'teacher-2',
  });
  assert.match(calls.at(-1).url, /\/rpc\/admin_fulfill_student_request$/);
  assert.deepEqual(calls.at(-1).body, {
    p_type: 'subscription',
    p_id: 'sub-1',
    p_student_id: 'student-1',
    p_teacher_id: 'teacher-2',
  });

  queueResponse(null, 204);
  await service.closeStudentRequest({ type: 'subscription', id: 'sub-2' });
  assert.match(calls.at(-1).url, /\/rpc\/admin_close_student_request$/);
  assert.deepEqual(calls.at(-1).body, { p_type: 'subscription', p_id: 'sub-2' });

  queueResponse(null, 204);
  await service.retryStudentRequestNotification('notification-1');
  assert.match(calls.at(-1).url, /\/rpc\/admin_retry_student_request_notification$/);
  assert.deepEqual(calls.at(-1).body, { p_id: 'notification-1' });
});

test('admin Edge Function failures preserve the real HTTP status for safe recovery', async () => {
  const { supabase } = supabaseModule;
  const originalGetSession = supabase.auth.getSession;
  supabase.auth.getSession = async () => ({
    data: { session: { access_token: 'test-token' } },
    error: null,
  });

  try {
    for (const [status, payload] of [
      [409, { error: 'هذا الرقم مسجل بالفعل.' }],
      [400, { error: 'A user with this email address has already been registered' }],
      [503, { message: 'gateway unavailable' }],
    ]) {
      globalThis.fetch = async () => jsonResponse(payload, status);

      await assert.rejects(
        () => studentsService.adminCreateStudent({
          phone: '01012345678',
          password: 'Abc12345',
          fullName: 'طالب اختبار',
        }),
        (error) => {
          assert.equal(error.status, status);
          assert.equal(error.body?.error ?? error.body?.message, payload.error ?? payload.message);
          return true;
        }
      );
    }
  } finally {
    supabase.auth.getSession = originalGetSession;
    globalThis.fetch = originalFetch;
  }
});

test('secure password is crypto-backed, within 8-10 chars and mixed-class', () => {
  const password = service.generateSecurePassword(10);
  assert.ok(password.length >= 8 && password.length <= 10);
  assert.match(password, /[a-z]/);
  assert.match(password, /[A-Z]/);
  assert.match(password, /\d/);
  assert.notEqual(password, service.generateSecurePassword(10));
});
