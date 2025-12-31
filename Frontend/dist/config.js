// Runtime config for Frontend pages
// Set backend URL via localStorage('backendUrl') or query param ?backend=https://your-backend.example.com
(function () {
  const params = new URLSearchParams(location.search);
  const override = params.get('backend');
  if (override)
    try {
      localStorage.setItem('backendUrl', override);
    } catch {}
  const stored = (function () {
    try {
      return localStorage.getItem('backendUrl');
    } catch {
      return null;
    }
  })();
  window.APP_CONFIG = {
    backendUrl: override || stored || null,
  };
})();
