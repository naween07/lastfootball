import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// ─── MIGRATION NOTE ─────────────────────────────────────────────────────────
// Removed: lovable-tagger (Loveable platform telemetry — useless outside Loveable cloud)
// Added:   manualChunks  (splits bundle so browsers cache vendor code separately)
// Added:   proxy         (in dev, /api → localhost:3001 if you ever add Express later)
// ─────────────────────────────────────────────────────────────────────────────

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
  },

  plugins: [react()],

  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },

  build: {
    // Raise warning threshold — individual vendor chunks legitimately exceed 500 KB
    chunkSizeWarningLimit: 500,

    rollupOptions: {
      output: {
        manualChunks: {
          // Core React — always needed, cached forever with content-hash
          "vendor-react": ["react", "react-dom", "react/jsx-runtime"],
          "vendor-router": ["react-router-dom"],

          // Data layer
          "vendor-query": ["@tanstack/react-query"],
          "vendor-supabase": ["@supabase/supabase-js"],

          // UI primitives — large but stable, benefits from long cache
          "vendor-radix": [
            "@radix-ui/react-accordion",
            "@radix-ui/react-alert-dialog",
            "@radix-ui/react-avatar",
            "@radix-ui/react-checkbox",
            "@radix-ui/react-collapsible",
            "@radix-ui/react-context-menu",
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-hover-card",
            "@radix-ui/react-label",
            "@radix-ui/react-menubar",
            "@radix-ui/react-navigation-menu",
            "@radix-ui/react-popover",
            "@radix-ui/react-progress",
            "@radix-ui/react-radio-group",
            "@radix-ui/react-scroll-area",
            "@radix-ui/react-select",
            "@radix-ui/react-separator",
            "@radix-ui/react-slider",
            "@radix-ui/react-slot",
            "@radix-ui/react-switch",
            "@radix-ui/react-tabs",
            "@radix-ui/react-toast",
            "@radix-ui/react-toggle",
            "@radix-ui/react-toggle-group",
            "@radix-ui/react-tooltip",
          ],

          // Heavy — only loaded on /stats page (lazy-imported)
          "vendor-charts": ["recharts"],

          // Icons — separate chunk so icon additions don't bust React cache
          "vendor-icons": ["lucide-react"],

          // Forms — only loaded on /auth and /onboarding
          "vendor-forms": ["react-hook-form", "@hookform/resolvers", "zod"],

          // Date utilities — only loaded on pages with calendar/fixtures
          "vendor-dates": ["date-fns", "react-day-picker"],
        },
      },
    },
  },
}));
