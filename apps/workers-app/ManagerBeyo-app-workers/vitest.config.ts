import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Same define every package vitest config carries. Without it any suite whose
  // import graph reaches @beyo/api-client throws at env-validation time.
  define: {
    "import.meta.env.VITE_API_URL": JSON.stringify("http://localhost"),
  },
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
      path.resolve(__dirname, "src/features/home/**/*.test.ts"),
      path.resolve(__dirname, "src/features/home/**/*.test.tsx"),
      path.resolve(__dirname, "src/features/working_sections/**/*.test.ts"),
      path.resolve(__dirname, "src/features/working_sections/**/*.test.tsx"),
      path.resolve(__dirname, "src/pages/**/*.test.tsx"),
      path.resolve(__dirname, "src/app/**/*.test.ts"),
      path.resolve(__dirname, "src/providers/**/*.test.tsx"),
    ],
  },
});
