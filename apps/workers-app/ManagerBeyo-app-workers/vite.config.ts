import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import svgr from "vite-plugin-svgr";
import path from "path";

export default defineConfig({
  plugins: [
    tailwindcss() as PluginOption,
    svgr(),
    react(),
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
        name: "Worker Beyo",
        short_name: "WorkerBeyo",
        description: "Beyo workspace worker",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
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
            purpose: "any maskable",
          },
        ],
      },
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      },
      devOptions: {
        enabled: true,
        type: "module",
      },
    }),
  ] as PluginOption[],
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
});
