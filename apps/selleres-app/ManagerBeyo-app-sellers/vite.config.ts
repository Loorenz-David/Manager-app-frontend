import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import svgr from "vite-plugin-svgr";

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
          "favicon-20260707.png",
          "apple-touch-icon-20260707.png",
          "pwa-48x48-20260707.png",
          "pwa-72x72-20260707.png",
          "pwa-96x96-20260707.png",
          "pwa-144x144-20260707.png",
          "pwa-192x192-20260707.png",
          "pwa-512x512-20260707.png",
        ],
        manifest: {
          name: "Seller Beyo",
          short_name: "SellerBeyo",
          description: "Beyo seller workspace",
          id: "/",
          theme_color: "#ffffff",
          background_color: "#ffffff",
          display: "standalone",
          start_url: "/",
          scope: "/",
          icons: [
            { src: "pwa-48x48-20260707.png", sizes: "48x48", type: "image/png" },
            { src: "pwa-72x72-20260707.png", sizes: "72x72", type: "image/png" },
            { src: "pwa-96x96-20260707.png", sizes: "96x96", type: "image/png" },
            { src: "pwa-144x144-20260707.png", sizes: "144x144", type: "image/png" },
            { src: "pwa-192x192-20260707.png", sizes: "192x192", type: "image/png" },
            { src: "pwa-512x512-20260707.png", sizes: "512x512", type: "image/png" },
            {
              src: "pwa-512x512-20260707.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
          screenshots: [
            {
              src: "pwa-screenshot-desktop-wide.png",
              sizes: "1280x720",
              type: "image/png",
              form_factor: "wide",
              label: "Seller Beyo desktop workspace",
            },
            {
              src: "pwa-screenshot-mobile.png",
              sizes: "1242x2688",
              type: "image/png",
              label: "Seller Beyo mobile workspace",
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
    build: {
      modulePreload: {
        resolveDependencies(_filename, dependencies) {
          return dependencies.filter(
            (dependency) => !dependency.includes("presentation-player"),
          );
        },
      },
      rollupOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: "presentation-player",
                includeDependenciesRecursively: false,
                test(id) {
                  const normalizedId = id.replaceAll("\\", "/");
                  return (
                    normalizedId.includes(
                      "/packages/presentations/src/PresentationPlayer.tsx",
                    ) ||
                    normalizedId.includes(
                      "/packages/presentations/src/components/player/",
                    ) ||
                    normalizedId.includes(
                      "/packages/presentations/src/playback/",
                    ) ||
                    normalizedId.includes(
                      "/packages/presentations/src/surfaces/",
                    ) ||
                    normalizedId.includes(
                      "/packages/presentation-runtime/src/SlideCompositionRenderer.tsx",
                    ) ||
                    normalizedId.includes(
                      "/packages/presentation-runtime/src/animation-registry.ts",
                    ) ||
                    normalizedId.includes(
                      "/packages/presentation-runtime/src/ordering.ts",
                    ) ||
                    normalizedId.includes(
                      "/packages/presentation-runtime/src/usePlaybackClock.ts",
                    )
                  );
                },
              },
            ],
          },
        },
      },
    },
    server: {
      allowedHosts: ["7aa9-155-4-95-121.ngrok-free.app"],
      port: 5175,
      strictPort: true,
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
