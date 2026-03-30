import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  // CRITICAL: @cofhe/sdk uses new Worker(new URL(...)) for ZK proof generation.
  // If Vite pre-bundles it, the relative worker URL resolves incorrectly → worker fails.
  // The CJS-only transitive deps must be explicitly included so Vite finds them.
  optimizeDeps: {
    exclude: ["@cofhe/sdk"],
    include: [
      "iframe-shared-storage",
      "tweetnacl",
      "zustand/vanilla",
      "zustand/middleware",
      "immer",
    ],
  },
}));
