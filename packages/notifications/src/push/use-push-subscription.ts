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
  if (!isPushSupported()) return "unsupported";
  if (isIosOutsideStandalone()) return "needs_ios_pwa";

  const permission = getNotificationPermission();
  if (permission === "unsupported") return "unsupported";
  if (permission === "denied") return "denied";
  if (permission === "default") return "not_requested";

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
      setIsLoading(true);

      try {
        const reg = await getSwRegistration();
        if (!reg) {
          setStatus("unregistered");
          return;
        }
        if (cancelled) return;

        const existing = await reg.pushManager.getSubscription();
        if (!existing || cancelled) {
          setStatus("unregistered");
          return;
        }

        const input = buildRegistrationInput(existing);
        await registerPushSubscription(input);

        if (!cancelled) setStatus("registered");
      } catch {
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
    if (!isPushSupported() || isIosOutsideStandalone()) return;

    setIsLoading(true);
    setStatus("registering");

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "not_requested");
        return;
      }

      const reg = await getSwRegistration();
      if (!reg) throw new Error("No service worker registration");

      const vapidPublicKey = await fetchVapidPublicKey();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      const input = buildRegistrationInput(sub);

      await registerPushSubscription(input);
      setStatus("registered");
    } catch {
      setStatus("error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setIsLoading(true);

    try {
      const reg = await getSwRegistration();
      if (!reg) {
        setStatus("unregistered");
        return;
      }

      const sub = await reg.pushManager.getSubscription();
      if (!sub) {
        setStatus("unregistered");
        return;
      }

      const input = buildRegistrationInput(sub);
      await sub.unsubscribe();
      await unregisterPushSubscription(input);
      setStatus("unregistered");
    } catch {
      setStatus("error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { status, enable, disable, isLoading };
}
