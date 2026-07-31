import path from "node:path";
import { createReadStream } from "node:fs";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import svgr from "vite-plugin-svgr";
import type { Plugin } from "vite";

function floorMockServiceWorkerPlugin(): Plugin {
  const workerPath = path.resolve(__dirname, "src/mocks/mockServiceWorker.js");

  return {
    name: "floor-mock-service-worker",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/mockServiceWorker.js", (_request, response) => {
        response.setHeader("Content-Type", "text/javascript; charset=utf-8");
        createReadStream(workerPath).pipe(response);
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");

  return {
    plugins: [
      floorMockServiceWorkerPlugin(),
      svgr(),
      react(),
      tailwindcss(),
      VitePWA({
        strategies: "injectManifest",
        srcDir: "src",
        filename: "sw.ts",
        registerType: "autoUpdate",
        injectRegister: "auto",
        includeAssets: [
          "floor-kiosk.svg",
          "fonts/InstrumentSans-Variable.ttf",
          "fonts/IBMPlexMono-Regular.ttf",
          "fonts/IBMPlexMono-Medium.ttf",
          "fonts/IBMPlexMono-SemiBold.ttf",
        ],
        manifest: {
          name: "ManagerBeyo Floor",
          short_name: "Beyo Floor",
          description: "ManagerBeyo shop-floor clock terminal",
          theme_color: "#f2efe9",
          background_color: "#f2efe9",
          display: "standalone",
          orientation: "any",
          start_url: "/",
          icons: [
            {
              src: "floor-kiosk.svg",
              sizes: "any",
              type: "image/svg+xml",
              purpose: "any",
            },
            {
              src: "floor-kiosk.svg",
              sizes: "any",
              type: "image/svg+xml",
              purpose: "maskable",
            },
          ],
        },
        injectManifest: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,ttf,woff2}"],
        },
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 5177,
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
