/* global process */
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 5199;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const SUPABASE_URL = 'http://127.0.0.1:54321';
const SCREENSHOT_DIR = '/tmp/opencode';
const ADMIN_ID = 'admin-user-id';
const SESSION_KEY = 'sb-127-auth-token';

const teachers = [
  { id: 'teacher-requested', name: 'أ. أحمد', gender: 'male', created_at: '2026-01-01T00:00:00Z' },
  { id: 'teacher-current', name: 'أ. محمود', gender: 'male', created_at: '2026-01-02T00:00:00Z' },
  { id: 'teacher-female', name: 'أ. فاطمة', gender: 'female', created_at: '2026-01-03T00:00:00Z' },
];

const subscription = {
  id: '11111111-1111-4111-8111-111111111111',
  student_name: 'سارة',
  whatsapp: '201128472424',
  teacher_id: 'teacher-requested',
  teacher_name: 'أ. أحمد',
  status: 'new',
  created_at: '2026-11-06T08:00:00.000Z',
  updated_at: '2026-11-06T08:10:00.000Z',
  student_id: null,
  notes: 'ملاحظة داخلية قديمة',
  history: [
    { at: '2026-11-06T08:00:00.000Z', action: 'created' },
    {
      at: '2026-11-06T08:10:00.000Z',
      action: 'status_update',
      status: 'contacted',
      notes: 'تم التواصل هاتفياً في الصباح',
    },
  ],
};

const preference = {
  id: '33333333-3333-4333-8333-333333333333',
  student_name: 'منى',
  whatsapp: '201000000000',
  age: 30,
  gender_preference: 'female',
  description: 'أبحث عن معلمة لتجويد القرآن',
  status: 'new',
  created_at: '2026-11-05T08:00:00.000Z',
  updated_at: '2026-11-05T08:00:00.000Z',
  student_id: null,
  notes: '',
  history: [],
};

const oldIncomplete = {
  id: '22222222-2222-4222-8222-222222222222',
  student_name: 'طلب قديم بدون هاتف',
  whatsapp: null,
  teacher_id: null,
  teacher_name: 'معلم قديم',
  status: 'contacted',
  created_at: '2026-11-04T08:00:00.000Z',
  updated_at: '2026-11-04T08:00:00.000Z',
  student_id: null,
  notes: '',
  history: [],
};

const existingAccount = {
  id: 'student-existing',
  full_name: 'سارة',
  phone: '201128472424',
  teacher_id: 'teacher-current',
  created_at: '2026-09-01T00:00:00.000Z',
  teachers: { id: 'teacher-current', name: 'أ. محمود' },
};

const recoveredAccount = {
  id: 'student-recovered',
  full_name: 'منى',
  phone: '201000000000',
  teacher_id: null,
  created_at: '2026-11-06T09:00:00.000Z',
  teachers: null,
};

function summary(row, requestType) {
  return {
    id: row.id,
    request_type: requestType,
    student_name: row.student_name,
    whatsapp: row.whatsapp,
    teacher_id: requestType === 'subscription' ? row.teacher_id : null,
    teacher_name: requestType === 'subscription' ? row.teacher_name : null,
    gender_preference: requestType === 'preference' ? row.gender_preference : null,
    age: requestType === 'preference' ? row.age : null,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    student_id: row.student_id,
  };
}

function findPlaywright() {
  const require = createRequire(import.meta.url);
  try {
    return require('playwright');
  } catch {
    // Playwright is available from the user's npx cache in this environment.
  }

  const npxRoot = path.join(os.homedir(), '.npm', '_npx');
  if (fs.existsSync(npxRoot)) {
    for (const entry of fs.readdirSync(npxRoot)) {
      const candidate = path.join(npxRoot, entry, 'node_modules', 'playwright');
      if (fs.existsSync(path.join(candidate, 'package.json'))) {
        return require(candidate);
      }
    }
  }

  return null;
}

