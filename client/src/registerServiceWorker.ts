// client/src/registerServiceWorker.ts
export const registerServiceWorker = () => {
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[SPYDE SW] Registered with scope:', registration.scope);
        })
        .catch((error) => {
          console.error('[SPYDE SW] Registration failed:', error);
        });
    });
  }
};