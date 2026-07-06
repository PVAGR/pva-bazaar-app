(() => {
  'use strict';

  function setCurrentYear() {
    const nodes = document.querySelectorAll('[data-current-year]');
    const year = String(new Date().getFullYear());
    nodes.forEach((node) => {
      node.textContent = year;
    });
  }

  async function checkBackend() {
    const statusNode = document.querySelector('[data-api-status]');
    if (!statusNode) return;

    const backendUrl =
      (window.APP_CONFIG && window.APP_CONFIG.backendUrl) ||
      (async () => {
        try {
          const response = await fetch('/api-base.json', { cache: 'no-store' });
          if (!response.ok) return '';
          const data = await response.json();
          return String(data.apiUrl || '').trim();
        } catch {
          return '';
        }
      })();

    const apiBase = typeof backendUrl === 'string' ? backendUrl : await backendUrl;
    if (!apiBase) {
      statusNode.textContent = 'No backend URL configured yet.';
      statusNode.parentElement &&
        statusNode.parentElement
          .querySelector('.status span:last-child')
          ?.replaceChildren(document.createTextNode('Unset'));
      return;
    }

    const cleanBase = apiBase.replace(/\/+$/, '');
    const healthUrl = cleanBase.endsWith('/api')
      ? `${cleanBase}/health`
      : `${cleanBase}/api/health`;

    try {
      const response = await fetch(healthUrl, {
        headers: { Accept: 'application/json' },
      });
      const text = await response.text();
      let message = text;
      try {
        const json = JSON.parse(text);
        message = json.message || json.status || json.ok || text;
      } catch {
        // keep text body
      }
      if (response.ok) {
        statusNode.textContent = `Backend online at ${healthUrl}`;
      } else {
        statusNode.textContent = `Backend reachable, but health returned ${response.status}: ${String(message).slice(0, 120)}`;
      }
    } catch (error) {
      statusNode.textContent = `Backend check failed: ${String(error).slice(0, 120)}`;
    }
  }

  function wireAnchorScroll() {
    const links = document.querySelectorAll('a[href^="#"], a[href^="/#"]');
    links.forEach((link) => {
      link.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    setCurrentYear();
    wireAnchorScroll();
    checkBackend();
  });
})();
