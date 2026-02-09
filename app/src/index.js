// src/index.js
import './set-public-path'; // keep if you need it for asset origin
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { loadableReady } from '@loadable/component';
import App from './App';
import { SsrDataProvider } from './state/providers/ssr-data-context';


  window.addEventListener('error', (e) => {
    // This fires even when React overlay just says "Script error."
    // You’ll see filename/line OR at least the actual Error object.
    // eslint-disable-next-line no-console
    console.error('[window.error]', {
      message: e.message,
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
      error: e.error,            // real Error with stack if same-origin
    });
  });

  window.addEventListener('unhandledrejection', (e) => {
    // eslint-disable-next-line no-console
    console.error('[unhandledrejection]', e.reason);
  });

// SSR payload from server
// (server writes: <script>window.__SSR_DATA__ = {...}</script>)
const ssrData = window.__SSR_DATA__ ?? null;

const container = document.getElementById('root');
const app = (
  <SsrDataProvider value={ssrData}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </SsrDataProvider>
);

if (container) container.setAttribute('data-client-entry', 'loaded');
console.log('[client] entry loaded');

if (container && container.hasChildNodes()) {
  loadableReady(() => {
    hydrateRoot(container, app);
  });
} else if (container) {
  createRoot(container).render(app);
}
