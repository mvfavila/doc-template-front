import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: [
      "vue",
      "vue-router",
      "firebase/app",
      "/firebase/auth",
      "/firebase/firestore",
      "/firebase/storage",
    ],
  },
  build: {
    rollupOptions: {
      external: ["firebase/auth", "firebase/firestore", "firebase/storage"],
    },
  },
  server: {
    host: true,
  },
});
