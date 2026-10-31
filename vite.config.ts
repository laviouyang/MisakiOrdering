import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `npm run dev` serves the app at http://localhost:5174 (5173 is left free for other projects)
// `npm run build` writes the finished app to the dist folder.
export default defineConfig({
  plugins: [react()],
  server: { port: 5174, strictPort: true },
  build: { outDir: 'dist', emptyOutDir: true },
});
