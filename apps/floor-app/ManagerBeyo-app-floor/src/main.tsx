import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "@/app/App";
import "@/index.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing #root application mount.");
}
const appRoot = root;

async function startApp(): Promise<void> {
  // Playwright test mode uses route-level mocks but shares the same showcase
  // adapters. Development mode starts the full MSW backend fixture.
  if (
    import.meta.env.VITE_FLOOR_MOCKS === "1" &&
    import.meta.env.MODE !== "test"
  ) {
    const { startFloorMockWorker } = await import("@/mocks/browser");
    await startFloorMockWorker();
  }

  createRoot(appRoot).render(
    <StrictMode>
      <div className="h-full bg-kiosk-canvas" vaul-drawer-wrapper="">
        <App />
      </div>
    </StrictMode>,
  );
}

void startApp();
