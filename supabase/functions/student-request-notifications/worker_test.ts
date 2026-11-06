// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from 'jsr:@std/assert@1';

import type { createAdminClient } from '../_shared/supabase.ts';
import { createWorkerHandler } from './worker.ts';

type AdminClient = ReturnType<typeof createAdminClient>;
type FakeResult = { data?: unknown; error?: unknown };
type JsonRecord = Record<string, unknown>;

const SECRET = 'worker-secret-for-integration-tests-0123456789abcdef';
const PREFERENCE_ID = '11111111-1111-4111-8111-111111111111';
const SUBSCRIPTION_ID = '22222222-2222-4222-8222-222222222222';
const NOW_MS = Date.parse('2026-11-06T10:00:00.000Z');
const LEASE = '2026-11-06T10:02:00.000Z';

const VALID_ENV: Record<string, string> = {
  TELEGRAM_BOT_TOKEN: 'test-token-not-real',
  TELEGRAM_REQUEST_CHAT_ID: '-1001234567890',
  STUDENT_REQUESTS_WORKER_SECRET: SECRET,
  PUBLIC_APP_ORIGIN: 'https://app.example.test',
};

const PREFERENCE_ROW: JsonRecord = {
  id: PREFERENCE_ID,
  student_name: 'أحمد محمد',
  age: 12,
  whatsapp: '201128472424',
  description: 'أريد معلماً متخصصاً في تجويد المبتدئين.',
  gender_preference: 'male',
  created_at: '2026-11-06T10:15:00.000Z',
};

const SUBSCRIPTION_ROW: JsonRecord = {
  id: SUBSCRIPTION_ID,
  teacher_name: 'الشيخ خالد',
  student_name: 'مريم',
  whatsapp: '447700900123',
  created_at: '2026-11-06T10:15:00.000Z',
};

interface FakeLiveJob {
  id: string;
  attempts: number;
  locked_until: string | null;
}

interface FakeOptions {
  claim?: FakeResult;
  requestRows?: Record<string, JsonRecord | null>;
  requestError?: unknown;
  jobExists?: boolean | ((id: string) => boolean);
  liveJob?: FakeLiveJob | null;
  jobLookupError?: unknown;
  jobLookupThrows?: boolean;
  deleteError?: unknown;
  deleteJobResult?: FakeResult;
  updateResult?: FakeResult;
  updateError?: unknown;
}

interface FakeRecords {
  rpc: Array<{ name: string; args: unknown }>;
  selects: Array<{ table: string; columns: string; filters: JsonRecord }>;
  updates: Array<{ table: string; payload: JsonRecord; filters: JsonRecord }>;
  deletes: Array<{ table: string; filters: JsonRecord }>;
}

function makeQuery(
  resolve: () => FakeResult,
  filters: JsonRecord,
): any {
  const query: any = {};

  query.eq = (column: string, value: unknown) => {
    filters[column] = value;
    return query;
  };
  query.gte = (column: string, value: unknown) => {
    filters[column] = value;
    return query;
  };
  query.lt = (column: string, value: unknown) => {
    filters[column] = value;
    return query;
  };
  query.match = (values: JsonRecord) => {
    Object.assign(filters, values);
    return query;
  };
  query.abortSignal = () => query;
  query.select = () => query;
  query.maybeSingle = () => Promise.resolve(resolve());
  query.then = (onFulfilled?: any, onRejected?: any) =>
    Promise.resolve(resolve()).then(onFulfilled, onRejected);
  query.catch = (onRejected?: any) => Promise.resolve(resolve()).catch(onRejected);

  return query;
}