const playwright = findPlaywright();
const chromePath = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const unavailableReason = !playwright
  ? 'Playwright is not installed locally or in the npx cache; UI tests skipped.'
  : !fs.existsSync(chromePath)
    ? `Chrome/Chromium was not found at ${chromePath}; set CHROME_PATH to run UI tests.`
    : '';

if (unavailableReason) {
  console.warn(`[studentRequestsUI] ${unavailableReason}`);
}

const uiTest = (name, fn) => test(name, { skip: unavailableReason || false }, fn);

function assertOnlyBlockedFonts(state) {
  const unexpected = state.blockedExternal.filter((href) => {
    const host = new URL(href).hostname;
    return host !== 'fonts.googleapis.com' && host !== 'fonts.gstatic.com';
  });
  assert.deepEqual(unexpected, [], 'unexpected external network request');
}

async function waitFor(predicate, description, timeoutMs = 8_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for ${description}`);
}

async function clickWhenEnabled(locator, description) {
  await waitFor(async () => !(await locator.isDisabled()), description);
  await locator.click();
}

async function waitForServer(url, timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function corsHeaders(request) {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,HEAD,POST,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers': request.headers()['access-control-request-headers']
      ?? 'authorization,apikey,content-type,prefer,x-client-info,accept,range,accept-profile',
    'access-control-expose-headers': 'content-range',
  };
}

async function createHarness(browser, options = {}) {
  const context = await browser.newContext({
    viewport: options.viewport ?? { width: 1440, height: 1000 },
    locale: 'ar-EG',
  });

  const session = {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    token_type: 'bearer',
    expires_in: 86_400,
    expires_at: Math.floor(Date.now() / 1000) + 86_400,
    user: {
      id: ADMIN_ID,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'admin@example.com',
      app_metadata: {},
      user_metadata: {},
      created_at: '2026-01-01T00:00:00.000Z',
    },
  };

  await context.addInitScript(({ key, value }) => {
    localStorage.setItem(key, value);
  }, { key: SESSION_KEY, value: JSON.stringify(session) });

  const page = await context.newPage();
  const state = {
    listCalls: [],
    mutations: [],
    createCalls: 0,
    retryCalls: [],
    notificationAttempts: 5,
    createStudentStatus: options.createStudentStatus ?? null,
    recoveredAccount: options.recoveredAccount ?? null,
    recoveryVisible: false,
    listOverride: options.listOverride ?? null,
    detailRequest: options.detailRequest ?? null,
    manualSearchDelayMs: options.manualSearchDelayMs ?? 0,
    blockedExternal: [],
  };

  // Hard safety net: the page may only talk to this test's dev server and the
  // mocked local Supabase origin. Anything external is aborted and recorded.
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.origin === BASE_URL || url.origin === SUPABASE_URL) {
      return route.continue();
    }
    state.blockedExternal.push(url.href);
    return route.abort('blockedbyclient');
  });

  await page.route(`${SUPABASE_URL}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const headers = corsHeaders(request);

    if (method === 'OPTIONS') {
      return route.fulfill({ status: 204, headers });
    }

    const json = (payload, status = 200) => route.fulfill({
      status,
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (url.pathname === '/auth/v1/user') {
      return json({ user: session.user });
    }

    if (url.pathname.startsWith('/rest/v1/rpc/')) {
      const fn = url.pathname.split('/').pop();
      const body = request.postDataJSON?.() ?? {};

      if (fn === 'admin_list_student_requests') {
        state.listCalls.push(body);

        const source = state.listOverride ?? [
          summary(subscription, 'subscription'),
          summary(preference, 'preference'),
          summary(oldIncomplete, 'subscription'),
        ];

        let items = source.filter((item) => body.p_type === 'all' || item.request_type === body.p_type);
        if (body.p_status) items = items.filter((item) => item.status === body.p_status);
        if (body.p_search) {
          items = items.filter((item) => (
            String(item.student_name ?? '').includes(body.p_search)
            || String(item.whatsapp ?? '').includes(body.p_search)
          ));
        }

        const total = options.listTotal ?? items.length;
        if (body.p_offset > 0) {
          items = [{
            ...summary(preference, 'preference'),
            id: '44444444-4444-4444-8444-444444444444',
            student_name: 'طلب الصفحة الثانية',
          }];
        }

        return json({ items, total });
      }

      state.mutations.push({ fn, body });
      if (fn === 'admin_update_student_request') {
        const target = [subscription, preference, oldIncomplete]
          .find((row) => row.id === body.p_id);
        if (target) {
          target.status = body.p_status;
          target.notes = body.p_notes ?? '';
          target.updated_at = '2026-11-06T09:00:00.000Z';
        }
      }
      if (fn === 'admin_retry_student_request_notification') {
        state.retryCalls.push(body);
        state.notificationAttempts = 0;
      }
      return route.fulfill({ status: 204, headers });
    }

    if (url.pathname === '/rest/v1/admin_users') {
      return route.fulfill({
        status: 200,
        headers: { ...headers, 'content-range': '0-0/1', 'content-type': 'application/json' },
      });
    }

    if (url.pathname === '/rest/v1/teachers') {
      return json(teachers);
    }

    if (url.pathname === '/rest/v1/student_profiles') {
      if (url.searchParams.get('id') === `eq.${ADMIN_ID}`) return json([]);
      if (url.searchParams.get('phone')?.startsWith('in.')) {
        const candidates = [
          existingAccount,
          state.recoveryVisible ? state.recoveredAccount : null,
        ].filter(Boolean);
        const matched = candidates.filter((account) => (
          url.searchParams.get('phone').includes(account.phone)
        ));
        return json(matched);
      }
      if (url.searchParams.get('or') && state.manualSearchDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, state.manualSearchDelayMs));
      }
      return json([existingAccount]);
    }

    if (url.pathname === '/rest/v1/subscription_requests'
      || url.pathname === '/rest/v1/preference_requests') {
      const table = url.pathname.endsWith('subscription_requests') ? 'subscription' : 'preference';
      const allRows = [subscription, preference, oldIncomplete];

      const idFilter = url.searchParams.get('id');
      if (idFilter?.startsWith('eq.')) {
        const id = idFilter.slice(3);
        const found = state.detailRequest?.id === id
          ? state.detailRequest
          : allRows.find((row) => row.id === id);
        return json(found ? [found] : []);
      }

      const phoneFilter = url.searchParams.get('whatsapp');
      if (phoneFilter?.startsWith('in.')) {
        const rows = allRows.filter((row) => (
          row.whatsapp && phoneFilter.includes(row.whatsapp)
        ));
        return json(rows.filter((row) => (
          table === 'subscription' ? row.teacher_name !== undefined : row.gender_preference !== undefined
        )));
      }

      return json([]);
    }

    if (url.pathname === '/rest/v1/student_request_notifications') {
      return json([{
        id: 'notification-1',
        subscription_request_id: subscription.id,
        preference_request_id: null,
        attempts: state.notificationAttempts,
        next_attempt_at: '2026-11-06T09:00:00.000Z',
        locked_until: null,
        last_error: state.notificationAttempts > 0 ? 'telegram_send_failed' : null,
        created_at: '2026-11-06T08:00:00.000Z',
      }]);
    }

    if (url.pathname === '/functions/v1/admin-create-student') {
      state.createCalls += 1;
      const body = request.postDataJSON?.() ?? {};
      state.lastCreateBody = body;

      if (state.createStudentStatus) {
        // The request definitely failed (409) or its outcome is ambiguous
        // (5xx). The UI must offer suggestions only, never auto-select.
        state.recoveryVisible = Boolean(state.recoveredAccount);
        if (state.createStudentStatus === 409) {
          return json({ error: 'هذا الرقم مسجل بالفعل.' }, 409);
        }
        if (state.createStudentStatus === 400) {
          return json({
            error: 'A user with this email address has already been registered',
          }, 400);
        }
        return json({ error: 'تعذر إنشاء الحساب بعد انقطاع الاتصال.' }, 503);
      }

      return json({ user: { id: 'student-created', email: '201128472424@students.local' } }, 201);
    }

    return json([]);
  });

  return { context, page, state, session };
}

