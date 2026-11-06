import { createAdminClient } from '../_shared/supabase.ts';
import { isAuthorizedWorkerRequest } from './auth.ts';
import {
  getRetrySchedule,
  MAX_NOTIFICATION_ATTEMPTS,
} from './backoff.ts';
import {
  readWorkerConfig,
  readWorkerSecret,
  type WorkerConfig,
} from './config.ts';
import { safeFailureReason } from './errors.ts';
import {
  buildTelegramPayload,
  formatRequestMessage,
  type StudentRequestType,
  type StudentRequestView,
} from './message.ts';

const NOTIFICATIONS_TABLE = 'student_request_notifications';
// A small batch, short DB abort timeouts, and a send budget keep one
// invocation comfortably inside the 2-minute claim lease.
const CLAIM_BATCH_SIZE = 5;
const DB_REQUEST_TIMEOUT_MS = 8_000;
const BATCH_SEND_BUDGET_MS = 70_000;
const TELEGRAM_REQUEST_TIMEOUT_MS = 8_000;

type SupabaseAdminClient = ReturnType<typeof createAdminClient>;
type EnvReader = (name: string) => string | undefined;

export interface WorkerLogger {
  error: (...args: unknown[]) => void;
}

export interface WorkerRuntime {
  env?: EnvReader;
  createSupabase?: () => SupabaseAdminClient;
  telegramFetch?: typeof fetch;
  now?: () => number;
  logger?: WorkerLogger;
}

interface ClaimedNotificationJob {
  id: string;
  preference_request_id: string | null;
  subscription_request_id: string | null;
  attempts: number;
  next_attempt_at?: string | null;
  locked_until?: string | null;
  last_error?: string | null;
  created_at?: string | null;
}

interface ProcessDependencies {
  telegramFetch: typeof fetch;
  now: () => number;
  batchDeadlineMs: number;
}

type DeleteJobOutcome = 'deleted' | 'not_owned' | 'error';

function dbAbortSignal(): AbortSignal {
  return AbortSignal.timeout(DB_REQUEST_TIMEOUT_MS);
}