function makeFakeSupabase(options: FakeOptions = {}) {
  const records: FakeRecords = {
    rpc: [],
    selects: [],
    updates: [],
    deletes: [],
  };

  const client = {
    rpc(name: string, args: unknown) {
      records.rpc.push({ name, args });
      const result = options.claim ?? { data: [], error: null };

      return { abortSignal: () => Promise.resolve(result) };
    },
    from(table: string) {
      return {
        select(columns: string) {
          const record = { table, columns, filters: {} as JsonRecord };
          records.selects.push(record);

          return makeQuery(() => {
            if (table === 'student_request_notifications') {
              const id = String(record.filters.id ?? '');

              if (options.jobLookupThrows) {
                throw new Error('AbortError: simulated DB abort');
              }

              if (options.jobLookupError) {
                return { data: null, error: options.jobLookupError };
              }

              if (options.liveJob !== undefined) {
                const live = options.liveJob;
                const matches = live !== null
                  && live.id === id
                  && live.attempts === record.filters.attempts
                  && live.locked_until === record.filters.locked_until;

                return { data: matches ? { id } : null, error: null };
              }

              const exists = typeof options.jobExists === 'function'
                ? options.jobExists(id)
                : (options.jobExists ?? true);

              return { data: exists ? { id } : null, error: null };
            }

            return {
              data: options.requestRows?.[table] ?? null,
              error: options.requestError ?? null,
            };
          }, record.filters);
        },
        update(payload: JsonRecord) {
          const record = { table, payload, filters: {} as JsonRecord };
          records.updates.push(record);

          return makeQuery(
            () => options.updateResult ?? { error: options.updateError ?? null },
            record.filters,
          );
        },
        delete() {
          const record = { table, filters: {} as JsonRecord };
          records.deletes.push(record);

          return makeQuery(() => {
            if (options.deleteError) {
              return { error: options.deleteError };
            }

            if (record.filters.id !== undefined) {
              return options.deleteJobResult ?? {
                data: [{ id: record.filters.id }],
                error: null,
              };
            }

            return { data: [], error: null };
          }, record.filters);
        },
      };
    },
  };

  return { client, records };
}

function workerRequest(
  secret: string | null = SECRET,
  method = 'POST',
): Request {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (secret !== null) {
    headers.set('x-request-worker-secret', secret);
  }

  return new Request('https://example.test/functions/v1/student-request-notifications', {
    method,
    headers,
    body: method === 'POST' ? '{}' : undefined,
  });
}

function claimedJob(overrides: JsonRecord = {}): JsonRecord {
  return {
    id: 'job-1',
    preference_request_id: PREFERENCE_ID,
    subscription_request_id: null,
    attempts: 1,
    next_attempt_at: '2026-11-06T10:00:00.000Z',
    locked_until: LEASE,
    last_error: null,
    created_at: '2026-11-06T10:00:00.000Z',
    ...overrides,
  };
}

interface HandlerOptions {
  envOverrides?: Record<string, string | undefined>;
  supabase?: FakeOptions;
  telegramOk?: boolean;
  telegramStatus?: number;
  now?: () => number;
}

