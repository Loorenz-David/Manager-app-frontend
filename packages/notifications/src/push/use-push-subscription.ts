import { useCallback, useEffect, useRef, useState } from "react";
import { fetchVapidPublicKey } from "../api/push/fetch-vapid-public-key";
import { registerPushSubscription } from "../api/push/register-push-subscription";
import { unregisterPushSubscription } from "../api/push/unregister-push-subscription";
import { arrayBufferToBase64url, urlBase64ToUint8Array } from "./push-crypto";
import {
  getNotificationPermission,
  isIosOutsideStandalone,
  isPushSupported,
} from "./push-support";
import { pushLog } from "./push-debug-log";

export type PushSubscriptionStatus =
  | "unsupported"
  | "needs_ios_pwa"
  | "not_requested"
  | "denied"
  | "registering"
  | "registered"
  | "unregistered"
  | "error";

export type UsePushSubscriptionResult = {
  status: PushSubscriptionStatus;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  isLoading: boolean;
};

async function getSwRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;

  try {
    return (await navigator.serviceWorker.getRegistration()) ?? null;
  } catch {
    return null;
  }
}

function buildRegistrationInput(sub: PushSubscription) {
  const p256dhKey = sub.getKey("p256dh");
  const authKey = sub.getKey("auth");

  if (!p256dhKey || !authKey) {
    throw new Error("Missing PushSubscription keys");
  }

  return {
    endpoint: sub.endpoint,
    p256dh: arrayBufferToBase64url(p256dhKey),
    auth: arrayBufferToBase64url(authKey),
    device_label: navigator.userAgent.slice(0, 200),
  };
}

function getInitialStatus(): PushSubscriptionStatus {
  const supported = isPushSupported();
  const iosOutside = isIosOutsideStandalone();
  const permission = getNotificationPermission();

  pushLog(`UA: ${navigator.userAgent.slice(0, 120)}`);
  pushLog(`isPushSupported: ${supported}`);
  pushLog(`isIosOutsideStandalone: ${iosOutside}`);
  pushLog(`Notification.permission: ${permission}`);
  pushLog(`serviceWorker in navigator: ${"serviceWorker" in navigator}`);
  pushLog(`PushManager in window: ${"PushManager" in window}`);
  pushLog(`Notification in window: ${"Notification" in window}`);
  pushLog(
    `display-mode standalone: ${window.matchMedia("(display-mode: standalone)").matches}`,
  );
  pushLog(
    `navigator.standalone: ${(navigator as Navigator & { standalone?: boolean }).standalone}`,
  );

  if (!supported) {
    pushLog("initial status → unsupported");
    return "unsupported";
  }
  if (iosOutside) {
    pushLog("initial status → needs_ios_pwa");
    return "needs_ios_pwa";
  }
  if (permission === "unsupported") {
    pushLog("initial status → unsupported (permission check)");
    return "unsupported";
  }
  if (permission === "denied") {
    pushLog("initial status → denied");
    return "denied";
  }
  if (permission === "default") {
    pushLog("initial status → not_requested");
    return "not_requested";
  }

  pushLog("initial status → registering (permission already granted)");
  return "registering";
}