let browser;
let viteProcess;

before(async () => {
  if (unavailableReason) return;

  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  viteProcess = spawn('npm', [
    'run', 'dev', '--', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort',
  ], {
    cwd: process.cwd(),
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      // Never let a developer's .env.local point these tests at production.
      VITE_SUPABASE_URL: SUPABASE_URL,
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_test_only_not_a_real_key',
      VITE_SUPABASE_ANON_KEY: 'sb_test_only_not_a_real_key',
      BROWSER: 'none',
    },
  });

  let serverLog = '';
  viteProcess.stdout.on('data', (chunk) => { serverLog += chunk; });
  viteProcess.stderr.on('data', (chunk) => { serverLog += chunk; });

  try {
    await waitForServer(BASE_URL);
  } catch (error) {
    throw new Error(`${error.message}\n--- vite ---\n${serverLog}`, { cause: error });
  }

  const { chromium } = playwright;
  browser = await chromium.launch({
    headless: true,
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
});

after(async () => {
  if (browser) await browser.close();
  if (viteProcess?.pid) {
    try {
      process.kill(-viteProcess.pid, 'SIGTERM');
    } catch {
      viteProcess.kill('SIGTERM');
    }
  }
});

uiTest('queue, filters, real RPC pagination, search and missing-phone state', async () => {
  const { context, page, state } = await createHarness(browser, { listTotal: 45 });
  try {
    await page.goto(`${BASE_URL}/admin/quran/requests`);
    await page.getByRole('heading', { name: 'طلبات الطلاب' }).waitFor();

    assert.equal(await page.locator('#admin-nav-quran-requests').getAttribute('href'), '/admin/quran/requests');

    await page.locator('#student-requests-table tbody tr').first().waitFor();
    assert.equal(await page.locator('#student-requests-table tbody tr').count(), 3);
    assert.deepEqual(state.listCalls[0], {
      p_type: 'all',
      p_status: null,
      p_search: null,
      p_offset: 0,
      p_limit: 20,
    });

    const incompleteRow = page.locator('#student-requests-table tbody tr', {
      hasText: 'طلب قديم بدون هاتف',
    });
    assert.equal(await incompleteRow.locator('a[href*="wa.me"]').count(), 0);
    assert.equal(await incompleteRow.locator('button[title="رقم الهاتف غير متاح"]').isDisabled(), true);

    await clickWhenEnabled(page.getByRole('button', { name: 'التالي' }), 'next page enabled');
    await waitFor(() => state.listCalls.at(-1)?.p_offset === 20, 'page 2 list RPC');
    await page.getByText('صفحة 2 من 3').waitFor();
    assert.equal(state.listCalls.at(-1).p_limit, 20);

    await clickWhenEnabled(page.getByRole('button', { name: 'السابق' }), 'previous page enabled');
    await waitFor(() => state.listCalls.at(-1)?.p_offset === 0, 'page 1 list RPC');
    await page.getByText('صفحة 1 من 3').waitFor();

    await page.getByRole('button', { name: 'اشتراك بمعلم' }).click();
    await waitFor(() => state.listCalls.at(-1)?.p_type === 'subscription', 'type filter RPC');

    await page.selectOption('#student-requests-status', 'contacted');
    await waitFor(() => state.listCalls.at(-1)?.p_status === 'contacted', 'status filter RPC');

    await page.getByRole('button', { name: 'كل الطلبات' }).click();
    await page.selectOption('#student-requests-status', '');
    await waitFor(
      () => state.listCalls.at(-1)?.p_type === 'all' && state.listCalls.at(-1)?.p_status === null,
      'reset filters RPC'
    );

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'student-requests-desktop.png'), fullPage: true });

    await page.fill('#student-requests-search', '010.1234-5678');
    await waitFor(() => state.listCalls.at(-1)?.p_search === '201012345678', 'canonical phone search RPC');
    assertOnlyBlockedFonts(state);
  } finally {
    await context.close();
  }
});

