# PLAN_vapid_push_notifications_20260619

## Metadata

- Plan ID: `PLAN_vapid_push_notifications_20260619`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-19T00:00:00Z`
- Last updated at (UTC): `2026-06-19T14:43:47Z`
- Related issue/ticket: none
- Intention plan: `docs/architecture/under_construction/intention/vapid_development.txt`

## Goal and intent

- Goal: Implement the frontend Web Push / VAPID notification pipeline. The backend APIs are already live and documented in `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_push_notification_system_20260619.md`. This plan covers: push subscription API layer in `@beyo/notifications`, subscription lifecycle hook with startup reconciliation, custom service-worker push + notificationclick handlers for both apps, sign-out push cleanup in `@beyo/auth`, a post-auth reconciliation mount, and an enable / disable toggle in each app's settings view.
- Business/user intent: Users on Android and iPhone PWAs receive OS-level notifications when the app is closed or backgrounded. Push is a parallel delivery channel — it does not replace the existing Socket.IO + REST notification flow. The persisted notification record remains the canonical source of truth. Both channels may fire for the same notification; the service worker suppresses the OS notification when a focused app window is already open.
- Non-goals: Test-notification endpoint (no backend endpoint for it yet). Full device-health dashboard. Cases push notifications (backend gap, documented in handoff). Notification preferences screen. `pushsubscriptionchange` event listener (startup reconciliation is the primary recovery mechanism).

## Scope

- In scope:
  - New push API functions in `packages/notifications`
  - Push crypto utilities and capability detection utilities in `packages/notifications`
  - `usePushSubscription` hook (reconciliation on mount + explicit `enable` / `disable` actions)
  - `unregisterCurrentDevicePush` plain async function used by sign-out
  - Switch both app vite configs from `generateSW` to `injectManifest`
  - Custom `sw.ts` in each app: precaching via Workbox + push event handler + notificationclick handler
  - `PushMount` component in each app (renders null, calls `usePushSubscription` for startup reconciliation)
  - Extend each app's `SettingsView` and controller with push enable / disable
  - Update `@beyo/auth`'s `useSignOutMutation` to call `unregisterCurrentDevicePush` best-effort before clearing auth
- Out of scope:
  - Backend changes (APIs are live)
  - Push notification preferences per notification type
  - Analytics or click-through tracking
  - Sellers app (not yet in scope)
- Assumptions:
  - `@beyo/api-client`'s `apiClient` is available in all `@beyo/notifications` API files
  - `ApiEnvelopeSchema` from `@beyo/lib` follows the `{ ok: true, data: T }` shape already used across all notification API files
  - Both apps run `vite-plugin-pwa` with `registerType: "prompt"` and `injectRegister: "auto"` — these options remain unchanged after the strategy switch
  - The workers app's settings view is inside a `SettingsViewProvider` context; the controller owns `SettingsState` plus any new push fields
  - iOS Safari Web Push requires standalone mode (Add to Home Screen); the status enum communicates this state instead of requesting permission in-browser Safari

## Clarifications required

_(none — backend is live, all contracts are known)_

## Acceptance criteria

1. After login, if notification permission is already `granted` and a service-worker push subscription exists, the frontend re-registers the subscription idempotently with the backend (reconciliation) without any user action.
2. On the Settings page, tapping "Enable Notifications" requests permission, subscribes via `PushManager`, and POSTs to the backend. The button label and state reflect the current push status.
3. On sign-out, the browser push subscription is unsubscribed and the backend endpoint is called to remove it. Sign-out completes even if push cleanup fails.
4. When the app is backgrounded or closed, a push event from the backend causes the OS to display a notification. When a focused window is already open, the push event is suppressed (socket flow already handled it).
5. Clicking an OS notification opens or focuses the app and navigates to the relevant route based on `entity_type`.
6. TypeScript compilation (`npm run typecheck`) passes with zero errors.

## Contracts and skills

### Contracts loaded

- `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_push_notification_system_20260619.md`: complete API contract, payload shape, deduplication pattern, lifecycle flow

### Local extensions loaded

- `packages/notifications/src/api/fetch-unread-count.ts`: reference for `ApiEnvelopeSchema` + `apiClient.get` pattern
- `packages/auth/src/api/use-sign-out.ts`: reference for sign-out mutation shape before modification
- `apps/workers-app/ManagerBeyo-app-workers/vite.config.ts`: current Workbox config to carry forward into `injectManifest`
- `apps/workers-app/ManagerBeyo-app-workers/src/features/settings/types.ts`: reference for `SettingsState` shape
- `apps/managers-app/ManagerBeyo-app-managers/src/features/settings/controllers/use-settings-view.controller.ts`: reference for controller pattern

### File read intent — pattern vs. relational

Permitted reads during implementation:
- Reading existing API files in `@beyo/notifications` to confirm import paths and schema patterns
- Reading `packages/api-client/src/api-client.ts` to confirm `apiClient.delete` body parameter position
- Reading `lib/routes.ts` in each app to confirm route constants for notificationclick routing

Prohibited reads:
- Reading another notification query hook to understand TanStack Query setup → use `05_server_state.md`
- Reading another provider to understand context shell → use `23_providers.md`

### Skill selection

- Primary skill: none — pure implementation from this plan spec
- Excluded alternatives: none

---

## Implementation plan

### Step 1 — Push API layer in `packages/notifications`

Create 4 new files. Do not modify `src/index.ts` yet (Step 3 handles that).

---

#### File 1a: `packages/notifications/src/api/push/push-keys.ts` (NEW)

```ts
export const pushKeys = {
  vapidPublicKey: ["notifications", "vapid-public-key"] as const,
};
```

---

#### File 1b: `packages/notifications/src/api/push/fetch-vapid-public-key.ts` (NEW)

```ts
import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

