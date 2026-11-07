const SAFE_FAILURE_REASONS = new Set([
  'telegram_send_failed',
  'request_load_failed',
  'message_build_failed',
  'notification_cleanup_failed',
  'invalid_job',
  'notification_delivery_failed',
]);

/** Only known, non-sensitive reasons may be persisted or logged. */
export function safeFailureReason(reason: unknown): string {
  if (typeof reason === 'string' && SAFE_FAILURE_REASONS.has(reason)) {
    return reason;
  }

  return 'notification_delivery_failed';
}