uiTest('detail defaults the requested teacher, keeps workflow actions, and closes permanently', async () => {
  const { context, page, state } = await createHarness(browser);
  try {
    await page.goto(`${BASE_URL}/admin/quran/requests`);
    await page.getByRole('heading', { name: 'طلبات الطلاب' }).waitFor();
    await page.getByRole('button', { name: 'فتح تفاصيل طلب سارة' }).click();

    const dialog = page.getByRole('dialog', { name: 'تفاصيل طلب الطالب' });
    await dialog.waitFor();
    await waitFor(
      async () => (await page.locator('#student-request-teacher').inputValue()) === 'teacher-requested',
      'requested-teacher default'
    );

    assert.equal(await page.locator('#student-request-teacher').inputValue(), 'teacher-requested');
    assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
    assert.equal(await page.evaluate(() => (
      document.activeElement?.closest('[role="dialog"]') !== null
    )), true);

    // Tab cycles stay inside the dialog.
    for (let index = 0; index < 15; index += 1) {
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => (
        document.activeElement?.closest('[role="dialog"]') !== null
      )), true, `focus escaped the dialog after Tab ${index + 1}`);
    }

    // The same normalized phone is suggested, but selection is explicit.
    assert.match(await dialog.textContent(), /حسابات مسجلة بنفس الرقم/);
    assert.match(await dialog.locator('.sr-account-card').first().textContent(), /أ\. محمود/);
    await dialog.getByRole('button', { name: 'اختيار الحساب' }).click();
    assert.equal(await page.locator('#student-request-teacher').inputValue(), 'teacher-requested');

    // Manual account search is a separate, explicit path.
    await dialog.locator('.sr-inline-form input').fill('محمود');
    await page.waitForFunction(() => {
      const button = document.querySelector('.sr-inline-form button[type="submit"]');
      return button && !button.disabled;
    });
    await dialog.getByRole('button', { name: 'بحث', exact: true }).click();
    await dialog.locator('.sr-account-results .sr-account-card').waitFor();
    assert.match(
      await dialog.locator('.sr-account-results .sr-account-card').first().textContent(),
      /سارة/
    );

    const whatsappHref = await dialog.getByRole('link', { name: 'مراسلة واتساب' }).getAttribute('href');
    assert.match(whatsappHref, /wa\.me\/201128472424/);
    assert.match(await dialog.textContent(), /تم التواصل هاتفياً في الصباح/);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'student-requests-desktop-detail.png'), fullPage: true });

    await page.fill('#student-request-notes', 'تمت المتابعة عبر واتساب');
    await dialog.getByRole('button', { name: 'حفظ الملاحظات' }).click();
    await waitFor(
      () => state.mutations.some((item) => item.fn === 'admin_update_student_request'),
      'notes RPC'
    );

    const notesMutation = state.mutations.find((item) => item.fn === 'admin_update_student_request');
    assert.deepEqual(notesMutation.body, {
      p_type: 'subscription',
      p_id: subscription.id,
      p_status: 'new',
      p_notes: 'تمت المتابعة عبر واتساب',
    });

    await dialog.getByRole('button', { name: 'تم التواصل' }).click();
    await waitFor(
      () => state.mutations.at(-1)?.body?.p_status === 'contacted',
      'status RPC'
    );
    assert.equal(state.mutations.at(-1).body.p_notes, 'تمت المتابعة عبر واتساب');

    await dialog.getByRole('button', { name: 'إعادة المحاولة' }).click();
    await waitFor(() => state.retryCalls.length > 0, 'notification retry RPC');
    assert.deepEqual(state.retryCalls, [{ p_id: 'notification-1' }]);

    await dialog.getByRole('button', { name: 'حذف الطلب نهائياً' }).click();
    const confirm = page.getByRole('dialog', { name: 'تأكيد حذف الطلب نهائياً' });
    await confirm.waitFor();
    assert.match(await confirm.textContent(), /لا يمكن استعادة الطلب/);
    assert.equal(await page.locator('.sr-detail-modal').getAttribute('aria-hidden'), 'true');

    // Escape closes only the confirmation, not the detail behind it, and
    // returns focus to the danger-zone trigger.
    await page.keyboard.press('Escape');
    await confirm.waitFor({ state: 'hidden' });
    await dialog.waitFor();
    await waitFor(
      async () => /حذف الطلب نهائياً/.test(
        await page.evaluate(() => document.activeElement?.textContent ?? '')
      ),
      'focus returned to delete trigger after Escape'
    );

    await dialog.getByRole('button', { name: 'حذف الطلب نهائياً' }).click();
    await confirm.waitFor();
    await confirm.getByRole('button', { name: 'إلغاء' }).click();
    await confirm.waitFor({ state: 'hidden' });
    await waitFor(
      async () => /حذف الطلب نهائياً/.test(
        await page.evaluate(() => document.activeElement?.textContent ?? '')
      ),
      'focus returned to delete trigger after Cancel'
    );

    await dialog.getByRole('button', { name: 'حذف الطلب نهائياً' }).click();
    await page.getByRole('dialog', { name: 'تأكيد حذف الطلب نهائياً' })
      .getByRole('button', { name: 'حذف الطلب نهائياً' })
      .click();

    await dialog.waitFor({ state: 'hidden' });
    assert.deepEqual(state.mutations.at(-1), {
      fn: 'admin_close_student_request',
      body: { p_type: 'subscription', p_id: subscription.id },
    });
    assert.match(await page.locator('.sr-flash').textContent(), /نهائياً/);
    assert.equal(await page.evaluate(() => document.body.style.overflow), '');
    assertOnlyBlockedFonts(state);
  } finally {
    await context.close();
  }
});

