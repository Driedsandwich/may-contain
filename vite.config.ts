import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  base: "/may-contain/",
  plugins: [react()],
  build: {
    outDir: "dist/site",
    rollupOptions: {
      output: {
        manualChunks: {
          dictionary: ["./src/lexicon/data.json"],
          react: ["react", "react-dom/client"],
        },
      },
    },
  },
});
