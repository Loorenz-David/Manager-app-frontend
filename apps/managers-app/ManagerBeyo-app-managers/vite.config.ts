import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      allowedHosts: ["892a-155-4-95-121.ngrok-free.app"],
      proxy: env.API_TARGET_URL
        ? {
            "/api": {
              target: env.API_TARGET_URL,
              changeOrigin: true,
            },
          }
        : undefined,
    },
  };
});
