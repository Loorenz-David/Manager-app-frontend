import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import svgr from "vite-plugin-svgr";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");

  return {
    plugins: [
      svgr(),
      react(),
      tailwindcss(),
      VitePWA({
        strategies: "injectManifest",
        srcDir: "src",
        filename: "sw.ts",
        registerType: "prompt",
        injectRegister: "auto",
        includeAssets: [
          "favicon.svg",
          "apple-touch-icon.png",
          "pwa-48x48.png",
          "pwa-72x72.png",
          "pwa-96x96.png",
          "pwa-144x144.png",
          "pwa-192x192.png",
          "pwa-512x512.png",
        ],
        manifest: {
          name: "Manager Beyo",
          short_name: "ManagerBeyo",
          description: "Beyo workspace manager",
          theme_color: "#ffffff",
          background_color: "#ffffff",
          display: "standalone",
          start_url: "/",
          icons: [
            { src: "pwa-48x48.png", sizes: "48x48", type: "image/png" },
            { src: "pwa-72x72.png", sizes: "72x72", type: "image/png" },
            { src: "pwa-96x96.png", sizes: "96x96", type: "image/png" },
            { src: "pwa-144x144.png", sizes: "144x144", type: "image/png" },
            { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
            {
              src: "pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable",
            },
          ],
        },
        injectManifest: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        },
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      allowedHosts: ["7aa9-155-4-95-121.ngrok-free.app"],
      proxy: env.API_TARGET_URL
        ? {
            "/api": {
              target: env.API_TARGET_URL,
              changeOrigin: true,
            },
            "/socket.io": {
              target: env.API_TARGET_URL,
              changeOrigin: true,
              ws: true,
            },
          }
        : undefined,
    },
  };
});
