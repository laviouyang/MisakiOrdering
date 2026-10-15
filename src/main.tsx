import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from './ErrorBoundary';
import './index.css';

// On the website, cache the app so it still opens offline.
// (The Mac, Windows and iPhone apps already have everything built in.)
if (import.meta.env.PROD && 'serviceWorker' in navigator && /^https?:$/.test(window.location.protocol)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error: unknown) => {
      console.error('Could not set up offline mode.', error);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
