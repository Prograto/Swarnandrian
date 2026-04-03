import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import App from './App';
import { useAuthStore } from './store/authStore';

if ('serviceWorker' in navigator) {
  void navigator.serviceWorker.getRegistrations()
    .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
    .catch(() => {
      // Ignore SW cleanup failures; app should still render normally.
    });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
useAuthStore.getState().initAuth();
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