uiTest('create success reuses the returned account and requested teacher', async () => {
  const { context, page, state } = await createHarness(browser);
  try {
    await page.goto(`${BASE_URL}/admin/quran/requests`);
    await page.getByRole('heading', { name: 'طلبات الطلاب' }).waitFor();
    await page.getByRole('button', { name: 'فتح تفاصيل طلب سارة' }).click();
    await page.getByRole('dialog', { name: 'تفاصيل طلب الطالب' }).waitFor();

    await page.getByRole('button', { name: 'إنشاء حساب جديد بهذا الرقم' }).click();
    assert.equal(await page.locator('#new-request-student-name').inputValue(), 'سارة');
    assert.equal(await page.locator('#new-request-student-phone').inputValue(), '201128472424');
    const password = await page.locator('#new-request-student-password').inputValue();
    assert.ok(password.length >= 8);

    await page.getByRole('button', { name: 'إنشاء الحساب', exact: true }).click();
    await page.getByText('تم إنشاء الحساب. اختر المعلم ثم أتمّ الطلب').waitFor();

    assert.equal(state.createCalls, 1);
    assert.equal(await page.locator('#student-request-teacher').inputValue(), 'teacher-requested');
    assert.match(await page.locator('.sr-credentials').textContent(), new RegExp(password));
    assert.match(await page.locator('.sr-credentials').textContent(), /سارة/);

    await page.getByRole('button', { name: 'إتمام الطلب وتعيين المعلم' }).click();
    await waitFor(
      () => state.mutations.some((item) => item.fn === 'admin_fulfill_student_request'),
      'fulfilment RPC'
    );
    const fulfil = state.mutations.find((item) => item.fn === 'admin_fulfill_student_request');
    assert.deepEqual(fulfil.body, {
      p_type: 'subscription',
      p_id: subscription.id,
      p_student_id: 'student-created',
      p_teacher_id: 'teacher-requested',
    });
    assertOnlyBlockedFonts(state);
  } finally {
    await context.close();
  }
});

