import { defineConfig } from "vitest/config";

export default defineConfig({
  define: {
    // @beyo/api-client validates its env on import. The gate never calls the
    // API origin: /system/* always goes to window.location.origin.
    "import.meta.env.VITE_API_URL": JSON.stringify("http://api.test"),
  },
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "jsdom",
    include: [
      "packages/system-control/src/**/*.test.ts",
      "packages/system-control/src/**/*.test.tsx",
    ],
    restoreMocks: true,
  },
});
