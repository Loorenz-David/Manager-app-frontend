import { unregisterPushSubscription } from "../api/push/unregister-push-subscription";
import { arrayBufferToBase64url } from "./push-crypto";

export async function unregisterCurrentDevicePush(): Promise<void> {
  try {
    if (!("serviceWorker" in navigator)) return;

    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return;

    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;

    const p256dhKey = sub.getKey("p256dh");
    const authKey = sub.getKey("auth");
    if (!p256dhKey || !authKey) return;

    const input = {
      endpoint: sub.endpoint,
      p256dh: arrayBufferToBase64url(p256dhKey),
      auth: arrayBufferToBase64url(authKey),
    };

    await sub.unsubscribe();
    await unregisterPushSubscription(input);
  } catch {
    // Sign-out must not block on push cleanup failure.
  }
}
