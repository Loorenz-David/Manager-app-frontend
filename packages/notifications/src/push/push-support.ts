export function isPushSupported(): boolean {
  return (
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export function isIosOutsideStandalone(): boolean {
  const isIos =
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

  return isIos && !isStandalone;
}

export function getNotificationPermission():
  | NotificationPermission
  | "unsupported" {
  if (!isPushSupported()) return "unsupported";

  return Notification.permission;
}
