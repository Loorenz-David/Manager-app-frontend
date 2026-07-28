import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  define: {
    "import.meta.env.VITE_API_URL": JSON.stringify("http://localhost"),
  },
  test: {
    environment: "jsdom",
    setupFiles: ["packages/task-working-sections/vitest.setup.ts"],
    include: [
      "packages/task-working-sections/src/**/*.test.ts",
      "packages/task-working-sections/src/**/*.test.tsx",
    ],
    css: true,
  },
});
