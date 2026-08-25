import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: [
      "packages/scanner/src/**/*.test.ts",
      "packages/scanner/src/**/*.test.tsx",
    ],
    css: true,
  },
});
