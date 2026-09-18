import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve("client/src") } },
  root: path.resolve("client"),
  build: { outDir: path.resolve("dist"), emptyOutDir: true },
});
