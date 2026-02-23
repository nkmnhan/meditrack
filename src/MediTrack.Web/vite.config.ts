import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/api/patients": {
        target: process.env.VITE_PATIENT_API_URL ?? "http://localhost:5002",
        changeOrigin: true,
        rewrite: (urlPath) => urlPath.replace(/^\/api\/patients/, ""),
      },
      "/api/appointments": {
        target: process.env.VITE_APPOINTMENT_API_URL ?? "http://localhost:5003",
        changeOrigin: true,
        rewrite: (urlPath) => urlPath.replace(/^\/api\/appointments/, ""),
      },
      "/api/medicalrecords": {
        target: process.env.VITE_MEDICALRECORDS_API_URL ?? "http://localhost:5004",
        changeOrigin: true,
        rewrite: (urlPath) => urlPath.replace(/^\/api\/medicalrecords/, ""),
      },
    },
  },
});
