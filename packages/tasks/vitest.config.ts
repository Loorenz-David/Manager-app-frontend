import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  define: {
    "import.meta.env.VITE_API_URL": JSON.stringify("http://localhost"),
  },
  test: {
    environment: "jsdom",
    setupFiles: ["packages/tasks/vitest.setup.ts"],
    include: [
      "packages/tasks/src/**/*.test.ts",
      "packages/tasks/src/**/*.test.tsx",
    ],
    css: true,
  },
});
