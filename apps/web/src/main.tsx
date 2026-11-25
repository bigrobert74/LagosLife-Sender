import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Automatically route all backend API calls to the live Render backend
const LIVE_API_BASE = (
  import.meta.env.VITE_API_URL || 'https://lagos-life-api.onrender.com'
).replace(/\/+$/, '');

const originalFetch = window.fetch;
window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
  if (typeof input === 'string') {
    if (input.startsWith('http://localhost:3000')) {
      input = input.replace('http://localhost:3000', LIVE_API_BASE);
    } else if (input.startsWith('/api/')) {
      input = `${LIVE_API_BASE}${input}`;
    }
  } else if (input instanceof URL && input.origin === 'http://localhost:3000') {
    input = new URL(input.pathname + input.search, LIVE_API_BASE);
  }
  return originalFetch.call(window, input, init);
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
