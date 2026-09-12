import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: true,
    proxy: {
      "/coach": { target: "http://127.0.0.1:8787", changeOrigin: true },
      "/elevenlabs": { target: "http://127.0.0.1:8787", changeOrigin: true },
      "/vision": { target: "http://127.0.0.1:8787", changeOrigin: true },
      "/diagnostics": { target: "http://127.0.0.1:8787", changeOrigin: true },
      "/companion": { target: "http://127.0.0.1:8787", changeOrigin: true },
    },
  },
});
