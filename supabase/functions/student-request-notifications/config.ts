import { normalizeAppOrigin } from './message.ts';

export interface WorkerConfig {
  telegramBotToken: string;
  telegramChatId: string;
  workerSecret: string;
  appOrigin: string;
}

export class WorkerConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkerConfigError';
  }
}

function requiredEnv(
  getEnv: (name: string) => string | undefined,
  name: string,
): string {
  const value = getEnv(name)?.trim();
  if (!value) {
    throw new WorkerConfigError(`Missing required worker configuration: ${name}`);
  }

  return value;
}

/**
 * Read only the shared secret. Authorization runs before any token or
 * destination configuration is loaded, so an unauthenticated caller receives
 * a 401 even when the Telegram token is not configured yet.
 */
export function readWorkerSecret(
  getEnv: (name: string) => string | undefined = (name) => Deno.env.get(name),
): string {
  return requiredEnv(getEnv, 'STUDENT_REQUESTS_WORKER_SECRET');
}

/**
 * Validate all send-time configuration before the worker claims any outbox
 * rows. A missing token, chat destination, or app origin therefore returns a
 * generic 500 without incrementing attempts or consuming a lease.
 */
export function readWorkerConfig(
  getEnv: (name: string) => string | undefined = (name) => Deno.env.get(name),
): WorkerConfig {
  const telegramBotToken = requiredEnv(getEnv, 'TELEGRAM_BOT_TOKEN');
  const telegramChatId = requiredEnv(getEnv, 'TELEGRAM_REQUEST_CHAT_ID');
  const workerSecret = readWorkerSecret(getEnv);

  let appOrigin: string;
  try {
    // Keep notification links independent of PUBLIC_APP_ORIGIN, which also
    // controls CORS for other Edge Functions. Fall back for existing installs.
    const notificationOrigin = getEnv('STUDENT_REQUESTS_APP_ORIGIN')?.trim();
    appOrigin = normalizeAppOrigin(notificationOrigin || requiredEnv(getEnv, 'PUBLIC_APP_ORIGIN'));
  } catch {
    throw new WorkerConfigError('Invalid required worker configuration: student request app origin');
  }

  return { telegramBotToken, telegramChatId, workerSecret, appOrigin };
}
