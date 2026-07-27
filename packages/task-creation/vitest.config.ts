import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    "import.meta.env.VITE_API_URL": JSON.stringify("http://localhost"),
  },
  test: {
    environment: "jsdom",
    setupFiles: "packages/task-creation/src/test/setup.ts",
    include: [
      "packages/task-creation/src/**/*.test.ts",
      "packages/task-creation/src/**/*.test.tsx",
    ],
    css: true,
  },
});
