import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // GitHub Pages serves this project at /tm-express/, so the demo build
  // needs every asset path prefixed with it. Everywhere else stays at "/".
  base: mode === "demo" ? "/tm-express/" : "/",
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:4000",
    },
  },
}));
