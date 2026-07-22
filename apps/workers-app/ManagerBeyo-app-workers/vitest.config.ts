import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: [path.resolve(__dirname, "src/test/setup.ts")],
    include: [
      path.resolve(__dirname, "src/features/task_steps/**/*.test.ts"),
      path.resolve(__dirname, "src/pages/**/*.test.tsx"),
      path.resolve(__dirname, "src/app/**/*.test.ts"),
    ],
  },
});
