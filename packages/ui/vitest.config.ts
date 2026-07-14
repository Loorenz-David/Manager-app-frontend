import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["packages/ui/src/**/*.test.ts", "packages/ui/src/**/*.test.tsx"],
    css: true,
  },
});
