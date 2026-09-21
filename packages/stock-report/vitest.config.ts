import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  // `@beyo/tasks` reaches `@beyo/api-client`, which validates its environment
  // at import time. Same shim as `packages/item-economics/vitest.config.ts`.
  define: {
    "import.meta.env.VITE_API_URL": JSON.stringify("http://localhost"),
  },
  test: {
    environment: "jsdom",
    include: [
      "packages/stock-report/src/**/*.test.ts",
      "packages/stock-report/src/**/*.test.tsx",
    ],
    css: true,
  },
});
