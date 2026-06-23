import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Prevent ResizeObserver harmless loop errors from bubbling up to system-internal observers
if (typeof window !== 'undefined') {
  const resizeObserverErrorWords = [
    'ResizeObserver loop completed with undelivered notifications',
    'ResizeObserver loop limit exceeded'
  ];
  window.addEventListener('error', (event) => {
    if (event && event.message && resizeObserverErrorWords.some(msg => event.message.includes(msg))) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });
}

/*
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
    }, (err) => {
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}
*/

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
