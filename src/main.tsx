// Ensure window.fetch is writable to prevent "Cannot set property fetch of #<Window> which has only a getter"
try {
  if (typeof window !== 'undefined' && window.fetch) {
    const origFetch = window.fetch;
    const boundFetch = typeof origFetch.bind === 'function' ? origFetch.bind(window) : origFetch;
    let _fetch = boundFetch;
    try {
      Object.defineProperty(window, 'fetch', {
        get: () => _fetch,
        set: (fn) => { _fetch = fn; },
        configurable: true,
        enumerable: true,
      });
    } catch {
      try {
        Object.defineProperty(Window.prototype, 'fetch', {
          get: () => _fetch,
          set: (fn) => { _fetch = fn; },
          configurable: true,
          enumerable: true,
        });
      } catch {}
    }
  }
} catch {}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