uiTest('choosing another account clears credentials for the created account', async () => {
  const { context, page, state } = await createHarness(browser);
  try {
    await page.goto(`${BASE_URL}/admin/quran/requests`);
    await page.getByRole('heading', { name: 'طلبات الطلاب' }).waitFor();
    await page.getByRole('button', { name: 'فتح تفاصيل طلب سارة' }).click();
    const dialog = page.getByRole('dialog', { name: 'تفاصيل طلب الطالب' });
    await dialog.waitFor();

    await page.getByRole('button', { name: 'إنشاء حساب جديد بهذا الرقم' }).click();
    await page.getByRole('button', { name: 'إنشاء الحساب', exact: true }).click();
    await page.getByText('تم إنشاء الحساب. اختر المعلم ثم أتمّ الطلب').waitFor();
    assert.equal(await page.locator('.sr-credentials').count(), 1);

    // Switch to the existing account suggestion; the new account's password
    // must disappear immediately.
    await dialog.locator('.sr-account-card', { hasText: 'أ. محمود' })
      .getByRole('button', { name: 'اختيار الحساب' })
      .click();

    assert.match(await page.locator('.sr-selected-account').textContent(), /المعلم الحالي: أ\. محمود/);
    assert.equal(await page.locator('.sr-credentials').count(), 0);
    assert.equal(await dialog.getByRole('button', { name: 'نسخ' }).count(), 0);
    assertOnlyBlockedFonts(state);
  } finally {
    await context.close();
  }
});

