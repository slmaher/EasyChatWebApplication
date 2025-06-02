import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite"; // ✅ New Tailwind Vite Plugin

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
