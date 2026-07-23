import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const violaProxy = () => ({
  target: "https://viola.thaidlt.com",
  changeOrigin: true,
  rewrite: (path) => path.replace(/^\/__viola/, ""),
});

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      "/__viola": violaProxy(),
    },
  },
  preview: {
    proxy: {
      "/__viola": violaProxy(),
    },
  },
  build: {
    rollupOptions: {
      input: {
        teacher: fileURLToPath(new URL("teacher.html", import.meta.url)),
        student: fileURLToPath(new URL("student.html", import.meta.url)),
      },
    },
  },
  root: projectRoot,
});