const VapidPublicKeyResponseSchema = ApiEnvelopeSchema(
  z.object({ public_key: z.string() }),
).extend({ ok: z.literal(true) });

export async function fetchVapidPublicKey(): Promise<string> {
  const response = await apiClient.get(
    "/api/v1/notifications/vapid-public-key",
    VapidPublicKeyResponseSchema,
  );
  return response.data.public_key;
}
```

---

#### File 1c: `packages/notifications/src/api/push/register-push-subscription.ts` (NEW)

```ts
import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

const RegisterPushSubscriptionResponseSchema = ApiEnvelopeSchema(
  z.object({ subscription: z.object({ client_id: z.string() }) }),
).extend({ ok: z.literal(true) });

export type RegisterPushSubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
  device_label?: string;
};

export async function registerPushSubscription(
  input: RegisterPushSubscriptionInput,
): Promise<string> {
  const response = await apiClient.post(
    "/api/v1/notifications/push-subscription",
    RegisterPushSubscriptionResponseSchema,
    input,
  );
  return response.data.subscription.client_id;
}
```

---

#### File 1d: `packages/notifications/src/api/push/unregister-push-subscription.ts` (NEW)

```ts
import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

const UnregisterPushSubscriptionResponseSchema = ApiEnvelopeSchema(
  z.object({}),
).extend({ ok: z.literal(true) });

export type UnregisterPushSubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export async function unregisterPushSubscription(
  input: UnregisterPushSubscriptionInput,
): Promise<void> {
  await apiClient.delete(
    "/api/v1/notifications/push-subscription",
    UnregisterPushSubscriptionResponseSchema,
    input,
  );
}
```

---

### Step 2 — Push utilities in `packages/notifications`

Create 3 new files. These are plain TypeScript utilities — no React.

---

#### File 2a: `packages/notifications/src/push/push-crypto.ts` (NEW)

Converts between the formats that `PushManager.subscribe()` needs and the base64url strings the backend expects.

```ts
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

export function arrayBufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
```

---

#### File 2b: `packages/notifications/src/push/push-support.ts` (NEW)

Feature detection and iOS standalone check. Uses only browser globals — no React.

```ts
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

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}
```

---

#### File 2c: `packages/notifications/src/push/push-payload-types.ts` (NEW)

TypeScript types for the push payload data shape received by the service worker. These types are exported so each app's `sw.ts` can import them.

```ts
export type PushPayloadData = {
  notification_client_id: string;
  entity_type: string;
  entity_client_id: string;
};

export type PushPayload = {
  title: string;
  body: string;
  data: PushPayloadData;
};
```

---

### Step 3 — Push lifecycle hooks + index exports in `packages/notifications`

Create 2 new files and modify `src/index.ts`.

---

#### File 3a: `packages/notifications/src/push/use-push-subscription.ts` (NEW)

This hook:
- Detects support and current permission state on mount
- If permission is already `"granted"`, automatically reconciles: gets the existing `PushSubscription`, fetches the VAPID public key, and registers the subscription idempotently with the backend
- Exposes `enable()` to request permission + subscribe + register (explicit user action)
- Exposes `disable()` to unsubscribe from the browser + call the backend DELETE
- Exposes `status` of type `PushSubscriptionStatus`

```ts
import { useState, useEffect, useCallback } from "react";
import { fetchVapidPublicKey } from "../api/push/fetch-vapid-public-key";
import { registerPushSubscription } from "../api/push/register-push-subscription";
import { unregisterPushSubscription } from "../api/push/unregister-push-subscription";
import { urlBase64ToUint8Array, arrayBufferToBase64url } from "./push-crypto";
import { isPushSupported, isIosOutsideStandalone, getNotificationPermission } from "./push-support";

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

async function buildRegistrationInput(sub: PushSubscription) {
  const p256dhKey = sub.getKey("p256dh");
  const authKey = sub.getKey("auth");
  if (!p256dhKey || !authKey) throw new Error("Missing PushSubscription keys");
  return {
    endpoint: sub.endpoint,
    p256dh: arrayBufferToBase64url(p256dhKey),
    auth: arrayBufferToBase64url(authKey),
    device_label: navigator.userAgent.slice(0, 200),
  };
}

