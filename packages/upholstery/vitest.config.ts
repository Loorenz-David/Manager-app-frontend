import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  define: {
    "import.meta.env.VITE_API_URL": JSON.stringify("http://localhost"),
  },
  test: {
    environment: "jsdom",
    include: [
      "packages/upholstery/src/**/*.test.ts",
      "packages/upholstery/src/**/*.test.tsx",
    ],
    css: true,
  },
});
