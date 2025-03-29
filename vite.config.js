import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "firebase/app": "firebase/compat/app",
      "firebase/auth": "firebase/compat/auth",
      "firebase/firestore": "firebase/compat/firestore",
      "firebase/storage": "firebase/compat/storage",
      "firebase/analytics": "firebase/compat/analytics",
    },
  },
  optimizeDeps: {
    include: [
      "firebase/compat/app",
      "firebase/compat/auth",
      "firebase/compat/firestore",
      "firebase/compat/storage",
      "firebase/compat/analytics",
    ],
  },
  build: {
    commonjsOptions: {
      include: [/firebase/, /node_modules/],
    },
  },
  server: {
    host: true,
  },
});
