import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { visualizer } from "rollup-plugin-visualizer";
import path from "node:path";
import { defineConfig } from "vite";

const plugins = [
  react(),
  tailwindcss(),
  VitePWA({
    registerType: "autoUpdate",
    includeAssets: ["logo-realistic.png", "logo.svg", "pwa-192x192.png", "pwa-512x512.png"],
    manifest: {
      name: "BiblioTech — Bibliothèque Numérique",
      short_name: "BiblioTech",
      description: "La bibliothèque numérique des étudiants sénégalais. Lis même sans internet.",
      theme_color: "#1B7A3D",
      background_color: "#0a0a0a",
      display: "standalone",
      orientation: "portrait",
      scope: "/",
      start_url: "/",
      lang: "fr",
      categories: ["education", "books"],
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
        },
        {
          src: "/pwa-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    },
    workbox: {
      // Cache les pages et assets statiques
      globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      // Stratégies de cache pour les requêtes runtime
      runtimeCaching: [
        {
          // API Supabase — Network First (données fraîches quand possible)
          urlPattern: /^never-cache-supabase-disabled$/i,
          handler: "NetworkFirst",
          options: {
            cacheName: "supabase-api-cache",
            expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 }, // 1h
            networkTimeoutSeconds: 5,
          },
        },
        {
          // Images de couvertures — Cache First (rarement modifiées)
          urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
          handler: "CacheFirst",
          options: {
            cacheName: "images-cache",
            expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }, // 30 jours
          },
        },
        {
          // Lecteur integre: reste dans la PWA et garde une copie courte des pages consultees
          urlPattern: ({ url }) => url.pathname.startsWith("/api/reader/proxy"),
          handler: "NetworkFirst",
          options: {
            cacheName: "reader-proxy-cache",
            expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 6 }, // 6h
            networkTimeoutSeconds: 8,
          },
        },
        {
          // Assets des sources de lecture autorisees
          urlPattern: /^https:\/\/(.*\.)?(openlibrary\.org|archive\.org|gutenberg\.org|mangadex\.org)\/.*/i,
          handler: "StaleWhileRevalidate",
          options: {
            cacheName: "reader-assets-cache",
            expiration: { maxEntries: 180, maxAgeSeconds: 60 * 60 * 24 * 7 }, // 7 jours
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        {
          // Polices Google Fonts — Cache First
          urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
          handler: "CacheFirst",
          options: {
            cacheName: "google-fonts-cache",
            expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }, // 1 an
          },
        },
      ],
    },
    devOptions: {
      enabled: false, // Désactivé en dev pour éviter les conflits
    },
  }),
  // Généré uniquement en mode ANALYZE=true pour ne pas ralentir le CI
  ...(process.env.ANALYZE === "true"
    ? [visualizer({ filename: "dist/bundle-stats.html", open: true, gzipSize: true, brotliSize: true })]
    : []),
];

export default defineConfig({
  plugins,
  cacheDir: path.resolve(import.meta.dirname, "client", "vite-cache"),
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          // Lecteurs (chargés seulement en mode lecture)
          if (id.includes("epubjs") || id.includes("jszip")) return "epub-reader";
          if (id.includes("react-pdf") || id.includes("pdfjs-dist")) return "pdf-viewer";
          // Graphiques (dashboard uniquement)
          if (id.includes("recharts") || id.includes("d3-") || id.includes("victory-")) return "charts";
          // UI libs
          if (id.includes("@radix-ui")) return "radix-ui";
          if (id.includes("lucide-react")) return "icons";
          // Animation (séparée pour les pages sans animation)
          if (id.includes("framer-motion")) return "motion";
          // Supabase SDK
          if (id.includes("@supabase")) return "supabase";
          // React core (toujours chargé)
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return "react-core";
          // Reste en vendor
          return "vendor";
        },
      },
    },
  },
  server: {
    port: 3000,
    strictPort: false,
    host: true,
    allowedHosts: ["localhost", "127.0.0.1", "concetta-noteworthy-waxily.ngrok-free.dev"],
    fs: {
      strict: true,
      allow: [
        path.resolve(import.meta.dirname),
        path.resolve(import.meta.dirname, "client"),
      ],
      deny: ["**/.*"],
    },
    // Proxy API — NestJS (3002) pour les nouvelles routes, Express (3001) pour le reste
    proxy: {
      // ── NestJS (port 3002 en dev) ────────────────────────────────
      "/api/auth":         { target: "http://localhost:3002", changeOrigin: true },
      "/api/books":        { target: "http://localhost:3002", changeOrigin: true },
      "/api/chapters":     { target: "http://localhost:3002", changeOrigin: true },
      "/api/coins":        { target: "http://localhost:3002", changeOrigin: true },
      "/api/weather":      { target: "http://localhost:3002", changeOrigin: true },
      "/api/open-library": { target: "http://localhost:3002", changeOrigin: true },
      "/api/search":         { target: "http://localhost:3002", changeOrigin: true },
      "/api/health":         { target: "http://localhost:3002", changeOrigin: true },
      "/api/subscriptions":  { target: "http://localhost:3002", changeOrigin: true },
      "/api/metrics":        { target: "http://localhost:3002", changeOrigin: true },
      "/api/notifications":  { target: "http://localhost:3002", changeOrigin: true },
      "/api/payments":       { target: "http://localhost:3002", changeOrigin: true },
      "/api/borrows":        { target: "http://localhost:3002", changeOrigin: true },
      "/api/marketplace":    { target: "http://localhost:3002", changeOrigin: true },
      "/api/badges":         { target: "http://localhost:3002", changeOrigin: true },
      // ── Express server (port 3001) — chat AI + reader proxy ──────
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
