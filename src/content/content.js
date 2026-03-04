/**
 * Rapido - Content Script Entry Point
 * Initializes the UI on every page.
 */
(() => {
  // Prevent double initialization
  if (window.__rapidoLoaded) return;
  window.__rapidoLoaded = true;

  // Initialize UI
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => RapidoUI.init());
  } else {
    RapidoUI.init();
  }
})();
