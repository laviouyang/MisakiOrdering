import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `npm run dev` serves the app at http://localhost:5173
// `npm run build` writes the finished app to the dist folder.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: { outDir: 'dist', emptyOutDir: true },
});