export function usePushSubscription(): UsePushSubscriptionResult {
  const [status, setStatus] = useState<PushSubscriptionStatus>(() => {
    if (!isPushSupported()) return "unsupported";
    if (isIosOutsideStandalone()) return "needs_ios_pwa";
    const permission = getNotificationPermission();
    if (permission === "unsupported") return "unsupported";
    if (permission === "denied") return "denied";
    if (permission === "default") return "not_requested";
    return "registering"; // granted — will reconcile in effect
  });
  const [isLoading, setIsLoading] = useState(false);

  // Startup reconciliation: if permission already granted, register idempotently
  useEffect(() => {
    if (status !== "registering") return;

    let cancelled = false;

    async function reconcile() {
      setIsLoading(true);
      try {
        const reg = await getSwRegistration();
        if (!reg || cancelled) return;
        const existing = await reg.pushManager.getSubscription();
        if (!existing || cancelled) {
          if (!cancelled) setStatus("unregistered");
          return;
        }
        const vapidPublicKey = await fetchVapidPublicKey();
        if (cancelled) return;
        const input = await buildRegistrationInput(existing);
        // Re-subscribe with applicationServerKey to ensure key matches current VAPID key
        // The existing subscription may have been created with a different key
        // For safety: just register the existing subscription — idempotent POST is safe
        await registerPushSubscription(input);
        if (!cancelled) setStatus("registered");
      } catch {
        if (!cancelled) setStatus("error");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void reconcile();
    return () => { cancelled = true; };
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
      const input = await buildRegistrationInput(sub);
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
      if (!reg) { setStatus("unregistered"); return; }
      const sub = await reg.pushManager.getSubscription();
      if (!sub) { setStatus("unregistered"); return; }
      const input = await buildRegistrationInput(sub);
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
```

---

#### File 3b: `packages/notifications/src/push/unregister-current-device-push.ts` (NEW)

Plain async utility — no React — used by `@beyo/auth`'s `useSignOutMutation`. Handles the full flow: get SW registration, get subscription, unsubscribe browser, call backend DELETE. Swallows all errors because sign-out must not fail due to push cleanup failure.

```ts
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
    // Sign-out must not block on push cleanup failure
  }
}
```

---

#### File 3c: `packages/notifications/src/index.ts` (MODIFY)

Append the following exports to the existing `src/index.ts`. Do not remove any existing exports.

```ts
// Push subscription API
export { pushKeys } from "./api/push/push-keys";
export { fetchVapidPublicKey } from "./api/push/fetch-vapid-public-key";
export { registerPushSubscription } from "./api/push/register-push-subscription";
export { unregisterPushSubscription } from "./api/push/unregister-push-subscription";
export type { RegisterPushSubscriptionInput } from "./api/push/register-push-subscription";
export type { UnregisterPushSubscriptionInput } from "./api/push/unregister-push-subscription";

// Push utilities
export { urlBase64ToUint8Array, arrayBufferToBase64url } from "./push/push-crypto";
export { isPushSupported, isIosOutsideStandalone, getNotificationPermission } from "./push/push-support";
export type { PushPayload, PushPayloadData } from "./push/push-payload-types";

// Push lifecycle hooks
export { usePushSubscription } from "./push/use-push-subscription";
export type { PushSubscriptionStatus, UsePushSubscriptionResult } from "./push/use-push-subscription";
export { unregisterCurrentDevicePush } from "./push/unregister-current-device-push";
```

---

### Step 4 — Auth sign-out push cleanup in `packages/auth`

#### File 4: `packages/auth/src/api/use-sign-out.ts` (MODIFY)

Import `unregisterCurrentDevicePush` from `@beyo/notifications` and call it at the start of `signOut()` before the logout API call. The call is awaited but any error is already swallowed inside `unregisterCurrentDevicePush`. Keep all existing logic unchanged.

Full file after modification:

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient, setAccessToken } from "@beyo/api-client";
import { resetNotificationToastTracking, unregisterCurrentDevicePush } from "@beyo/notifications";
import { useAuthStore } from "../store/auth.store";
import { ApiEnvelopeSchema } from "@beyo/lib";

const SignOutResponseSchema = ApiEnvelopeSchema(z.object({}));

async function signOut() {
  await unregisterCurrentDevicePush();
  await apiClient.post("/api/v1/auth/logout", SignOutResponseSchema, {});
  setAccessToken(null);
  resetNotificationToastTracking();
  useAuthStore.getState().clearAuth();
}

type SignOutOptions = {
  onSignedOut?: () => void;
};

export function useSignOutMutation(options?: SignOutOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: signOut,
    onSettled: () => {
      queryClient.clear();
      options?.onSignedOut?.();
    },
  });
}
```

---

### Step 5 — Workers app: service worker + vite config + mount + settings

Path prefix: `apps/workers-app/ManagerBeyo-app-workers`

---

#### File 5a: `apps/workers-app/ManagerBeyo-app-workers/src/sw.ts` (NEW)

Custom service worker for the workers app. Uses Workbox precaching via `injectManifest` and adds push + notificationclick handlers. App-specific route mapping: tasks and task_step → `/tasks`; everything else → `/`.

```ts
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { clientsClaim } from "workbox-core";
import type { PushPayload } from "@beyo/notifications";

declare const self: ServiceWorkerGlobalScope;

clientsClaim();
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

function resolveRoute(entityType: string | undefined): string {
  switch (entityType) {
    case "task":
    case "task_step":
      return "/tasks";
    default:
      return "/";
  }
}

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      if (clients.some((c) => c.focused)) return;

      let payload: PushPayload | null = null;
      try {
        payload = event.data?.json() as PushPayload;
      } catch {
        payload = null;
      }

      const title = payload?.title ?? "Beyo";
      const body = payload?.body ?? "";
      const data = payload?.data ?? {};
      const tag = data.notification_client_id
        ? `notification:${data.notification_client_id}`
        : "notification:unknown";

      await self.registration.showNotification(title, {
        body,
        data,
        tag,
        icon: "/pwa-192x192.png",
        badge: "/pwa-96x96.png",
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data as PushPayload["data"] | null;
  const route = resolveRoute(data?.entity_type);

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const scope = self.registration.scope;
      const existing = clients.find((c) => c.url.startsWith(scope));
      if (existing) {
        await existing.focus();
        await existing.navigate(route);
        return;
      }
      await self.clients.openWindow(route);
    })(),
  );
});
```

> **Note on importing `@beyo/notifications` types in the SW**: `PushPayload` is a plain TypeScript type (not a runtime import). TypeScript `import type` is safe in service workers because it is erased at compile time. If the build configuration does not support package imports in the SW context, replace the import with an inline local type definition matching the same shape.

---

#### File 5b: `apps/workers-app/ManagerBeyo-app-workers/vite.config.ts` (MODIFY)

Switch from `generateSW` (default) to `injectManifest`. Move the glob pattern into `injectManifestConfig`. Remove `workbox` key (Workbox runtime config is now in `src/sw.ts`). Keep all other options unchanged (`registerType`, `injectRegister`, `includeAssets`, `manifest`).

```ts
import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    tailwindcss() as PluginOption,
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "prompt",
      injectRegister: "auto",
      includeAssets: [
        "favicon.svg",
        "apple-touch-icon.png",
        "pwa-48x48.png",
        "pwa-72x72.png",
        "pwa-96x96.png",
        "pwa-144x144.png",
        "pwa-192x192.png",
        "pwa-512x512.png",
      ],
      manifest: {
        name: "Worker Beyo",
        short_name: "WorkerBeyo",
        description: "Beyo workspace worker",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "pwa-48x48.png", sizes: "48x48", type: "image/png" },
          { src: "pwa-72x72.png", sizes: "72x72", type: "image/png" },
          { src: "pwa-96x96.png", sizes: "96x96", type: "image/png" },
          { src: "pwa-144x144.png", sizes: "144x144", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      injectManifestConfig: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      },
    }),
  ] as PluginOption[],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

---

#### File 5c: `apps/workers-app/ManagerBeyo-app-workers/src/app/PushMount.tsx` (NEW)

Renders null. Calls `usePushSubscription` purely for the startup reconciliation side-effect. The hook reconciles the browser push subscription with the backend after authentication without requiring any user action.

```tsx
import { usePushSubscription } from "@beyo/notifications";

export function PushMount(): null {
  usePushSubscription();
  return null;
}
```

---

#### File 5d: `apps/workers-app/ManagerBeyo-app-workers/src/app/RootRoute.tsx` (MODIFY)

Add `import { PushMount } from "@/app/PushMount";` and render `<PushMount />` directly after `<NotificationRealtimeMount />` inside `<AuthProvider>`. Both are null-rendering mounts that run effects after authentication.

```tsx
import { Outlet } from "react-router-dom";
import { PwaProvider, type PwaSurfaceOpeners } from "@beyo/pwa";
import { RealtimeProvider } from "@beyo/realtime";
import { AuthProvider } from "@/features/auth";
import { NotificationRealtimeMount } from "@/app/NotificationRealtimeMount";
import { PushMount } from "@/app/PushMount";
import { socketRegistry } from "@/app/socket-registry";
import {
  PWA_INSTALL_SURFACE_ID,
  PWA_UPDATE_SURFACE_ID,
} from "@/features/pwa/surfaces";
import { SurfaceProvider, useSurfaceStore } from "@/providers/SurfaceProvider";

const pwaSurfaceOpeners: PwaSurfaceOpeners = {
  openUpdatePrompt: (props) =>
    useSurfaceStore.getState().open(PWA_UPDATE_SURFACE_ID, props),
  openInstallPrompt: (props) =>
    useSurfaceStore.getState().open(PWA_INSTALL_SURFACE_ID, props),
  closeInstallPrompt: () =>
    useSurfaceStore.getState().close(PWA_INSTALL_SURFACE_ID),
};

export function RootRoute(): React.JSX.Element {
  return (
    <RealtimeProvider registry={socketRegistry}>
      <SurfaceProvider>
        <PwaProvider surfaceOpeners={pwaSurfaceOpeners}>
          <AuthProvider>
            <NotificationRealtimeMount />
            <PushMount />
            <Outlet />
          </AuthProvider>
        </PwaProvider>
      </SurfaceProvider>
    </RealtimeProvider>
  );
}
```

---

#### File 5e: `apps/workers-app/ManagerBeyo-app-workers/src/features/settings/types.ts` (MODIFY)

Extend `SettingsState` to include push notification fields.

```ts
import type { PushSubscriptionStatus } from "@beyo/notifications";

export type SettingsState = {
  signOut: () => void;
  isSigningOut: boolean;
  pushStatus: PushSubscriptionStatus;
  isPushLoading: boolean;
  enablePush: () => Promise<void>;
  disablePush: () => Promise<void>;
};
```

---

#### File 5f: `apps/workers-app/ManagerBeyo-app-workers/src/features/settings/controllers/use-settings-view.controller.ts` (MODIFY)

Add `usePushSubscription` and expose push fields in the return value.

```ts
import { useNavigate } from "react-router-dom";
import { useSignOutMutation } from "@/features/auth";
import { usePushSubscription } from "@beyo/notifications";
import { ROUTES } from "@/lib/routes";
import type { SettingsState } from "../types";

export type SettingsViewController = SettingsState;

export function useSettingsViewController(): SettingsViewController {
  const navigate = useNavigate();
  const { mutate: signOutMutate, isPending } = useSignOutMutation();
  const { status: pushStatus, enable: enablePush, disable: disablePush, isLoading: isPushLoading } = usePushSubscription();

  function signOut() {
    signOutMutate(undefined, {
      onSuccess: () => navigate(ROUTES.signIn, { replace: true }),
    });
  }

  return {
    signOut,
    isSigningOut: isPending,
    pushStatus,
    isPushLoading,
    enablePush,
    disablePush,
  };
}
```

---

#### File 5g: `apps/workers-app/ManagerBeyo-app-workers/src/features/settings/components/SettingsView.tsx` (MODIFY)

Add a Notifications section above the sign-out button. The UI shows the current push status and an enable/disable button. The button is disabled during loading. iOS-outside-standalone shows a message instead of a button.

```tsx
import { useEffect, useRef } from "react";
import { Bell, BellOff, LogOut } from "lucide-react";

import { useRegisterScrollElement } from "@/providers/AppScrollElementProvider";
import { useSettingsViewContext } from "../providers/SettingsViewProvider";

function pushStatusLabel(
  status: ReturnType<typeof useSettingsViewContext>["pushStatus"],
): string {
  switch (status) {
    case "registered":
      return "Notifications enabled";
    case "not_requested":
    case "unregistered":
      return "Notifications disabled";
    case "denied":
      return "Notifications blocked — enable in browser settings";
    case "needs_ios_pwa":
      return "Add to Home Screen to enable notifications";
    case "unsupported":
      return "Notifications not supported in this browser";
    case "registering":
      return "Setting up notifications…";
    case "error":
      return "Notification setup failed — try again";
    default:
      return "";
  }
}

export function SettingsView(): React.JSX.Element {
  const {
    signOut,
    isSigningOut,
    pushStatus,
    isPushLoading,
    enablePush,
    disablePush,
  } = useSettingsViewContext();

  const scrollRef = useRef<HTMLDivElement>(null);
  const registerScrollElement = useRegisterScrollElement();

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    return registerScrollElement(el);
  }, [registerScrollElement]);

  const canToggle =
    pushStatus !== "unsupported" &&
    pushStatus !== "needs_ios_pwa" &&
    pushStatus !== "denied" &&
    pushStatus !== "registering";

  const isEnabled = pushStatus === "registered";

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto overscroll-y-none">
      <div className="flex flex-col gap-4 p-6">
        <h1 className="text-2xl font-bold">Settings</h1>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Notifications
          </h2>
          <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-3">
              {isEnabled ? (
                <Bell aria-hidden="true" className="size-4 shrink-0 text-primary" />
              ) : (
                <BellOff aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span className="text-sm">{pushStatusLabel(pushStatus)}</span>
            </div>
            {canToggle && (
              <button
                type="button"
                className="text-sm font-medium text-primary disabled:opacity-50"
                disabled={isPushLoading}
                onClick={isEnabled ? disablePush : enablePush}
                data-testid="settings-push-toggle-button"
              >
                {isEnabled ? "Disable" : "Enable"}
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
          className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm text-destructive disabled:opacity-60"
          data-testid="settings-sign-out-button"
          disabled={isSigningOut}
          onClick={signOut}
        >
          <LogOut aria-hidden="true" className="size-4 shrink-0" />
          {isSigningOut ? "Signing out..." : "Log out"}
        </button>
        <div className="h-[1000px] w-full bg-black"></div>
      </div>
    </div>
  );
}
```

---

### Step 6 — Managers app: service worker + vite config + mount + settings

Path prefix: `apps/managers-app/ManagerBeyo-app-managers`

---

#### File 6a: `apps/managers-app/ManagerBeyo-app-managers/src/sw.ts` (NEW)

Same structure as the workers SW. Route mapping differs: `upholstery` → `/upholstery-inventory`, tasks/steps → `/tasks`, default → `/`.

```ts
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { clientsClaim } from "workbox-core";
import type { PushPayload } from "@beyo/notifications";

declare const self: ServiceWorkerGlobalScope;

clientsClaim();
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

function resolveRoute(entityType: string | undefined): string {
  switch (entityType) {
    case "task":
    case "task_step":
      return "/tasks";
    case "upholstery":
      return "/upholstery-inventory";
    default:
      return "/";
  }
}

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      if (clients.some((c) => c.focused)) return;

      let payload: PushPayload | null = null;
      try {
        payload = event.data?.json() as PushPayload;
      } catch {
        payload = null;
      }

      const title = payload?.title ?? "Beyo";
      const body = payload?.body ?? "";
      const data = payload?.data ?? {};
      const tag = data.notification_client_id
        ? `notification:${data.notification_client_id}`
        : "notification:unknown";

      await self.registration.showNotification(title, {
        body,
        data,
        tag,
        icon: "/pwa-192x192.png",
        badge: "/pwa-96x96.png",
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data as PushPayload["data"] | null;
  const route = resolveRoute(data?.entity_type);

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const scope = self.registration.scope;
      const existing = clients.find((c) => c.url.startsWith(scope));
      if (existing) {
        await existing.focus();
        await existing.navigate(route);
        return;
      }
      await self.clients.openWindow(route);
    })(),
  );
});
```

---

#### File 6b: `apps/managers-app/ManagerBeyo-app-managers/vite.config.ts` (MODIFY)

Same transformation as workers app. Switch to `injectManifest`, add `srcDir: "src"`, `filename: "sw.ts"`, move glob to `injectManifestConfig`. Preserve all existing options (`svgr`, proxy, `loadEnv`).

```ts
import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import svgr from "vite-plugin-svgr";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");

  return {
    plugins: [
      svgr(),
      react(),
      tailwindcss(),
      VitePWA({
        strategies: "injectManifest",
        srcDir: "src",
        filename: "sw.ts",
        registerType: "prompt",
        injectRegister: "auto",
        includeAssets: [
          "favicon.svg",
          "apple-touch-icon.png",
          "pwa-48x48.png",
          "pwa-72x72.png",
          "pwa-96x96.png",
          "pwa-144x144.png",
          "pwa-192x192.png",
          "pwa-512x512.png",
        ],
        manifest: {
          name: "Manager Beyo",
          short_name: "ManagerBeyo",
          description: "Beyo workspace manager",
          theme_color: "#ffffff",
          background_color: "#ffffff",
          display: "standalone",
          start_url: "/",
          icons: [
            { src: "pwa-48x48.png", sizes: "48x48", type: "image/png" },
            { src: "pwa-72x72.png", sizes: "72x72", type: "image/png" },
            { src: "pwa-96x96.png", sizes: "96x96", type: "image/png" },
            { src: "pwa-144x144.png", sizes: "144x144", type: "image/png" },
            { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
            {
              src: "pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable",
            },
          ],
        },
        injectManifestConfig: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        },
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      allowedHosts: ["f949-155-4-95-121.ngrok-free.app"],
      proxy: env.API_TARGET_URL
        ? {
            "/api": {
              target: env.API_TARGET_URL,
              changeOrigin: true,
            },
            "/socket.io": {
              target: env.API_TARGET_URL,
              changeOrigin: true,
              ws: true,
            },
          }
        : undefined,
    },
  };
});
```

---

#### File 6c: `apps/managers-app/ManagerBeyo-app-managers/src/app/PushMount.tsx` (NEW)

```tsx
import { usePushSubscription } from "@beyo/notifications";

export function PushMount(): null {
  usePushSubscription();
  return null;
}
```

---

#### File 6d: `apps/managers-app/ManagerBeyo-app-managers/src/app/RootRoute.tsx` (MODIFY)

Add `import { PushMount } from "@/app/PushMount";` and render `<PushMount />` after `<NotificationRealtimeMount />` inside `<AuthProvider>`.

```tsx
import { Outlet } from "react-router-dom";
import { PwaProvider, type PwaSurfaceOpeners } from "@beyo/pwa";
import { RealtimeProvider } from "@beyo/realtime";
import { AuthProvider } from "@beyo/auth";
import { NotificationRealtimeMount } from "@/app/NotificationRealtimeMount";
import { PushMount } from "@/app/PushMount";
import { socketRegistry } from "@/app/socket-registry";
import {
  PWA_INSTALL_SURFACE_ID,
  PWA_UPDATE_SURFACE_ID,
} from "@/features/pwa/surfaces";
import { ROUTES } from "@/lib/routes";
import { SurfaceProvider, useSurfaceStore } from "@/providers/SurfaceProvider";

const pwaSurfaceOpeners: PwaSurfaceOpeners = {
  openUpdatePrompt: (props) =>
    useSurfaceStore.getState().open(PWA_UPDATE_SURFACE_ID, props),
  openInstallPrompt: (props) =>
    useSurfaceStore.getState().open(PWA_INSTALL_SURFACE_ID, props),
  closeInstallPrompt: () =>
    useSurfaceStore.getState().close(PWA_INSTALL_SURFACE_ID),
};

export function RootRoute(): React.JSX.Element {
  return (
    <RealtimeProvider registry={socketRegistry}>
      <SurfaceProvider>
        <PwaProvider surfaceOpeners={pwaSurfaceOpeners}>
          <AuthProvider appScope="manager" signInRoute={ROUTES.signIn}>
            <NotificationRealtimeMount />
            <PushMount />
            <Outlet />
          </AuthProvider>
        </PwaProvider>
      </SurfaceProvider>
    </RealtimeProvider>
  );
}
```

---

#### File 6e: `apps/managers-app/ManagerBeyo-app-managers/src/features/settings/types.ts` (MODIFY)

```ts
import type { PushSubscriptionStatus } from "@beyo/notifications";

export type SettingsState = {
  signOut: () => void;
  isSigningOut: boolean;
  pushStatus: PushSubscriptionStatus;
  isPushLoading: boolean;
  enablePush: () => Promise<void>;
  disablePush: () => Promise<void>;
};
```

---

#### File 6f: `apps/managers-app/ManagerBeyo-app-managers/src/features/settings/controllers/use-settings-view.controller.ts` (MODIFY)

```ts
import { useNavigate } from "react-router-dom";
import { useSignOutMutation } from "@beyo/auth";
import { usePushSubscription } from "@beyo/notifications";
import { ROUTES } from "@/lib/routes";
import type { SettingsState } from "../types";

export type SettingsViewController = SettingsState;

export function useSettingsViewController(): SettingsViewController {
  const navigate = useNavigate();
  const { mutate: signOutMutate, isPending } = useSignOutMutation();
  const { status: pushStatus, enable: enablePush, disable: disablePush, isLoading: isPushLoading } = usePushSubscription();

  function signOut() {
    signOutMutate(undefined, {
      onSuccess: () => navigate(ROUTES.signIn, { replace: true }),
    });
  }

  return {
    signOut,
    isSigningOut: isPending,
    pushStatus,
    isPushLoading,
    enablePush,
    disablePush,
  };
}
```

---

#### File 6g: `apps/managers-app/ManagerBeyo-app-managers/src/features/settings/components/SettingsView.tsx` (MODIFY)

```tsx
import { Bell, BellOff, LogOut } from 'lucide-react';
import { useSettingsViewContext } from '../providers/SettingsViewProvider';
import type { PushSubscriptionStatus } from "@beyo/notifications";

function pushStatusLabel(status: PushSubscriptionStatus): string {
  switch (status) {
    case "registered":
      return "Notifications enabled";
    case "not_requested":
    case "unregistered":
      return "Notifications disabled";
    case "denied":
      return "Notifications blocked — enable in browser settings";
    case "needs_ios_pwa":
      return "Add to Home Screen to enable notifications";
    case "unsupported":
      return "Notifications not supported in this browser";
    case "registering":
      return "Setting up notifications…";
    case "error":
      return "Notification setup failed — try again";
    default:
      return "";
  }
}

export function SettingsView(): React.JSX.Element {
  const {
    signOut,
    isSigningOut,
    pushStatus,
    isPushLoading,
    enablePush,
    disablePush,
  } = useSettingsViewContext();

  const canToggle =
    pushStatus !== "unsupported" &&
    pushStatus !== "needs_ios_pwa" &&
    pushStatus !== "denied" &&
    pushStatus !== "registering";

  const isEnabled = pushStatus === "registered";

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Notifications
        </h2>
        <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
          <div className="flex items-center gap-3">
            {isEnabled ? (
              <Bell aria-hidden="true" className="size-4 shrink-0 text-primary" />
            ) : (
              <BellOff aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            )}
            <span className="text-sm">{pushStatusLabel(pushStatus)}</span>
          </div>
          {canToggle && (
            <button
              type="button"
              className="text-sm font-medium text-primary disabled:opacity-50"
              disabled={isPushLoading}
              onClick={isEnabled ? disablePush : enablePush}
              data-testid="settings-push-toggle-button"
            >
              {isEnabled ? 'Disable' : 'Enable'}
            </button>
          )}
        </div>
      </div>

      <button
        type="button"
        className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm text-destructive disabled:opacity-60"
        data-testid="settings-sign-out-button"
        disabled={isSigningOut}
        onClick={signOut}
      >
        <LogOut aria-hidden="true" className="size-4 shrink-0" />
        {isSigningOut ? 'Signing out…' : 'Log out'}
      </button>
    </div>
  );
}
```

---

## File summary

### `packages/notifications` — 9 new files, 1 modified

| File | Action |
|---|---|
| `src/api/push/push-keys.ts` | NEW |
| `src/api/push/fetch-vapid-public-key.ts` | NEW |
| `src/api/push/register-push-subscription.ts` | NEW |
| `src/api/push/unregister-push-subscription.ts` | NEW |
| `src/push/push-crypto.ts` | NEW |
| `src/push/push-support.ts` | NEW |
| `src/push/push-payload-types.ts` | NEW |
| `src/push/use-push-subscription.ts` | NEW |
| `src/push/unregister-current-device-push.ts` | NEW |
| `src/index.ts` | MODIFY — append new exports |

### `packages/auth` — 1 modified

| File | Action |
|---|---|
| `src/api/use-sign-out.ts` | MODIFY — call `unregisterCurrentDevicePush` at top of `signOut()` |

### Workers app — 2 new, 5 modified

| File | Action |
|---|---|
| `src/sw.ts` | NEW |
| `src/app/PushMount.tsx` | NEW |
| `vite.config.ts` | MODIFY — switch to `injectManifest` |
| `src/app/RootRoute.tsx` | MODIFY — add `<PushMount />` |
| `src/features/settings/types.ts` | MODIFY — add push fields |
| `src/features/settings/controllers/use-settings-view.controller.ts` | MODIFY — add push fields |
| `src/features/settings/components/SettingsView.tsx` | MODIFY — add push UI |

### Managers app — 2 new, 5 modified

| File | Action |
|---|---|
| `src/sw.ts` | NEW |
| `src/app/PushMount.tsx` | NEW |
| `vite.config.ts` | MODIFY — switch to `injectManifest` |
| `src/app/RootRoute.tsx` | MODIFY — add `<PushMount />` |
| `src/features/settings/types.ts` | MODIFY — add push fields |
| `src/features/settings/controllers/use-settings-view.controller.ts` | MODIFY — add push fields |
| `src/features/settings/components/SettingsView.tsx` | MODIFY — add push UI |

**Total: 13 new files, 12 modified files**

---

## Known implementation nuances

### `injectManifest` and TypeScript SW compilation

`vite-plugin-pwa` compiles the `sw.ts` entry using a secondary Vite instance. The `@beyo/notifications` import of `PushPayload` is a TypeScript `import type` — it is erased at compile time and does not produce a runtime import. If the secondary Vite build cannot resolve monorepo packages, replace the import with an inline local type:

```ts
// Replace:
import type { PushPayload } from "@beyo/notifications";

