import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { readFileSync } from "fs";
import { execSync } from "child_process";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

const commitHash = execSync("git rev-parse --short HEAD").toString().trim();
const appVersion = JSON.parse(
  readFileSync(path.resolve(__dirname, "package.json"), "utf-8")
).version;

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __APP_COMMIT__: JSON.stringify(commitHash),
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Parchment",
        short_name: "Parchment",
        description: "Simple, beautiful pages and collections",
        theme_color: "#0f0c19",
        background_color: "#0f0c19",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/app",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallback: null,
        navigateFallbackDenylist: [/^\/auth\/v1\//, /^\/functions\/v1\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkOnly",
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
