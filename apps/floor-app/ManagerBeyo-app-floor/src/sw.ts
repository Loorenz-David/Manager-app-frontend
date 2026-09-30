/// <reference lib="WebWorker" />

import { clientsClaim } from "workbox-core";
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Parameters<typeof precacheAndRoute>[0];
};

// An always-open kiosk never navigates away, so a new worker left "waiting"
// would never activate. Activate at once and take over the open page; the page
// itself reloads onto the new bundle at a safe moment
// (src/lib/sw-update/register-floor-service-worker.ts).
self.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
