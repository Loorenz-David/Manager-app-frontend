/// <reference lib="webworker" />

import { clientsClaim } from "workbox-core";
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import type { PushPayload } from "@beyo/notifications";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Parameters<typeof precacheAndRoute>[0];
};

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

clientsClaim();
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

function withParams(pathname: string, params: Record<string, string>): string {
  const search = new URLSearchParams(params);
  return `${pathname}?${search.toString()}`;
}

function resolveRoute(
  entityType: string | null | undefined,
  entityClientId: string | null | undefined,
  notificationClientId: string | null | undefined,
  taskClientId: string | null | undefined,
): string {
  const notificationId = notificationClientId ?? "";

  switch (entityType) {
    case "task":
      return entityClientId
        ? withParams("/tasks", {
            notif_type: "task",
            notif_id: entityClientId,
            notif_cid: notificationId,
          })
        : "/tasks";
    case "task_step":
      return taskClientId
        ? withParams("/tasks", {
            notif_type: "task_step",
            notif_id: taskClientId,
            notif_cid: notificationId,
          })
        : "/tasks";
    case "case":
      return entityClientId
        ? withParams("/cases", {
            notif_type: "case",
            notif_id: entityClientId,
            notif_cid: notificationId,
          })
        : "/cases";
    case "item_upholstery":
    case null:
      return withParams("/upholstery-inventory", {
        notif_type: "upholstery",
        notif_cid: notificationId,
      });
    default:
      return "/";
  }
}

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      if (windowClients.some((client) => client.focused)) return;

      let payload: PushPayload | null = null;
      try {
        payload = event.data?.json() as PushPayload;
      } catch {
        payload = null;
      }

      const title = payload?.title ?? "Beyo";
      const body = payload?.body ?? "";
      const data: Partial<PushPayload["data"]> = payload?.data ?? {};
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

  const data = event.notification.data as PushPayload["data"] | undefined;
  const route = resolveRoute(
    data?.entity_type,
    data?.entity_client_id,
    data?.notification_client_id,
    data?.task_client_id,
  );

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const scope = self.registration.scope;
      const existing = windowClients.find((client) =>
        client.url.startsWith(scope),
      );

      if (existing) {
        await existing.focus();
        await existing.navigate(route);
        return;
      }

      await self.clients.openWindow(route);
    })(),
  );
});
