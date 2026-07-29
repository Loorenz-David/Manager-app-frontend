import { defineConfig } from "vitest/config";

export default defineConfig({
  define: {
    "import.meta.env.VITE_API_URL": JSON.stringify("http://localhost"),
  },
  test: {
    environment: "jsdom",
    setupFiles: ["packages/worker-shifts/src/test/setup.ts"],
    include: [
      "packages/worker-shifts/src/**/*.test.ts",
      "packages/worker-shifts/src/**/*.test.tsx",
    ],
  },
});
