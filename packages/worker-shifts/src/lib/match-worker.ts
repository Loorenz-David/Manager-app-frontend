import type { FloorRosterUser } from "../types";

export function matchWorker(
  roster: readonly FloorRosterUser[],
  input: string,
): FloorRosterUser | null {
  try {
    const candidate = input.trim();
    if (!candidate) {
      return null;
    }

    const emailCandidate = candidate.toLocaleLowerCase();

    return (
      roster.find(
        (worker) =>
          worker.clock_in_code === candidate ||
          worker.email.toLocaleLowerCase() === emailCandidate,
      ) ?? null
    );
  } catch {
    return null;
  }
}
