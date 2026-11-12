import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { defineConfig } from "vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const useHttps = process.env.VITE_DEV_HTTPS === "true";

export default defineConfig({
  plugins: [react(), tailwindcss(), ...(useHttps ? [basicSsl()] : [])],
  resolve: {
    alias: { "@": path.resolve(rootDir, "src") },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        // Match backend/.env's default PORT and avoid IPv4/IPv6 localhost mismatches.
        target: "http://127.0.0.1:4000",
        changeOrigin: true,
      },
    },
  },
});
