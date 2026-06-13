(function () {
  const params = new URLSearchParams(location.search);
  const override = params.get('backend');
  if (override) try { localStorage.setItem('backendUrl', override); } catch {}
  const stored = (function () {
    try { return localStorage.getItem('backendUrl'); } catch { return null; }
  })();
  
  // Default backend URL - will be different per deployment
  const defaultBackend = window.location.hostname === 'localhost' 
    ? 'http://localhost:5001'
    : `https://${window.location.hostname}/api`;
    
  window.APP_CONFIG = {
    backendUrl: override || stored || defaultBackend,
  };
})();
