/**
 * TEMPORARY diagnostic for the batch pause bug. Delete this file and its call
 * sites once the cause is established.
 */

function stamp(): string {
  return new Date().toISOString().slice(11, 23);
}

export function logStepClock(event: string, data: Record<string, unknown>): void {
  // eslint-disable-next-line no-console
  console.log(`[step-clock ${stamp()}] ${event}`, JSON.stringify(data));
}

const lastSignatureByKey = new Map<string, string>();

/** Renders repeat; only log when the inputs actually change. */
export function logStepClockOnce(
  key: string,
  event: string,
  data: Record<string, unknown>,
): void {
  const signature = JSON.stringify(data);
  if (lastSignatureByKey.get(key) === signature) {
    return;
  }

  lastSignatureByKey.set(key, signature);
  logStepClock(event, data);
}