export function usePushSubscription(): UsePushSubscriptionResult {
  const [status, setStatus] = useState<PushSubscriptionStatus>(getInitialStatus);
  const [isLoading, setIsLoading] = useState(false);
  const shouldReconcileOnMount = useRef(status === "registering");

  useEffect(() => {
    if (status !== "registering" || !shouldReconcileOnMount.current) return;
    shouldReconcileOnMount.current = false;

    let cancelled = false;

    async function reconcile() {
      pushLog("reconcile: start");
      setIsLoading(true);

      try {
        if (!("serviceWorker" in navigator)) {
          pushLog("reconcile: no SW support → unregistered");
          setStatus("unregistered");
          return;
        }

        // Wait for the SW to be fully activated before calling getKey() on the
        // push subscription. iOS throws "An unexpected internal error occurred."
        // if getKey() is called while the SW is still in "activating" state.
        const reg = await navigator.serviceWorker.ready;
        pushLog(`reconcile: SW ready — active state = ${reg.active?.state ?? "null"}`);
        if (cancelled) return;

        const existing = await reg.pushManager.getSubscription();
        if (!existing || cancelled) {
          pushLog("reconcile: no existing push subscription → unregistered");
          setStatus("unregistered");
          return;
        }
        pushLog(`reconcile: existing subscription endpoint = ${existing.endpoint.slice(0, 60)}…`);

        const input = buildRegistrationInput(existing);
        await registerPushSubscription(input);

        if (!cancelled) {
          pushLog("reconcile: re-registered successfully → registered");
          setStatus("registered");
        }
      } catch (err) {
        pushLog(`reconcile: ERROR — ${err instanceof Error ? err.message : String(err)}`);
        if (!cancelled) setStatus("error");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void reconcile();

    return () => {
      cancelled = true;
    };
  }, [status]);

  const enable = useCallback(async () => {
    pushLog("enable: called");
    if (!isPushSupported() || isIosOutsideStandalone()) {
      pushLog("enable: aborted — unsupported or iOS outside standalone");
      return;
    }

    // iOS WebKit requires requestPermission to be called before any await or
    // React state update — state flushes go through the microtask queue and
    // consume the user activation token, causing the permission dialog to never
    // appear and the call to silently fail.
    let permission: NotificationPermission;
    try {
      pushLog("enable: calling Notification.requestPermission()");
      permission = await Notification.requestPermission();
      pushLog(`enable: requestPermission result = ${permission}`);
    } catch (err) {
      pushLog(`enable: requestPermission threw — ${err instanceof Error ? err.message : String(err)}`);
      setStatus("error");
      return;
    }

    setIsLoading(true);
    setStatus("registering");

    if (permission !== "granted") {
      pushLog(`enable: permission not granted (${permission}) → ${permission === "denied" ? "denied" : "not_requested"}`);
      setStatus(permission === "denied" ? "denied" : "not_requested");
      setIsLoading(false);
      return;
    }

    try {
      pushLog("enable: waiting for navigator.serviceWorker.ready");
      // navigator.serviceWorker.ready waits until the SW is fully active.
      // getRegistration() can return a registration still in "installing" state,
      // and calling pushManager.subscribe() on it fails on iOS.
      const reg = await navigator.serviceWorker.ready;
      pushLog(`enable: SW ready — active state = ${reg.active?.state ?? "null"}`);

      pushLog("enable: fetching VAPID public key");
      const vapidPublicKey = await fetchVapidPublicKey();
      pushLog(`enable: VAPID key fetched (length=${vapidPublicKey.length})`);

      pushLog("enable: calling pushManager.subscribe()");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      pushLog(`enable: subscribed — endpoint = ${sub.endpoint.slice(0, 60)}…`);

      const input = buildRegistrationInput(sub);
      pushLog("enable: registering subscription with backend");
      await registerPushSubscription(input);
      pushLog("enable: backend registration successful → registered");
      setStatus("registered");
    } catch (err) {
      pushLog(`enable: ERROR — ${err instanceof Error ? `${err.name}: ${err.message}` : String(err)}`);
      setStatus("error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disable = useCallback(async () => {
    pushLog("disable: called");
    setIsLoading(true);

    try {
      const reg = await getSwRegistration();
      if (!reg) {
        pushLog("disable: no SW registration → unregistered");
        setStatus("unregistered");
        return;
      }

      const sub = await reg.pushManager.getSubscription();
      if (!sub) {
        pushLog("disable: no push subscription → unregistered");
        setStatus("unregistered");
        return;
      }

      const input = buildRegistrationInput(sub);
      await sub.unsubscribe();
      await unregisterPushSubscription(input);
      pushLog("disable: unsubscribed successfully → unregistered");
      setStatus("unregistered");
    } catch (err) {
      pushLog(`disable: ERROR — ${err instanceof Error ? `${err.name}: ${err.message}` : String(err)}`);
      setStatus("error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { status, enable, disable, isLoading };
}
