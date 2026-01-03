
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

// Exposer les outils de débogage en développement
if (import.meta.env.DEV && typeof window !== 'undefined') {
  // Lazy load pour éviter les erreurs si les modules ne sont pas disponibles
  import('./scripts/expose-debug-tools').catch(() => {
    // Ignorer si le fichier n'existe pas
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
