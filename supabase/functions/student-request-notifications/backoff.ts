export const MAX_NOTIFICATION_ATTEMPTS = 5;
export const NOTIFICATION_LEASE_MS = 2 * 60 * 1000;

/** Delay applied after the attempt number recorded by the claim RPC. */
export const NOTIFICATION_BACKOFF_DELAYS_MS = [
  60 * 1000,
  5 * 60 * 1000,
  15 * 60 * 1000,
  60 * 60 * 1000,
] as const;

export interface RetrySchedule {
  exhausted: boolean;
  nextAttemptAt: string;
}

export function getBackoffDelayMs(attempts: number): number | null {
  if (!Number.isFinite(attempts) || attempts < 1) {
    return NOTIFICATION_BACKOFF_DELAYS_MS[0];
  }

  if (attempts >= MAX_NOTIFICATION_ATTEMPTS) {
    return null;
  }

  return NOTIFICATION_BACKOFF_DELAYS_MS[attempts - 1];
}

export function getRetrySchedule(attempts: number, nowMs = Date.now()): RetrySchedule {
  const delay = getBackoffDelayMs(attempts);

  return {
    exhausted: delay === null,
    // Exhausted jobs are retained for an admin retry, so keep them due now.
    // The claim RPC skips attempts >= MAX_NOTIFICATION_ATTEMPTS.
    nextAttemptAt: new Date(nowMs + (delay ?? 0)).toISOString(),
  };
}