function makeHandler(options: HandlerOptions = {}) {
  const envReads: string[] = [];
  const logs: string[] = [];
  const fetchCalls: Array<{ url: string; init: RequestInit }> = [];
  const { client, records } = makeFakeSupabase(options.supabase);

  const env = (name: string): string | undefined => {
    envReads.push(name);
    if (options.envOverrides && Object.hasOwn(options.envOverrides, name)) {
      return options.envOverrides[name];
    }
    return VALID_ENV[name];
  };

  const telegramFetch = ((
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => {
    fetchCalls.push({ url: String(input), init: init ?? {} });
    const ok = options.telegramOk ?? true;

    return Promise.resolve(new Response(JSON.stringify({ ok }), {
      status: options.telegramStatus ?? (ok ? 200 : 502),
      headers: { 'Content-Type': 'application/json' },
    }));
  }) as typeof fetch;

  const handler = createWorkerHandler({
    env,
    createSupabase: () => client as unknown as AdminClient,
    telegramFetch,
    now: options.now ?? (() => NOW_MS),
    logger: { error: (...args: unknown[]) => logs.push(args.map(String).join(' ')) },
  });

  return { handler, envReads, logs, fetchCalls, records };
}

Deno.test('unauthenticated request is rejected before Telegram config is read', async () => {
  const run = makeHandler({
    envOverrides: { TELEGRAM_BOT_TOKEN: undefined },
  });

  const response = await run.handler(workerRequest(null));

  assertEquals(response.status, 401);
  assertEquals(run.records.rpc.length, 0);
  assertEquals(run.envReads.includes('TELEGRAM_BOT_TOKEN'), false);
});

Deno.test('a missing worker secret fails closed without claiming jobs', async () => {
  const run = makeHandler({
    envOverrides: { STUDENT_REQUESTS_WORKER_SECRET: undefined },
  });

  const response = await run.handler(workerRequest());

  assertEquals(response.status, 500);
  assertEquals(run.records.rpc.length, 0);
});

Deno.test('a missing Telegram token fails before claiming jobs', async () => {
  const run = makeHandler({
    envOverrides: { TELEGRAM_BOT_TOKEN: undefined },
  });

  const response = await run.handler(workerRequest());

  assertEquals(response.status, 500);
  assertEquals(run.records.rpc.length, 0);
  assertEquals(run.fetchCalls.length, 0);
});

Deno.test('non-POST requests return 405', async () => {
  const run = makeHandler();

  const response = await run.handler(workerRequest(SECRET, 'GET'));

  assertEquals(response.status, 405);
  assertEquals(response.headers.get('Allow'), 'POST');
  assertEquals(run.records.rpc.length, 0);
});

Deno.test('a request deleted before load is not sent and its job is removed', async () => {
  const run = makeHandler({
    supabase: {
      claim: { data: [claimedJob()], error: null },
      requestRows: { preference_requests: null },
    },
  });

  const response = await run.handler(workerRequest());
  const body = await response.json();

  assertEquals(response.status, 200);
  assertEquals(body.skipped, 1);
  assertEquals(run.fetchCalls.length, 0);
  const deletion = run.records.deletes.find((call) => call.filters.id === 'job-1');
  assert(deletion);
  assertEquals(deletion.filters.attempts, 1);
  assertEquals(deletion.filters.locked_until, LEASE);
});

Deno.test('a job cancelled between load and send is not delivered', async () => {
  const run = makeHandler({
    supabase: {
      claim: { data: [claimedJob()], error: null },
      requestRows: { preference_requests: PREFERENCE_ROW },
      jobExists: false,
    },
  });

  const response = await run.handler(workerRequest());
  const body = await response.json();

  assertEquals(response.status, 200);
  assertEquals(body.skipped, 1);
  assertEquals(run.fetchCalls.length, 0);
  const check = run.records.selects.find((call) =>
    call.table === 'student_request_notifications' && call.filters.id === 'job-1'
  );
  assert(check);
  assertEquals(check.filters.attempts, 1);
  assertEquals(check.filters.locked_until, LEASE);
});

Deno.test('successful delivery sends plain text once and deletes the job', async () => {
  const run = makeHandler({
    supabase: {
      claim: { data: [claimedJob()], error: null },
      requestRows: { preference_requests: PREFERENCE_ROW },
      jobExists: true,
    },
  });

  const response = await run.handler(workerRequest());
  const body = await response.json();

  assertEquals(response.status, 200);
  assertEquals(body.sent, 1);
  assertEquals(run.fetchCalls.length, 1);
  assert(run.fetchCalls[0].url.includes('/bot' + VALID_ENV.TELEGRAM_BOT_TOKEN));
  assert(run.fetchCalls[0].url.endsWith('/sendMessage'));

  const payload = JSON.parse(String(run.fetchCalls[0].init.body));
  assertEquals(payload.chat_id, VALID_ENV.TELEGRAM_REQUEST_CHAT_ID);
  assertEquals(payload.parse_mode, undefined);
  assert(payload.text.includes('طلب مساعدة في اختيار معلم'));
  assert(payload.text.includes('اسم الطالب: أحمد محمد'));
  assert(payload.text.includes('رقم واتساب: 201128472424'));
  assert(payload.text.includes('العمر: 12'));
  assert(payload.text.includes('القسم: معلم (قسم الرجال)'));
  assert(payload.text.includes('وصف الاحتياج:'));
  assert(
    payload.text.includes(
      `https://app.example.test/admin/quran/requests?type=preference&id=${PREFERENCE_ID}`,
    ),
  );
  assert(payload.text.includes('(توقيت القاهرة)'));

  assert(run.records.deletes.some((call) => call.filters.id === 'job-1'));
  assertEquals(run.records.updates.length, 0);
});

Deno.test('a Telegram failure schedules a guarded retry without deleting the job', async () => {
  const run = makeHandler({
    telegramOk: false,
    supabase: {
      claim: { data: [claimedJob({ attempts: 2 })], error: null },
      requestRows: { preference_requests: PREFERENCE_ROW },
      jobExists: true,
    },
  });

  const response = await run.handler(workerRequest());
  const body = await response.json();

  assertEquals(response.status, 200);
  assertEquals(body.failed, 1);
  assertEquals(run.fetchCalls.length, 1);
  assertEquals(run.records.updates.length, 1);

  const [update] = run.records.updates;
  assertEquals(update.payload.last_error, 'telegram_send_failed');
  assertEquals(update.payload.locked_until, null);
  assertEquals(update.payload.next_attempt_at, '2026-11-06T10:05:00.000Z');
  assertEquals(update.filters.id, 'job-1');
  assertEquals(update.filters.attempts, 2);
  assertEquals(update.filters.locked_until, LEASE);
  assertEquals(run.records.deletes.some((call) => call.filters.id === 'job-1'), false);
});

Deno.test('a stale worker cannot overwrite a job reset by an admin', async () => {
  const run = makeHandler({
    telegramOk: false,
    supabase: {
      claim: { data: [claimedJob({ attempts: 3, locked_until: '2026-11-06T10:03:00.000Z' })], error: null },
      requestRows: { preference_requests: PREFERENCE_ROW },
      jobExists: true,
    },
  });

  await run.handler(workerRequest());

  const [update] = run.records.updates;
  assertEquals(update.filters.attempts, 3);
  assertEquals(update.filters.locked_until, '2026-11-06T10:03:00.000Z');
});

Deno.test('the fifth failure is retained and made due for admin retry', async () => {
  const run = makeHandler({
    telegramOk: false,
    supabase: {
      claim: { data: [claimedJob({ attempts: 5 })], error: null },
      requestRows: { preference_requests: PREFERENCE_ROW },
      jobExists: true,
    },
  });

  const response = await run.handler(workerRequest());
  const body = await response.json();

  assertEquals(body.failed, 1);
  assertEquals(run.records.updates.length, 1);
  const [update] = run.records.updates;
  assertEquals(update.payload.last_error, 'telegram_send_failed');
  assertEquals(update.payload.locked_until, null);
  assertEquals(update.payload.next_attempt_at, '2026-11-06T10:00:00.000Z');
  assertEquals(update.filters.attempts, 5);
  assertEquals(update.filters.locked_until, LEASE);
});

Deno.test('a successful send whose delete errors retires but leaves a durable row', async () => {
  const run = makeHandler({
    supabase: {
      claim: { data: [claimedJob()], error: null },
      requestRows: { preference_requests: PREFERENCE_ROW },
      jobExists: true,
      deleteJobResult: { data: null, error: { message: 'delete boom' } },
    },
  });

  const response = await run.handler(workerRequest());
  const body = await response.json();

  assertEquals(body.failed, 1);
  assertEquals(run.fetchCalls.length, 1);
  const [update] = run.records.updates;
  assertEquals(update.payload.attempts, 5);
  assertEquals(update.payload.last_error, 'notification_cleanup_failed');
  assertEquals(update.filters.attempts, 1);
  assertEquals(update.filters.locked_until, LEASE);
});

Deno.test('an invalid job is retired without sending', async () => {
  const run = makeHandler({
    supabase: {
      claim: {
        data: [claimedJob({ preference_request_id: null, subscription_request_id: null })],
        error: null,
      },
    },
  });

  const response = await run.handler(workerRequest());
  const body = await response.json();

  assertEquals(body.skipped, 1);
  assertEquals(run.fetchCalls.length, 0);
  const [update] = run.records.updates;
  assertEquals(update.payload.last_error, 'invalid_job');
  assertEquals(update.filters.attempts, 1);
  assertEquals(update.filters.locked_until, LEASE);
});

Deno.test('subscription jobs dispatch through the subscription formatter', async () => {
  const run = makeHandler({
    supabase: {
      claim: {
        data: [claimedJob({
          preference_request_id: null,
          subscription_request_id: SUBSCRIPTION_ID,
        })],
        error: null,
      },
      requestRows: { subscription_requests: SUBSCRIPTION_ROW },
      jobExists: true,
    },
  });

  const response = await run.handler(workerRequest());
  const body = await response.json();

  assertEquals(body.sent, 1);
  const payload = JSON.parse(String(run.fetchCalls[0].init.body));
  assert(payload.text.includes('طلب اشتراك مع المعلم الشيخ خالد'));
  assert(payload.text.includes('اسم الطالب: مريم'));
  assert(payload.text.includes('رقم واتساب: 447700900123'));
  assert(payload.text.includes(`id=${SUBSCRIPTION_ID}`));
  assertEquals(payload.text.includes('العمر:'), false);
  assertEquals(payload.text.includes('وصف الاحتياج:'), false);
});

Deno.test('a re-claimed row with different attempts and lease skips before send', async () => {
  const run = makeHandler({
    supabase: {
      claim: { data: [claimedJob({ attempts: 2 })], error: null },
      requestRows: { preference_requests: PREFERENCE_ROW },
      liveJob: {
        id: 'job-1',
        attempts: 3,
        locked_until: '2026-11-06T10:01:30.000Z',
      },
    },
  });

  const response = await run.handler(workerRequest());
  const body = await response.json();

  assertEquals(body.skipped, 1);
  assertEquals(run.fetchCalls.length, 0);
  assertEquals(run.records.updates.length, 0);
  const check = run.records.selects.find((call) =>
    call.table === 'student_request_notifications' && call.filters.id === 'job-1'
  );
  assert(check);
  assertEquals(check.filters.attempts, 2);
  assertEquals(check.filters.locked_until, LEASE);
});

Deno.test('an ownership select error schedules a fenced retry without sending', async () => {
  const run = makeHandler({
    supabase: {
      claim: { data: [claimedJob({ attempts: 2 })], error: null },
      requestRows: { preference_requests: PREFERENCE_ROW },
      jobLookupError: { message: 'timeout' },
    },
  });

  const response = await run.handler(workerRequest());
  const body = await response.json();

  assertEquals(body.failed, 1);
  assertEquals(run.fetchCalls.length, 0);
  assertEquals(run.records.updates.length, 1);
  const [update] = run.records.updates;
  assertEquals(update.payload.last_error, 'notification_delivery_failed');
  assertEquals(update.payload.locked_until, null);
  assertEquals(update.payload.next_attempt_at, '2026-11-06T10:05:00.000Z');
  assertEquals(update.filters.attempts, 2);
  assertEquals(update.filters.locked_until, LEASE);
  assertEquals(run.records.deletes.some((call) => call.filters.id === 'job-1'), false);
});

Deno.test('an aborted ownership select schedules a fenced retry without sending', async () => {
  const run = makeHandler({
    supabase: {
      claim: { data: [claimedJob({ attempts: 2 })], error: null },
      requestRows: { preference_requests: PREFERENCE_ROW },
      jobLookupThrows: true,
    },
  });

  const response = await run.handler(workerRequest());
  const body = await response.json();

  assertEquals(body.failed, 1);
  assertEquals(run.fetchCalls.length, 0);
  assertEquals(run.records.updates.length, 1);
  const [update] = run.records.updates;
  assertEquals(update.payload.last_error, 'notification_delivery_failed');
  assertEquals(update.payload.next_attempt_at, '2026-11-06T10:05:00.000Z');
  assertEquals(update.filters.attempts, 2);
  assertEquals(update.filters.locked_until, LEASE);
});

Deno.test('a batch deadline releases the claim without consuming the attempt or sending', async () => {
  let clockCalls = 0;
  const run = makeHandler({
    now: () => {
      clockCalls += 1;
      return clockCalls === 1 ? NOW_MS : NOW_MS + 70_001;
    },
    supabase: {
      claim: { data: [claimedJob({ attempts: 2 })], error: null },
      requestRows: { preference_requests: PREFERENCE_ROW },
    },
  });

  const response = await run.handler(workerRequest());
  const body = await response.json();

  assertEquals(body.skipped, 1);
  assertEquals(run.fetchCalls.length, 0);
  assertEquals(run.records.updates.length, 1);
  const [release] = run.records.updates;
  assertEquals(release.payload.attempts, 1);
  assertEquals(release.payload.locked_until, null);
  assertEquals(release.payload.next_attempt_at, '2026-11-06T10:01:10.001Z');
  assertEquals(release.filters.attempts, 2);
  assertEquals(release.filters.locked_until, LEASE);
});

Deno.test('an expired lease is skipped before any request load or send', async () => {
  const run = makeHandler({
    supabase: {
      claim: {
        data: [claimedJob({ attempts: 4, locked_until: '2026-11-06T09:59:00.000Z' })],
        error: null,
      },
      requestRows: { preference_requests: PREFERENCE_ROW },
    },
  });

  const response = await run.handler(workerRequest());
  const body = await response.json();

  assertEquals(body.skipped, 1);
  assertEquals(run.fetchCalls.length, 0);
  assertEquals(run.records.updates.length, 0);
  assertEquals(
    run.records.selects.some((call) => call.table === 'preference_requests'),
    false,
  );
});

Deno.test('a concurrent ownership change during send leaves the current row untouched', async () => {
  const run = makeHandler({
    supabase: {
      claim: { data: [claimedJob({ attempts: 2 })], error: null },
      requestRows: { preference_requests: PREFERENCE_ROW },
      jobExists: true,
      deleteJobResult: { data: [], error: null },
    },
  });

  const response = await run.handler(workerRequest());
  const body = await response.json();

  assertEquals(body.skipped, 1);
  assertEquals(run.fetchCalls.length, 1);
  assertEquals(run.records.updates.length, 0);
  const deletion = run.records.deletes.find((call) => call.filters.id === 'job-1');
  assert(deletion);
  assertEquals(deletion.filters.attempts, 2);
  assertEquals(deletion.filters.locked_until, LEASE);
});

Deno.test('a guarded failure update that matches no row is safe', async () => {
  const run = makeHandler({
    telegramOk: false,
    supabase: {
      claim: { data: [claimedJob({ attempts: 2 })], error: null },
      requestRows: { preference_requests: PREFERENCE_ROW },
      jobExists: true,
      updateResult: { data: [], error: null },
    },
  });

  const response = await run.handler(workerRequest());
  const body = await response.json();

  assertEquals(response.status, 200);
  assertEquals(body.failed, 1);
  assertEquals(run.records.updates.length, 1);
  assertEquals(run.records.updates[0].filters.attempts, 2);
  assertEquals(run.records.updates[0].filters.locked_until, LEASE);
});

Deno.test('a claim RPC error returns 500 without sending', async () => {
  const run = makeHandler({
    supabase: { claim: { data: null, error: { message: 'boom' } } },
  });

  const response = await run.handler(workerRequest());

  assertEquals(response.status, 500);
  assertEquals(run.fetchCalls.length, 0);
});
