/// <reference lib="webworker" />

import { clientsClaim } from "workbox-core";
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import type { PushPayload } from "@beyo/notifications";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Parameters<typeof precacheAndRoute>[0];
};

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
  const route = resolveRoute(data?.entity_type);

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
