import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    "import.meta.env.VITE_API_URL": JSON.stringify("http://localhost:3000"),
  },
  test: {
    environment: "jsdom",
    include: [
      "packages/presentation-builder/src/**/*.test.ts",
      "packages/presentation-builder/src/**/*.test.tsx",
    ],
    setupFiles: ["packages/presentation-builder/src/test/setup.ts"],
  },
});
