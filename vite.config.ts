import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  base: "/flow/",
  server: {
    host: "0.0.0.0",
  },
  plugins: [react()],
});