function isLeaseActive(job: ClaimedNotificationJob, nowMs: number): boolean {
  if (typeof job.locked_until !== 'string' || job.locked_until.length === 0) {
    return false;
  }

  const leaseUntilMs = Date.parse(job.locked_until);
  return Number.isFinite(leaseUntilMs) && leaseUntilMs > nowMs;
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

function requestTypeFor(job: ClaimedNotificationJob): StudentRequestType | null {
  const hasPreference = Boolean(job.preference_request_id);
  const hasSubscription = Boolean(job.subscription_request_id);

  if (hasPreference === hasSubscription) {
    return null;
  }

  return hasPreference ? 'preference' : 'subscription';
}

function requestTableFor(type: StudentRequestType): string {
  return type === 'preference' ? 'preference_requests' : 'subscription_requests';
}

function requestSelectFor(type: StudentRequestType): string {
  return type === 'preference'
    ? 'id,student_name,age,whatsapp,description,gender_preference,created_at'
    : 'id,teacher_name,student_name,whatsapp,created_at';
}

/**
 * Guard failure/retirement updates with the claim's attempt count and lease.
 * An admin retry resets attempts and locked_until, so a stale worker can no
 * longer overwrite the reset row and suppress the manual retry.
 */
function claimGuard(job: ClaimedNotificationJob): Record<string, unknown> {
  const guard: Record<string, unknown> = {
    id: job.id,
    attempts: job.attempts,
  };

  if (typeof job.locked_until === 'string' && job.locked_until.length > 0) {
    guard.locked_until = job.locked_until;
  }

  return guard;
}

async function sendTelegramMessage(
  telegramFetch: typeof fetch,
  config: WorkerConfig,
  text: string,
): Promise<void> {
  const response = await telegramFetch(
    `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildTelegramPayload(config.telegramChatId, text)),
      signal: AbortSignal.timeout(TELEGRAM_REQUEST_TIMEOUT_MS),
    },
  );

  if (!response.ok) {
    throw new Error('telegram_send_failed');
  }

  const result = await response.json().catch(() => null);
  if (!result || result.ok !== true) {
    throw new Error('telegram_send_failed');
  }
}

async function claimJobs(
  supabase: SupabaseAdminClient,
): Promise<ClaimedNotificationJob[]> {
  const { data, error } = await supabase
    .rpc('claim_student_request_notifications', {
      p_limit: CLAIM_BATCH_SIZE,
    })
    .abortSignal(dbAbortSignal());

  if (error) {
    throw new Error('claim_failed');
  }

  return Array.isArray(data) ? (data as ClaimedNotificationJob[]) : [];
}

/**
 * Delete only the exact claim this worker still owns. A request deletion
 * removes the row and returns not_owned; a newer claim or admin reset changes
 * attempts/locked_until and also returns not_owned, leaving the current owner's
 * row untouched.
 */
async function deleteJob(
  supabase: SupabaseAdminClient,
  job: ClaimedNotificationJob,
): Promise<DeleteJobOutcome> {
  try {
    const { data, error } = await supabase
      .from(NOTIFICATIONS_TABLE)
      .delete()
      .match(claimGuard(job))
      .abortSignal(dbAbortSignal())
      .select('id');

    if (error) {
      return 'error';
    }

    return Array.isArray(data) && data.length > 0 ? 'deleted' : 'not_owned';
  } catch {
    return 'error';
  }
}

async function retireJob(
  supabase: SupabaseAdminClient,
  job: ClaimedNotificationJob,
  reason: string,
): Promise<void> {
  try {
    await supabase
      .from(NOTIFICATIONS_TABLE)
      .update({
        attempts: MAX_NOTIFICATION_ATTEMPTS,
        next_attempt_at: new Date().toISOString(),
        locked_until: null,
        last_error: safeFailureReason(reason),
      })
      .match(claimGuard(job))
      .abortSignal(dbAbortSignal());
  } catch {
    // Never let a cleanup error crash the current batch.
  }
}

async function markJobFailed(
  supabase: SupabaseAdminClient,
  job: ClaimedNotificationJob,
  reason: string,
  nowMs: number,
): Promise<void> {
  const attempts = Number.isFinite(Number(job.attempts)) ? Number(job.attempts) : 1;
  const schedule = getRetrySchedule(attempts, nowMs);

  try {
    await supabase
      .from(NOTIFICATIONS_TABLE)
      .update({
        next_attempt_at: schedule.nextAttemptAt,
        locked_until: null,
        last_error: safeFailureReason(reason),
      })
      .match(claimGuard(job))
      .abortSignal(dbAbortSignal());
  } catch {
    // The lease will expire and the RPC will make the job claimable again.
  }
}

/**
 * Confirm the claimed job still exists and is still owned by this claim
 * immediately before the external send. The guard includes id, attempts, and
 * locked_until, so a request deletion, a newer claim, or an admin reset makes
 * this return false and the stale worker skips the send. The check narrows
 * (but cannot remove) the unavoidable in-flight deletion race.
 */
type OwnershipCheck = 'owned' | 'not_owned' | 'error';

async function jobStillOwned(
  supabase: SupabaseAdminClient,
  job: ClaimedNotificationJob,
  nowMs: number,
): Promise<OwnershipCheck> {
  if (!isLeaseActive(job, nowMs)) {
    return 'not_owned';
  }

  try {
    const { data, error } = await supabase
      .from(NOTIFICATIONS_TABLE)
      .select('id')
      .match(claimGuard(job))
      .abortSignal(dbAbortSignal())
      .maybeSingle();

    if (error) {
      return 'error';
    }

    return data ? 'owned' : 'not_owned';
  } catch {
    // Network/abort errors are ambiguous: the row may still be ours. Return a
    // distinct error state so the caller schedules a fenced retry instead of
    // leaving the claim to expire with a consumed attempt.
    return 'error';
  }
}

/**
 * Return a claimed-but-never-sent job to the due queue without consuming an
 * attempt. The update is fenced by the exact claim, so a re-claimed row or an
 * admin reset matches nothing and is never modified.
 */
async function releaseClaim(
  supabase: SupabaseAdminClient,
  job: ClaimedNotificationJob,
  nowMs: number,
): Promise<void> {
  const attempts = Number.isFinite(Number(job.attempts)) ? Number(job.attempts) : 1;

  try {
    await supabase
      .from(NOTIFICATIONS_TABLE)
      .update({
        attempts: Math.max(0, attempts - 1),
        next_attempt_at: new Date(nowMs).toISOString(),
        locked_until: null,
      })
      .match(claimGuard(job))
      .abortSignal(dbAbortSignal());
  } catch {
    // If the release fails, the lease expiry path remains safe; the attempt is
    // consumed but no message was sent.
  }
}

async function processJob(
  supabase: SupabaseAdminClient,
  job: ClaimedNotificationJob,
  config: WorkerConfig,
  dependencies: ProcessDependencies,
): Promise<'sent' | 'failed' | 'skipped'> {
  const startedAtMs = dependencies.now();
  if (!isLeaseActive(job, startedAtMs)) {
    // Never modify an expired claim: another worker may already own it.
    return 'skipped';
  }

  if (startedAtMs >= dependencies.batchDeadlineMs) {
    // No send happened for this claim, so give the attempt back if we still
    // own it. This avoids exhausting retries merely because a batch was slow.
    await releaseClaim(supabase, job, startedAtMs);
    return 'skipped';
  }

  const type = requestTypeFor(job);

  if (!type) {
    await retireJob(supabase, job, 'invalid_job');
    return 'skipped';
  }

  const requestId = type === 'preference'
    ? job.preference_request_id
    : job.subscription_request_id;

  if (!requestId) {
    await retireJob(supabase, job, 'invalid_job');
    return 'skipped';
  }

  const { data: request, error: requestError } = await supabase
    .from(requestTableFor(type))
    .select(requestSelectFor(type))
    .eq('id', requestId)
    .abortSignal(dbAbortSignal())
    .maybeSingle();

  if (requestError) {
    await markJobFailed(supabase, job, 'request_load_failed', dependencies.now());
    return 'failed';
  }

  // Cascade deletes normally remove the job. If the request vanished between
  // claim and load, remove the orphan instead of sending stale data.
  if (!request) {
    const deletion = await deleteJob(supabase, job);
    if (deletion === 'error') {
      // Only retire when the guarded delete failed. A not_owned result means
      // a newer claim or admin reset owns the row and must not be touched.
      await retireJob(supabase, job, 'invalid_job');
    }
    return 'skipped';
  }

  let text: string;
  try {
    text = formatRequestMessage({
      appOrigin: config.appOrigin,
      type,
      request: request as unknown as StudentRequestView,
    });
  } catch {
    await markJobFailed(supabase, job, 'message_build_failed', dependencies.now());
    return 'failed';
  }

  // Deletion cancels the job through the cascade. Re-check ownership and lease
  // at the last moment so a cancelled request or a row re-claimed after lease
  // expiry is not sent from this stale worker.
  const preSendNowMs = dependencies.now();
  if (!isLeaseActive(job, preSendNowMs)) {
    // Expired leases are left alone; ownership may already have moved.
    return 'skipped';
  }

  if (preSendNowMs >= dependencies.batchDeadlineMs) {
    // Still before any external send, so fenced-release the claim.
    await releaseClaim(supabase, job, preSendNowMs);
    return 'skipped';
  }

  const ownership = await jobStillOwned(supabase, job, preSendNowMs);
  if (ownership === 'not_owned') {
    return 'skipped';
  }

  if (ownership === 'error') {
    // Ambiguous ownership read. Schedule a fenced retry with backoff; if this
    // claim was lost, the guard prevents touching the new owner's row.
    await markJobFailed(
      supabase,
      job,
      'notification_delivery_failed',
      dependencies.now(),
    );
    return 'failed';
  }

  try {
    await sendTelegramMessage(dependencies.telegramFetch, config, text);
  } catch {
    await markJobFailed(supabase, job, 'telegram_send_failed', dependencies.now());
    return 'failed';
  }

  const deletion = await deleteJob(supabase, job);
  if (deletion === 'deleted') {
    return 'sent';
  }

  if (deletion === 'not_owned') {
    // Ownership changed during the send. The message is already out, but the
    // current owner's row (or admin reset) must be left exactly as it is.
    return 'skipped';
  }

  // The delete errored, not a definitive ownership loss. Retire with the same
  // claim guard: if ownership did change, this update matches nothing. If this
  // worker still owns the row, retirement prevents a duplicate send.
  await retireJob(supabase, job, 'notification_cleanup_failed');
  return 'failed';
}

/**
 * Authenticated server-only worker. The gateway JWT check is disabled in
 * config.toml; callers must present the shared x-request-worker-secret header.
 * The handler is built through a factory so tests can inject the Supabase
 * client, fetch, clock, and environment without contacting Telegram.
 */
export function createWorkerHandler(runtime: WorkerRuntime = {}) {
  return async function handleRequest(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405, { Allow: 'POST' });
    }

    const getEnv: EnvReader = runtime.env ?? ((name) => Deno.env.get(name));
    const logger: WorkerLogger = runtime.logger ?? console;

    let workerSecret: string;
    try {
      workerSecret = readWorkerSecret(getEnv);
    } catch {
      logger.error('student_request_notifications_configuration_invalid');
      return jsonResponse({ error: 'Internal server error' }, 500);
    }

    // Authenticate before reading the Telegram token or destination so an
    // unauthenticated caller always receives 401, even on a half-configured
    // deployment.
    if (!isAuthorizedWorkerRequest(request, workerSecret)) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    let config: WorkerConfig;
    try {
      config = readWorkerConfig(getEnv);
    } catch {
      logger.error('student_request_notifications_configuration_invalid');
      return jsonResponse({ error: 'Internal server error' }, 500);
    }

    let supabase: SupabaseAdminClient;
    try {
      supabase = (runtime.createSupabase ?? createAdminClient)();
    } catch {
      logger.error('student_request_notifications_supabase_config_invalid');
      return jsonResponse({ error: 'Internal server error' }, 500);
    }

    const now = runtime.now ?? (() => Date.now());
    const nowMs = now();
    const batchDeadlineMs = nowMs + BATCH_SEND_BUDGET_MS;

    let jobs: ClaimedNotificationJob[];
    try {
      jobs = await claimJobs(supabase);
    } catch {
      logger.error('student_request_notifications_claim_failed');
      return jsonResponse({ error: 'Internal server error' }, 500);
    }

    const dependencies: ProcessDependencies = {
      telegramFetch: runtime.telegramFetch ?? fetch,
      now,
      batchDeadlineMs,
    };

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const job of jobs) {
      try {
        const result = await processJob(supabase, job, config, dependencies);
        if (result === 'sent') {
          sent += 1;
        } else if (result === 'failed') {
          failed += 1;
        } else {
          skipped += 1;
        }
      } catch {
        await markJobFailed(
          supabase,
          job,
          'notification_delivery_failed',
          now(),
        );
        failed += 1;
      }
    }

    return jsonResponse({
      ok: true,
      claimed: jobs.length,
      sent,
      failed,
      skipped,
    });
  };
}

export const handleRequest = createWorkerHandler();
