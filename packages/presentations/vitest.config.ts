import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  define: {
    "import.meta.env.VITE_API_URL": JSON.stringify("http://localhost:3000"),
  },
  test: {
    environment: "jsdom",
    include: [
      "packages/presentations/src/**/*.test.ts",
      "packages/presentations/src/**/*.test.tsx",
    ],
    setupFiles: ["packages/presentations/src/test/setup.ts"],
  },
});