for (const status of [409, 400, 503]) {
  uiTest(`create ${status} suggests accounts but never auto-selects or shows credentials`, async () => {
    const { context, page, state } = await createHarness(browser, {
      createStudentStatus: status,
      recoveredAccount,
      detailRequest: preference,
    });
    try {
      await page.goto(`${BASE_URL}/admin/quran/requests?type=preference&id=${preference.id}`);
      const dialog = page.getByRole('dialog', { name: 'تفاصيل طلب الطالب' });
      await dialog.waitFor();
      await dialog.getByText('القسم المطلوب').waitFor();

      await page.getByRole('button', { name: 'إنشاء حساب جديد بهذا الرقم' }).click();
      const password = await page.locator('#new-request-student-password').inputValue();
      assert.ok(password.length >= 8);

      await page.getByRole('button', { name: 'إنشاء الحساب', exact: true }).click();

      const createAlert = page.locator('.sr-create-form [role="alert"]');
      await createAlert.waitFor();
      const alertText = await createAlert.textContent();
      assert.match(alertText, /لم نعيّن أي حساب تلقائياً/);
      assert.match(alertText, /لم نعرض كلمة المرور كصالحة/);
      assert.match(alertText, status === 503 ? /تعذر التأكد/ : /مسجل بالفعل/);

      assert.equal(state.createCalls, 1);
      assert.equal(await page.locator('.sr-selected-account').count(), 0);
      assert.equal(await page.locator('.sr-credentials').count(), 0);
      assert.equal(await page.locator('#new-request-student-password').inputValue(), password);
      assert.equal(await page.locator('.sr-create-form').count(), 1);
      assert.equal(await page.getByRole('button', { name: 'إتمام الطلب وتعيين المعلم' }).isDisabled(), true);
      assert.equal(await dialog.getByRole('button', { name: 'نسخ' }).count(), 0);

      const suggestion = dialog.locator('.sr-account-card', { hasText: 'منى' });
      await suggestion.waitFor();
      assert.match(await suggestion.textContent(), /201000000000/);
      assert.equal(await page.locator('.sr-selected-account').count(), 0);

      // Selection is an explicit admin action.
      await suggestion.getByRole('button', { name: 'اختيار الحساب' }).click();
      assert.match(await page.locator('.sr-selected-account').textContent(), /منى/);
      assert.equal(await page.locator('.sr-credentials').count(), 0);
      assert.equal(await page.locator('.sr-create-form').count(), 0);

      await page.selectOption('#student-request-teacher', 'teacher-female');
      await page.getByRole('button', { name: 'إتمام الطلب وتعيين المعلم' }).click();
      await waitFor(
        () => state.mutations.some((item) => item.fn === 'admin_fulfill_student_request'),
        'explicit suggestion fulfilment RPC'
      );
      const fulfil = state.mutations.find((item) => item.fn === 'admin_fulfill_student_request');
      assert.deepEqual(fulfil.body, {
        p_type: 'preference',
        p_id: preference.id,
        p_student_id: 'student-recovered',
        p_teacher_id: 'teacher-female',
      });
      assertOnlyBlockedFonts(state);
    } finally {
      await context.close();
    }
  });
}

