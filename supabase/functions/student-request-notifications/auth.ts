export const WORKER_SECRET_HEADER = 'x-request-worker-secret';

/**
 * Compare two strings without leaking the matching prefix length through an
 * early return. Length differences are still observable, which is acceptable
 * for a fixed-length server-side shared secret.
 */
export function constantTimeEqual(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const maxLength = Math.max(leftBytes.length, rightBytes.length);

  let difference = leftBytes.length ^ rightBytes.length;

  for (let index = 0; index < maxLength; index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return difference === 0;
}

export function isAuthorizedWorkerRequest(
  request: Request,
  expectedSecret: string | null | undefined,
): boolean {
  if (typeof expectedSecret !== 'string' || expectedSecret.length === 0) {
    return false;
  }

  const providedSecret = request.headers.get(WORKER_SECRET_HEADER);
  if (!providedSecret) {
    return false;
  }

  return constantTimeEqual(providedSecret, expectedSecret);
}
