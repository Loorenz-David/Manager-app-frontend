import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "@/app/App";
import "@/index.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing #root application mount.");
}

createRoot(root).render(
  <StrictMode>
    <div className="h-full bg-kiosk-canvas" vaul-drawer-wrapper="">
      <App />
    </div>
  </StrictMode>,
);
