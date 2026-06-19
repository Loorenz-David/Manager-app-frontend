export function resolveSocketUrl(): string {
  const ws = import.meta.env.VITE_WS_URL;
  if (ws) return ws;

  const api = import.meta.env.VITE_API_URL;
  return api || window.location.origin;
}
