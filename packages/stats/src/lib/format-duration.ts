export function secondsToHM(totalSeconds: number): string {
  const totalMinutes = Math.max(0, Math.floor(totalSeconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes}m`;
}

// Local 24-hour HH:mm of an ISO timestamp; null-safe → "—".
export function formatHHmm(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }

  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}
