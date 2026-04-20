import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';

// Extremely robust fetch getter/setter patch
try {
  let currentFetch = window.fetch || globalThis.fetch;
  const shadow = {
    configurable: true,
    enumerable: true,
    get: function() { return currentFetch; },
    set: function(val) { currentFetch = val; }
  };
  Object.defineProperty(window, 'fetch', shadow);
  Object.defineProperty(globalThis, 'fetch', shadow);
} catch(e) {}

import App from './App.tsx';
import './index.css';
import { FirebaseAuthProvider } from './components/FirebaseAuthProvider';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FirebaseAuthProvider>
      <App />
    </FirebaseAuthProvider>
  </StrictMode>,
);
