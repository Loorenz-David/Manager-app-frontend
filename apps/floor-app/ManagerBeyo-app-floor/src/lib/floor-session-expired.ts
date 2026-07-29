const FLOOR_SESSION_EXPIRED_STORAGE_KEY = "beyo.floor.session-expired";

export function markFloorSessionExpired(): void {
  try {
    sessionStorage.setItem(FLOOR_SESSION_EXPIRED_STORAGE_KEY, "true");
  } catch {
    // Storage can be unavailable in hardened kiosk/browser modes.
  }
}

export function hasFloorSessionExpired(): boolean {
  try {
    return sessionStorage.getItem(FLOOR_SESSION_EXPIRED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function clearFloorSessionExpired(): void {
  try {
    sessionStorage.removeItem(FLOOR_SESSION_EXPIRED_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in hardened kiosk/browser modes.
  }
}