// With:
type PushPayload = {
  title: string;
  body: string;
  data: { notification_client_id: string; entity_type: string; entity_client_id: string };
};
```

Keep both options in mind during build validation.

### `workbox-precaching` and `workbox-core` in the SW

These are Workbox packages. Both must be resolvable from the app. They are already indirectly used by the current `generateSW` strategy. If they are not in `package.json`, add `workbox-precaching` and `workbox-core` as dependencies in each app's `package.json`.

### `use-push-subscription` initialization race

The hook initializes `status` synchronously. If `Notification.permission === "granted"` on mount, `status` is set to `"registering"` immediately, which triggers the reconciliation `useEffect`. The `useEffect` has a cleanup that sets `cancelled = true` if the component unmounts before reconciliation completes. This prevents state updates on unmounted components.

### Sign-out mutation and push cleanup ordering

`unregisterCurrentDevicePush` is awaited before the logout API call. This means if the browser push subscription exists, the function completes before the token is cleared — ensuring the DELETE backend call succeeds with a valid auth token. All errors are swallowed; sign-out continues regardless.

### iOS permission handling

On iOS Safari outside standalone mode, `isPushSupported()` returns `true` (iOS 16.4+ supports push in PWAs) but `isIosOutsideStandalone()` also returns `true`. The hook initializes to `"needs_ios_pwa"` status and neither the reconciliation effect nor `enable()` attempts to subscribe. This prevents confusing browser prompts in regular Safari tabs where push would fail silently.

---

## Risks and mitigations

- Risk: The secondary Vite build for the SW cannot resolve `@beyo/notifications` package imports at runtime.
  Mitigation: Use `import type` (erased at compile time) for type imports only. No runtime package imports in SW files.

- Risk: `workbox-precaching` or `workbox-core` not installed in app `package.json`.
  Mitigation: Check after switching to `injectManifest`; add as dev/runtime dependencies if missing.

- Risk: `clientsClaim()` causes the new SW to take control of open tabs immediately after update, causing unexpected refreshes.
  Mitigation: `clientsClaim` is already present in the current `generateSW` config (`clientsClaim: true`). Behavior is unchanged.

- Risk: `Notification.requestPermission()` called outside a user gesture on some browsers (Chrome 94+).
  Mitigation: `enable()` is only called on button click in the settings view — always inside a user gesture.

---

## Validation plan

- `npm run typecheck` in both apps and in `packages/notifications` and `packages/auth`: zero TypeScript errors
- Build both apps with `npm run build` and confirm `dist/sw.js` is generated with the push event handler
- Manual validation in Chromium desktop (backgrounded tab):
  1. Sign in → navigate to Settings → confirm push status shows "Notifications disabled"
  2. Tap "Enable" → browser permission prompt appears → accept → status changes to "Notifications enabled"
  3. Background the tab → trigger a task state change from another user → confirm OS notification appears
  4. Click OS notification → tab focuses, route changes to `/tasks`
  5. Foreground the tab → trigger another event → confirm no OS notification appears (socket handled it)
  6. Tap "Disable" in settings → OS notifications stop
  7. Sign out → sign back in → confirm push status is "Notifications disabled" (subscription was removed)
- Manual validation on Android Chrome PWA (installed):
  - Same steps as above from a PWA icon
  - Fully close app → trigger notification → confirm it arrives
- Manual validation on iPhone (Safari, Add to Home Screen):
  - Status should show "Add to Home Screen to enable notifications" in regular Safari tab
  - After installing → open from home screen → "Enable" button works → OS notification received

## Review log

- `2026-06-19T14:43:47Z` — Codex implemented the frontend VAPID push notification pipeline, ran `npm run typecheck` successfully, wrote summary and archive records, and prepared the plan for archival.

## Lifecycle transition

- Current state: `archived`
- Next state: `n/a`
- Transition owner: `Codex`