uiTest('a delayed manual search cannot mutate a reopened request', async () => {
  const { context, page, state } = await createHarness(browser, {
    manualSearchDelayMs: 1_200,
  });
  try {
    await page.goto(`${BASE_URL}/admin/quran/requests`);
    await page.getByRole('heading', { name: 'طلبات الطلاب' }).waitFor();
    await page.getByRole('button', { name: 'فتح تفاصيل طلب سارة' }).click();

    const dialog = page.getByRole('dialog', { name: 'تفاصيل طلب الطالب' });
    await dialog.waitFor();
    await dialog.locator('.sr-inline-form input').fill('محمود');
    await page.waitForFunction(() => {
      const button = document.querySelector('.sr-inline-form button[type="submit"]');
      return button && !button.disabled;
    });
    await dialog.getByRole('button', { name: 'بحث', exact: true }).click();

    // A search is not a mutation: closing must stay available while it runs.
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });

    // Reopen before the in-flight search resolves.
    await page.getByRole('button', { name: 'فتح تفاصيل طلب سارة' }).click();
    const reopened = page.getByRole('dialog', { name: 'تفاصيل طلب الطالب' });
    await reopened.waitFor();
    await reopened.locator('.sr-inline-form input').waitFor();

    await page.waitForTimeout(1_500);

    assert.equal(await reopened.locator('.sr-account-results .sr-account-card').count(), 0);
    assert.equal(await reopened.locator('.sr-inline-form input').inputValue(), '');
    assert.equal(await reopened.getByRole('button', { name: 'بحث', exact: true }).isDisabled(), true);
    assertOnlyBlockedFonts(state);
  } finally {
    await context.close();
  }
});

uiTest('deep link opens a request that is not on the visible page; Escape closes the modal', async () => {
  const { context, page, state } = await createHarness(browser, {
    listOverride: [summary(subscription, 'subscription')],
    detailRequest: preference,
  });
  try {
    await page.goto(`${BASE_URL}/admin/quran/requests?type=preference&id=${preference.id}`);

    const dialog = page.getByRole('dialog', { name: 'تفاصيل طلب الطالب' });
    await dialog.waitFor();
    await dialog.getByText('منى').first().waitFor();
    assert.match(await dialog.textContent(), /33333333/);

    assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(await page.evaluate(() => document.body.style.overflow), '');
    assert.equal(new URL(page.url()).searchParams.has('id'), false);

    await waitFor(() => state.listCalls.length > 0, 'initial list RPC');
    assert.equal(state.listCalls[0].p_type, 'all');
    assertOnlyBlockedFonts(state);
  } finally {
    await context.close();
  }
});

uiTest('mobile 390x844 renders the queue and detail without horizontal overflow', async () => {
  const { context, page, state } = await createHarness(browser, {
    viewport: { width: 390, height: 844 },
  });
  try {
    await page.goto(`${BASE_URL}/admin/quran/requests`);
    await page.getByRole('heading', { name: 'طلبات الطلاب' }).waitFor();
    await page.locator('#student-requests-table tbody tr').first().waitFor();

    const overflow = await page.evaluate(() => (
      document.documentElement.scrollWidth - document.documentElement.clientWidth
    ));
    assert.ok(overflow <= 1, `page has ${overflow}px horizontal overflow`);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'student-requests-mobile.png'), fullPage: true });

    await page.getByRole('button', { name: 'فتح تفاصيل طلب سارة' }).click();
    const dialog = page.getByRole('dialog', { name: 'تفاصيل طلب الطالب' });
    await dialog.waitFor();
    await page.waitForTimeout(250);

    const detailOverflow = await page.evaluate(() => (
      document.documentElement.scrollWidth - document.documentElement.clientWidth
    ));
    assert.ok(detailOverflow <= 1, `detail has ${detailOverflow}px horizontal overflow`);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'student-requests-mobile-detail.png'), fullPage: true });
    assertOnlyBlockedFonts(state);
  } finally {
    await context.close();
  }
});
