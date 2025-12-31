import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initDB } from './services/db';
import { GoogleMapsProvider } from './providers/GoogleMapsProvider';

// Initialize IndexedDB
async function initializeApp() {
  try {
    await initDB();
    console.log('IndexedDB initialized successfully');
  } catch (error) {
    console.error('Failed to initialize IndexedDB:', error);
    // App will still work but won't have offline persistence
  }
}

// Service Worker Registration for PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('SW registered:', registration.scope);
    } catch (error) {
      console.error('SW registration failed:', error);
    }
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// Initialize app and render
initializeApp().then(() => {
  root.render(
    <React.StrictMode>
      <GoogleMapsProvider>
        <App />
      </GoogleMapsProvider>
    </React.StrictMode>
  );
});