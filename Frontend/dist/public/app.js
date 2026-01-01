// pvabazaar.org Journal SPA (CDN React + HashRouter)
(function(){
  const { useState, useMemo, useEffect } = React;
  const { createRoot } = ReactDOM;
  const { HashRouter, Routes, Route, NavLink, useParams, useNavigate, useLocation } = ReactRouterDOM;

  // Utility: dynamically load external UMD scripts when needed
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement('script');
      s.src = src; s.async = true; s.onload = () => resolve(); s.onerror = reject; document.head.appendChild(s);
    });
  }

  // API base override: use localStorage 'api:base' when set; otherwise relative path
  function apiFetch(path, options) {
    try {
      const base = (localStorage.getItem('api:base') || '').trim();
      const cleanBase = base.replace(/\/+$/, '');
      const url = base ? `${cleanBase}${path}` : path;
      return fetch(url, options);
    } catch (_) {
      return fetch(path, options);
    }
  }

  // Runtime API base auto-detection: try multiple paths and set localStorage if not set
  (function initApiBase() {
    try {
      const existing = (localStorage.getItem('api:base') || '').trim();
      if (existing) return;
      const tryFetch = (p) => fetch(p, { cache: 'no-store' }).then(res => res.ok ? res.json() : null).catch(() => null);
      tryFetch('/public/api-base.json')
        .then(cfg => cfg || tryFetch('/api-base.json'))
        .then(cfg => {
          if (cfg && typeof cfg.base === 'string' && cfg.base.trim().length) {
            localStorage.setItem('api:base', cfg.base.trim());
          }
        })
        .catch(() => {});
    } catch (_) {}
  })();

  // Merge any locally-persisted custom entries into the global entries source
  const CUSTOM_KEY = 'journal:customEntries';
  try {
    const existing = Array.isArray(window.JOURNAL_ENTRIES) ? window.JOURNAL_ENTRIES : [];
    const custom = JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]');
    if (Array.isArray(custom) && custom.length) {
      window.JOURNAL_ENTRIES = existing.concat(custom).sort((a, b) => new Date(b.date) - new Date(a.date));
    }
  } catch {}

  function useTheme() {
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
    useEffect(() => { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('theme', theme); }, [theme]);
    return { theme, toggle: () => setTheme(t => t === 'dark' ? 'light' : 'dark') };
  }

  function useSearchParam() {
    const { search } = useLocation();
    return useMemo(() => new URLSearchParams(search), [search]);
  }

  function formatDate(iso) {
    try { return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }); } catch { return iso; }
  }

  function highlight(text, term) {
    if (!term) return text;
    const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${esc})`, 'gi');
    return text.replace(regex, '<mark class="mark">$1</mark>');
  }

  function Layout({ children, onSearch, searchTerm }) {
    const { theme, toggle } = useTheme();
    return (
      React.createElement('div', { className: 'container' },
        React.createElement('a', { href: '#content', className: 'sr-only' }, 'Skip to content'),
        React.createElement('header', { className: 'header', role: 'banner' },
          React.createElement('div', { className: 'header__inner' },
            React.createElement('div', { className: 'brand' },
              React.createElement('div', { className: 'brand__title' }, 'pvabazaar.org'),
              React.createElement('div', { className: 'brand__tagline' }, 'A Life in Words - My Personal Journal')
            ),
            React.createElement('nav', { className: 'nav', 'aria-label': 'Main' },
              React.createElement(NavLink, { to: '/', end: true }, 'Home'),
              React.createElement(NavLink, { to: '/journal' }, 'Journal'),
              React.createElement(NavLink, { to: '/journals' }, 'Journals'),
              React.createElement(NavLink, { to: '/writings' }, 'Writings'),
              React.createElement(NavLink, { to: '/gallery' }, 'Gallery'),
              React.createElement(NavLink, { to: '/biography' }, 'Biography'),
              React.createElement(NavLink, { to: '/novel' }, 'Novel'),
              React.createElement(NavLink, { to: '/research' }, 'Research'),
              React.createElement(NavLink, { to: '/pva-food' }, 'PVA Food'),
              React.createElement(NavLink, { to: '/marketplace' }, 'Marketplace'),
              React.createElement(NavLink, { to: '/pva-nation' }, 'PVA Nation'),
              React.createElement(NavLink, { to: '/partners' }, 'Partners'),
              React.createElement(NavLink, { to: '/archive' }, 'Archive'),
              React.createElement(NavLink, { to: '/about' }, 'About'),
              React.createElement(NavLink, { to: '/search' }, 'Search'),
              React.createElement(NavLink, { to: '/admin/new-journal' }, 'Admin')
            ),
            React.createElement('div', { className: 'header__right' },
              React.createElement('input', {
                className: 'searchInput', type: 'search', placeholder: 'Search entries…',
                value: searchTerm || '', onChange: e => onSearch && onSearch(e.target.value), 'aria-label': 'Search entries'
              }),
              React.createElement('button', { className: 'themeToggle', onClick: toggle, 'aria-label': 'Toggle theme' }, theme === 'dark' ? 'Light' : 'Dark')
            )
          )
        ),
        React.createElement('main', { id: 'content', className: 'main' }, children),
        React.createElement('footer', { className: 'footer', role: 'contentinfo' },
          React.createElement('div', null,
            '© ', new Date().getFullYear(), ' · A Living Document · ',
            React.createElement('span', null, 'Last updated: ', new Date().toLocaleDateString()),
            ' · ', React.createElement('a', { href: '#/about' }, 'About')
          )
        )
      )
    );
  }

  function HomePage() {
    const [tab, setTab] = React.useState('journal');
    const entries = useMemo(() => (window.JOURNAL_ENTRIES || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date)), []);
    const latest = entries.slice(0, 9);

    return (
      React.createElement('section', { className: 'homePage' },
        React.createElement('div', { className: 'homePage__hero' },
          React.createElement('div', { className: 'tabs', role: 'tablist' },
            React.createElement('button', { className: 'tab', role: 'tab', 'aria-selected': tab === 'writings', onClick: () => setTab('writings') }, 'Writings'),
            React.createElement('button', { className: 'tab', role: 'tab', 'aria-selected': tab === 'journal', onClick: () => setTab('journal') }, 'Journals'),
            React.createElement('button', { className: 'tab', role: 'tab', 'aria-selected': tab === 'blogs', onClick: () => setTab('blogs') }, 'Blogs'),
            React.createElement('button', { className: 'tab', role: 'tab', 'aria-selected': tab === 'pvafood', onClick: () => setTab('pvafood') }, 'PVA Food'),
            React.createElement('button', { className: 'tab', role: 'tab', 'aria-selected': tab === 'business', onClick: () => setTab('business') }, 'Business Model')
          ),
          tab === 'pvafood' && (
            React.createElement('div', { className: 'tab-panel' },
              React.createElement('p', { className: 'subtle' }, 'Top recipes and ancient practices.'),
              React.createElement('a', { className: 'link', href: '#/pva-food' }, 'Open PVA Food →')
            )
          ),
          tab === 'business' && (
            React.createElement('div', { className: 'tab-panel' },
              React.createElement('p', { className: 'subtle' }, 'Diagrams and marketplace overview.'),
              React.createElement('a', { className: 'link', href: '#/marketplace' }, 'Open Marketplace →')
            )
          ),
          tab === 'journal' && (
            React.createElement('div', { className: 'tab-panel' },
              React.createElement('div', { className: 'mini-list' },
                latest.map(e => (
                  React.createElement('div', { key: e.id, className: 'mini-item' },
                    React.createElement('div', { className: 'title' },
                      React.createElement('a', { href: `#/entry/${e.id}` }, e.title)
                    ),
                    React.createElement('div', { className: 'meta' }, formatDate(e.date)),
                    React.createElement('div', { className: 'excerpt subtle' }, e.excerpt)
                  )
                ))
              ),
              React.createElement('div', { style: { marginTop: '0.5rem' } },
                React.createElement('a', { className: 'link', href: '#/journal' }, 'View all entries →')
              )
            )
          ),
          tab === 'writings' && (
            React.createElement('div', { className: 'tab-panel' },
              React.createElement('p', { className: 'subtle' }, 'Selected writings and essays.'),
              React.createElement('a', { className: 'link', href: '#/writings' }, 'Open Writings →')
            )
          ),
          tab === 'blogs' && (
            React.createElement('div', { className: 'tab-panel' },
              React.createElement('p', { className: 'subtle' }, 'Occasional blog posts and updates.'),
              React.createElement('a', { className: 'link', href: '#/blogs' }, 'Open Blogs →')
            )
          )
        ),
        React.createElement('div', { className: 'cards-grid' },
          latest.map(e => (
            React.createElement('div', { key: e.id, className: 'writing-card' },
              React.createElement('h3', null, e.title),
              React.createElement('p', null, e.excerpt),
              React.createElement('a', { href: `#/entry/${e.id}` }, 'Read →')
            )
          ))
        ),
        React.createElement('div', { style: { marginTop: '1rem', textAlign: 'center' } },
          React.createElement('a', { href: '#/pva-nation', className: 'themeToggle', style: { display: 'inline-block' } }, 'Join PVA Nation')
        )
      )
    );
  }

  function JournalPage() {
    const [tag, setTag] = useState('');
    const [category, setCategory] = useState('');
    const [query, setQuery] = useState('');
    const [visible, setVisible] = useState(20);

    const entries = useMemo(() => (window.JOURNAL_ENTRIES || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date)), []);

    const tags = useMemo(() => Array.from(new Set(entries.flatMap(e => e.tags || []))).sort(), [entries]);
    const categories = useMemo(() => Array.from(new Set(entries.map(e => e.category).filter(Boolean))).sort(), [entries]);

    const filtered = useMemo(() => {
      return entries.filter(e => {
        const matchesTag = !tag || (e.tags || []).includes(tag);
        const matchesCat = !category || e.category === category;
        const q = query.trim().toLowerCase();
        const matchesQuery = !q || [e.title, e.excerpt, e.content].some(t => String(t).toLowerCase().includes(q));
        return matchesTag && matchesCat && matchesQuery;
      });
    }, [entries, tag, category, query]);

    useEffect(() => { setVisible(20); }, [tag, category, query]);
    const visibleItems = filtered.slice(0, visible);

    return (
      React.createElement('section', { className: 'journalPage' },
        React.createElement('div', { className: 'journalPage__controls' },
          React.createElement('select', { className: 'select', value: category, onChange: e => setCategory(e.target.value), 'aria-label': 'Filter by category' },
            React.createElement('option', { value: '' }, 'All Categories'),
            categories.map(c => React.createElement('option', { key: c, value: c }, c))
          ),
          React.createElement('select', { className: 'select', value: tag, onChange: e => setTag(e.target.value), 'aria-label': 'Filter by tag' },
            React.createElement('option', { value: '' }, 'All Tags'),
            tags.map(t => React.createElement('option', { key: t, value: t }, t))
          ),
          React.createElement('input', { className: 'input', placeholder: 'Filter…', value: query, onChange: e => setQuery(e.target.value) })
        ),
        React.createElement('div', { className: 'journalPage__list' },
          visibleItems.map(e => (
            React.createElement('article', { key: e.id, className: 'journalCard card' },
              React.createElement('div', { className: 'card__body' },
                React.createElement('div', { className: 'journalCard__header' },
                  React.createElement('div', { className: 'journalCard__title' }, e.title),
                  React.createElement('div', { className: 'journalCard__meta' }, formatDate(e.date), e.location ? ` · ${e.location}` : '')
                ),
                React.createElement('p', { className: 'journalCard__excerpt' }, e.excerpt),
                React.createElement('div', { className: 'journalCard__tags' }, (e.tags || []).map(t => React.createElement('span', { key: t, className: 'badge' }, t))),
                React.createElement('a', { className: 'link', href: `#/entry/${e.id}` }, 'Read →')
              )
            )
          )),
        filtered.length > visible ? React.createElement('div', { style: { marginTop: 12 } },
          React.createElement('button', { className: 'themeToggle', onClick: () => setVisible(v => v + 20) }, 'Load more')
        ) : null
        )
      )
    );
  }

  function JournalsPage() {
    const entries = useMemo(() => (window.JOURNAL_ENTRIES || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date)), []);
    return (
      React.createElement('section', { className: 'journalsPage card' },
        React.createElement('div', { className: 'card__body' },
          React.createElement('h1', null, 'Journals'),
          React.createElement('p', { className: 'subtle' }, 'Personal chronicles and reflections.'),
          React.createElement('ul', { className: 'list' },
            entries.map(e => (
              React.createElement('li', { key: e.id, className: 'list__item' },
                React.createElement('a', { href: `#/entry/${e.id}` }, `${formatDate(e.date)}: ${e.title}`),
                React.createElement('span', { className: 'subtle', style: { marginLeft: 8 } }, e.excerpt)
              )
            ))
          ),
          React.createElement('div', { style: { marginTop: '1rem' } },
            React.createElement('a', { className: 'link', href: '#/admin/new-journal' }, 'Add New Journal →')
          )
        )
      )
    );
  }

  function WritingsPage() {
    const [list, setList] = React.useState([
      { id: 'w-1', title: 'On Clarity and Craft', date: '2025-08-20', excerpt: 'Notes on writing cleanly and honestly.', category: 'Essay' },
      { id: 'w-2', title: 'Smallness as Strength', date: '2025-06-05', excerpt: 'Choosing constraints to move faster.', category: 'Essay' },
      { id: 'w-3', title: 'Letters to the Future', date: '2025-02-10', excerpt: 'A short manifesto for documenting life.', category: 'Manifesto' }
    ]);
    React.useEffect(() => {
      (async () => {
        try {
          const res = await apiFetch('/api/pages/writings');
          if (res.ok) {
            const page = await res.json();
            if (page && page.content) {
              setList(prev => [{ id: 'w-backend', title: page.title || 'Writings', date: new Date().toISOString().slice(0,10), excerpt: (page.content || '').slice(0, 180), category: 'Backend' }, ...prev]);
            }
          }
        } catch (_) {}
      })();
    }, []);
    const [category, setCategory] = React.useState('');
    const categories = React.useMemo(() => Array.from(new Set(list.map(e => e.category))).sort(), [list]);
    const filtered = React.useMemo(() => list.filter(e => !category || e.category === category), [list, category]);

    return (
      React.createElement('section', { className: 'card' },
        React.createElement('div', { className: 'card__body' },
          React.createElement('h1', null, 'Writings'),
          React.createElement('div', { className: 'journalPage__controls', style: { marginBottom: 12 } },
            React.createElement('select', { className: 'select', value: category, onChange: e => setCategory(e.target.value), 'aria-label': 'Filter by category' },
              React.createElement('option', { value: '' }, 'All Categories'),
              categories.map(c => React.createElement('option', { key: c, value: c }, c))
            )
          ),
          React.createElement('ul', { className: 'list' },
            filtered.map(e => React.createElement('li', { key: e.id, className: 'list__item' }, `${formatDate(e.date)} · ${e.title} — ${e.excerpt}`))
          )
        )
      )
    );
  }

  function BlogsPage() {
    const [list, setList] = React.useState([
      { id: 'b-1', title: 'Site Updates — December', date: '2025-12-28', excerpt: 'UI refresh and deploy improvements.', category: 'Update' },
      { id: 'b-2', title: 'On Journaling Daily', date: '2025-11-15', excerpt: 'Habits that stick.', category: 'Thoughts' }
    ]);
    React.useEffect(() => {
      (async () => {
        try {
          const res = await apiFetch('/api/blogs');
          if (res.ok) {
            const data = await res.json();
            if (data && data.ok && Array.isArray(data.blogs)) {
              const mapped = data.blogs.map(b => ({ id: b.slug, title: b.title, date: (b.updatedAt || new Date().toISOString()).slice(0,10), excerpt: '', category: 'Blog' }));
              setList(prev => mapped.length ? mapped : prev);
            }
          }
        } catch (_) {}
      })();
    }, []);
    const [category, setCategory] = React.useState('');
    const categories = React.useMemo(() => Array.from(new Set(list.map(e => e.category))).sort(), [list]);
    const filtered = React.useMemo(() => list.filter(e => !category || e.category === category), [list, category]);

    return (
      React.createElement('section', { className: 'card' },
        React.createElement('div', { className: 'card__body' },
          React.createElement('h1', null, 'Blogs'),
          React.createElement('div', { className: 'journalPage__controls', style: { marginBottom: 12 } },
            React.createElement('select', { className: 'select', value: category, onChange: e => setCategory(e.target.value), 'aria-label': 'Filter by category' },
              React.createElement('option', { value: '' }, 'All Categories'),
              categories.map(c => React.createElement('option', { key: c, value: c }, c))
            )
          ),
          React.createElement('ul', { className: 'list' },
            filtered.map(e => React.createElement('li', { key: e.id, className: 'list__item' },
              React.createElement('a', { href: `#/blog/${e.id}` }, `${formatDate(e.date)} · ${e.title}`),
              e.excerpt ? ` — ${e.excerpt}` : ''
            ))
          )
        )
      )
    );
  }

  function BlogDetailPage() {
    const { slug } = useParams();
    const [state, setState] = useState({ loading: true, blog: null, comments: [] });
    useEffect(() => {
      (async () => {
        try {
          const res = await apiFetch(`/api/blogs/${encodeURIComponent(slug)}`);
          const json = await res.json();
          if (res.ok && json && json.ok) {
            setState({ loading: false, blog: json.blog, comments: json.comments || [] });
          } else {
            setState({ loading: false, blog: null, comments: [] });
          }
        } catch (_) {
          setState({ loading: false, blog: null, comments: [] });
        }
      })();
    }, [slug]);
    if (state.loading) return React.createElement('div', null, 'Loading...');
    if (!state.blog) return React.createElement('div', null, 'Blog not found.');
    return (
      React.createElement('section', { className: 'card' },
        React.createElement('div', { className: 'card__body' },
          React.createElement('h1', null, state.blog.title || state.blog.slug),
          React.createElement('div', { className: 'subtle', style: { marginBottom: 8 } }, (state.blog.updatedAt || '').slice(0,10)),
          React.createElement('div', { className: 'entryPage__content', dangerouslySetInnerHTML: { __html: state.blog.content || '' } }),
          React.createElement('div', { style: { marginTop: 12, display: 'flex', gap: 12 } },
            React.createElement('a', { className: 'link', href: `#/blog/${slug}/edit` }, 'Edit →'),
            React.createElement('a', { className: 'link', href: `#/blog/${slug}/publish` }, 'Publish →')
          ),
          React.createElement('h3', { style: { marginTop: 16 } }, 'Comments'),
          React.createElement('ul', { className: 'list' },
            (state.comments || []).map((c, i) => React.createElement('li', { key: i, className: 'list__item' }, c.content || c.text || ''))
          )
        )
      )
    );
  }

  function BlogEditorPage() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [editSecret, setEditSecret] = useState(localStorage.getItem('blog:editSecret:' + slug) || '');
    const [status, setStatus] = useState('');
    useEffect(() => {
      (async () => {
        try {
          const res = await apiFetch(`/api/blogs/${encodeURIComponent(slug)}`);
          const json = await res.json();
          if (res.ok && json && json.ok) {
            setTitle(json.blog.title || slug);
            setContent(json.blog.content || '');
          }
        } catch (_) {}
      })();
    }, [slug]);
    async function save(e) {
      e.preventDefault(); setStatus('');
      try {
        const res = await apiFetch(`/api/blogs/${encodeURIComponent(slug)}/update`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ edit: editSecret, title, content })
        });
        const json = await res.json();
        if (res.ok && json && json.ok) {
          localStorage.setItem('blog:editSecret:' + slug, editSecret);
          setStatus('Saved');
          navigate('/blog/' + slug);
        } else {
          setStatus(json?.message || 'Save failed');
        }
      } catch (_) { setStatus('Save failed'); }
    }
    return (
      React.createElement('section', { className: 'card' },
        React.createElement('div', { className: 'card__body' },
          React.createElement('h1', null, 'Edit Blog'),
          React.createElement('form', { onSubmit: save, className: 'form' },
            React.createElement('label', { className: 'label' }, 'Edit Secret', React.createElement('input', { className: 'input', value: editSecret, onChange: e => setEditSecret(e.target.value) })),
            React.createElement('label', { className: 'label' }, 'Title', React.createElement('input', { className: 'input', value: title, onChange: e => setTitle(e.target.value) })),
            React.createElement('label', { className: 'label' }, 'Content', React.createElement('textarea', { className: 'textarea', rows: 12, value: content, onChange: e => setContent(e.target.value) })),
            React.createElement('div', { className: 'form__actions' },
              React.createElement('button', { className: 'themeToggle', type: 'submit' }, 'Save')
            ),
            React.createElement('div', { className: 'subtle', style: { marginTop: 8 } }, status)
          )
        )
      )
    );
  }

  function BlogPublishPage() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [secret, setSecret] = useState(localStorage.getItem('admin:secret') || '');
    const [status, setStatus] = useState('');
    async function publish(e) {
      e.preventDefault(); setStatus('');
      try {
        const res = await apiFetch(`/api/blogs/${encodeURIComponent(slug)}/publish`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret })
        });
        const json = await res.json();
        if (res.ok && json && json.ok) {
          localStorage.setItem('admin:secret', secret);
          setStatus('Published');
          navigate('/blog/' + slug);
        } else {
          setStatus(json?.message || 'Publish failed');
        }
      } catch (_) { setStatus('Publish failed'); }
    }
    return (
      React.createElement('section', { className: 'card' },
        React.createElement('div', { className: 'card__body' },
          React.createElement('h1', null, 'Publish Blog'),
          React.createElement('form', { onSubmit: publish, className: 'form' },
            React.createElement('label', { className: 'label' }, 'Admin Secret', React.createElement('input', { className: 'input', value: secret, onChange: e => setSecret(e.target.value) })),
            React.createElement('div', { className: 'form__actions' }, React.createElement('button', { className: 'themeToggle', type: 'submit' }, 'Publish')),
            React.createElement('div', { className: 'subtle', style: { marginTop: 8 } }, status)
          )
        )
      )
    );
  }

  function WalletConnect() {
    const [account, setAccount] = useState('');
    async function connect() {
      if (!window.ethereum) { alert('MetaMask not detected'); return; }
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0] || '');
      } catch (e) { console.error(e); alert('Wallet connection failed'); }
    }
    return React.createElement('div', { className: 'card', style: { marginTop: 12 } },
      React.createElement('div', { className: 'card__body' },
        React.createElement('div', null, account ? `Connected: ${account}` : 'Not connected'),
        React.createElement('button', { className: 'themeToggle', onClick: connect }, account ? 'Reconnect' : 'Connect Wallet')
      )
    );
  }

  function MermaidBlock({ code }) {
    const ref = React.useRef(null);
    useEffect(() => {
      (async () => {
        try {
          await loadScript('https://unpkg.com/mermaid@10/dist/mermaid.min.js');
          if (window.mermaid) {
            window.mermaid.initialize({ startOnLoad: false });
            const id = 'mermaid-' + Math.random().toString(36).slice(2);
            const svg = await window.mermaid.render(id, code);
            if (ref.current) ref.current.innerHTML = svg;
          }
        } catch (e) { console.error('Mermaid load/render failed', e); }
      })();
    }, [code]);
    return React.createElement('div', { ref, className: 'surface pad' });
  }

  function MarketplacePage() {
    const sampleDiagram = 'flowchart LR; Fiat-->Gateway; Crypto-->Gateway; PVA-->Gateway; Gateway-->Settlement;';
    function pay(kind) { alert(`Initiate ${kind} payment (stub)`); }
    const [stats, setStats] = useState(null);
    const [cats, setCats] = useState([]);
    const [crypto, setCrypto] = useState(null);
    useEffect(() => {
      (async () => {
        try {
          const s = await apiFetch('/api/market/stats');
          if (s.ok) { const j = await s.json(); setStats(j); }
        } catch {}
        try {
          const c = await apiFetch('/api/market/categories/counts');
          if (c.ok) { const j = await c.json(); setCats(Array.isArray(j?.counts) ? j.counts : []); }
        } catch {}
        try {
          const k = await apiFetch('/api/market/crypto?symbol=ETH');
          if (k.ok) { const j = await k.json(); setCrypto(j); }
        } catch {}
      })();
    }, []);
    return (
      React.createElement('section', { className: 'card' },
        React.createElement('div', { className: 'card__body' },
          React.createElement('h1', null, 'Decentralized Ideas Exchange — Marketplace'),
          React.createElement('p', null, 'Trade recipes, NFTs, shares, and provenance.'),
          React.createElement('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 } },
            React.createElement('button', { onClick: () => pay('Fiat (Stripe)') }, 'Pay (Fiat)'),
            React.createElement('button', { onClick: () => pay('Crypto (ETH/BTC)') }, 'Pay (Crypto)'),
            React.createElement('button', { onClick: () => pay('PVA Coin') }, 'Pay (PVA Coin)')
          ),
          React.createElement(WalletConnect, null),
          React.createElement('div', { className: 'surface pad', style: { marginTop: 12 } },
            React.createElement('h3', null, 'Marketplace Stats'),
            stats ? React.createElement('pre', { className: 'subtle' }, JSON.stringify(stats, null, 2)) : React.createElement('div', { className: 'subtle' }, 'Loading stats…')
          ),
          React.createElement('div', { className: 'surface pad', style: { marginTop: 12 } },
            React.createElement('h3', null, 'Categories'),
            cats.length ? React.createElement('ul', { className: 'list' }, cats.map((c, i) => React.createElement('li', { key: i, className: 'list__item' }, `${c.category || c.name || 'Category'} — ${c.count || 0}`))) : React.createElement('div', { className: 'subtle' }, 'Loading categories…')
          ),
          React.createElement('div', { className: 'surface pad', style: { marginTop: 12 } },
            React.createElement('h3', null, 'Crypto Snapshot (ETH)'),
            crypto ? React.createElement('pre', { className: 'subtle' }, JSON.stringify(crypto, null, 2)) : React.createElement('div', { className: 'subtle' }, 'Loading crypto…')
          ),
          React.createElement('h3', { style: { marginTop: 16 } }, 'Settlement Flow'),
          React.createElement(MermaidBlock, { code: sampleDiagram })
        )
      )
    );
  }

  function GalleryPage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
      (async () => {
        try {
          const res = await apiFetch('/api/artifacts?sort=trending&limit=12');
          const json = await res.json();
          if (res.ok && json && json.ok && Array.isArray(json.artifacts)) setItems(json.artifacts);
        } catch (_) {}
        setLoading(false);
      })();
    }, []);
    return (
      React.createElement('section', { className: 'card' },
        React.createElement('div', { className: 'card__body' },
          React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
            React.createElement('h1', null, 'Gallery — Artifacts'),
            React.createElement('a', { className: 'link', href: '#/artifact/new' }, 'Add New Artifact →')
          ),
          loading ? React.createElement('div', { className: 'subtle' }, 'Loading…') :
          React.createElement('div', { className: 'cards-grid' },
            items.map(a => (
              React.createElement('div', { key: a._id, className: 'writing-card' },
                React.createElement('h3', null, React.createElement('a', { href: `#/artifact/${a._id}` }, a.title || a.name || 'Artifact')),
                React.createElement('p', null, a.description || ''),
                React.createElement('div', { className: 'subtle' }, `${a.category || 'General'} · $${a.price || 0}`)
              )
            ))
          )
        )
      )
    );
  }

  function ArtifactDetailPage() {
    const { id } = useParams();
    const [state, setState] = useState({ loading: true, artifact: null });
    useEffect(() => {
      (async () => {
        try {
          const res = await apiFetch('/api/artifacts/' + encodeURIComponent(id));
          const json = await res.json();
          if (res.ok && json && json.ok) setState({ loading: false, artifact: json.artifact });
          else setState({ loading: false, artifact: null });
        } catch (_) { setState({ loading: false, artifact: null }); }
      })();
    }, [id]);
    if (state.loading) return React.createElement('div', null, 'Loading…');
    if (!state.artifact) return React.createElement('div', null, 'Not found');
    const a = state.artifact;
    return (
      React.createElement('section', { className: 'card' },
        React.createElement('div', { className: 'card__body' },
          React.createElement('h1', null, a.title || a.name),
          React.createElement('div', { className: 'subtle' }, `${a.category || 'General'} · $${a.price || 0}`),
          React.createElement('p', null, a.description || ''),
          React.createElement('div', { className: 'surface pad', style: { marginTop: 12 } },
            React.createElement('h3', null, 'Ratings & Crypto Equivalents'),
            React.createElement('ul', { className: 'list' },
              React.createElement('li', { className: 'list__item' }, `Rating: ${a.rating || '—'} (${a.reviewCount || 0} reviews)`),
              React.createElement('li', { className: 'list__item' }, `ETH: ${a.cryptoPrices?.eth || '—'} · BTC: ${a.cryptoPrices?.btc || '—'}`)
            )
          ),
          React.createElement('div', { className: 'surface pad', style: { marginTop: 12 } },
            React.createElement('h3', null, 'Transaction History'),
            React.createElement('ul', { className: 'list' }, (a.transactionHistory || []).map((t, i) => React.createElement('li', { key: i, className: 'list__item' }, `${t.type} — ${(t.date || '').toString().slice(0,10)} — ${t.value}`)))
          )
        )
      )
    );
  }

  function NewArtifactPage() {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [category, setCategory] = useState('');
    const [status, setStatus] = useState('');
    async function submit(e) {
      e.preventDefault(); setStatus('');
      try {
        const res = await apiFetch('/api/artifacts', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, title, description, price, category })
        });
        const json = await res.json();
        if (res.ok && json && json.ok && json.artifact?._id) {
          setStatus('Created');
          navigate('/artifact/' + json.artifact._id);
        } else {
          // Dev-friendly fallback: store locally and show as pending
          const pending = JSON.parse(localStorage.getItem('gallery:pending') || '[]');
          const id = 'pending-' + Date.now();
          pending.unshift({ _id: id, name, title, description, price, category });
          localStorage.setItem('gallery:pending', JSON.stringify(pending));
          setStatus('Saved locally (dev)');
          navigate('/gallery');
        }
      } catch (_) {
        setStatus('Failed to create');
      }
    }
    return (
      React.createElement('section', { className: 'card' },
        React.createElement('div', { className: 'card__body' },
          React.createElement('h1', null, 'New Artifact'),
          React.createElement('form', { onSubmit: submit, className: 'form' },
            React.createElement('label', { className: 'label' }, 'Name', React.createElement('input', { className: 'input', value: name, onChange: e => setName(e.target.value) })),
            React.createElement('label', { className: 'label' }, 'Title', React.createElement('input', { className: 'input', value: title, onChange: e => setTitle(e.target.value) })),
            React.createElement('label', { className: 'label' }, 'Description', React.createElement('textarea', { className: 'textarea', rows: 8, value: description, onChange: e => setDescription(e.target.value) })),
            React.createElement('label', { className: 'label' }, 'Price', React.createElement('input', { className: 'input', type: 'number', value: price, onChange: e => setPrice(e.target.value) })),
            React.createElement('label', { className: 'label' }, 'Category', React.createElement('input', { className: 'input', value: category, onChange: e => setCategory(e.target.value) })),
            React.createElement('div', { className: 'form__actions' }, React.createElement('button', { className: 'themeToggle', type: 'submit' }, 'Create')),
            React.createElement('div', { className: 'subtle', style: { marginTop: 8 } }, status)
          )
        )
      )
    );
  }

  function PvaFoodPage() {
    const recipes = [
      { title: 'Onion & Banana Juice', notes: 'Energizing blend, ancient practice.' },
      { title: 'Ashwagandha Cheese', notes: 'Wellness-focused creation.' },
      { title: 'Nori Crackers', notes: 'Mineral-rich snack.' }
    ];
    return (
      React.createElement('section', { className: 'card' },
        React.createElement('div', { className: 'card__body' },
          React.createElement('h1', null, 'PVA Food & Ancient Wellness'),
          React.createElement('ul', { className: 'list' },
            recipes.map((r, i) => React.createElement('li', { key: i, className: 'list__item' }, `${r.title} — ${r.notes}`))
          )
        )
      )
    );
  }

  function PvaNationPage() {
    const tiers = ['Resident', 'Citizen', 'Patron'];
    return (
      React.createElement('section', { className: 'card' },
        React.createElement('div', { className: 'card__body' },
          React.createElement('h1', null, 'PVA Nation — Citizenship'),
          React.createElement('p', null, 'Join tiers and participate in the treasury and game loop.'),
          React.createElement('ul', { className: 'list' }, tiers.map(t => React.createElement('li', { key: t }, t)))
        )
      )
    );
  }

  function PartnersPage() {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    async function submit(e) {
      e.preventDefault();
      try {
        await apiFetch('/api/partners', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, name }) });
        alert('Submitted! (stub — integrate backend)');
      } catch (err) { console.error(err); alert('Submission failed'); }
    }
    return (
      React.createElement('section', { className: 'card' },
        React.createElement('div', { className: 'card__body' },
          React.createElement('h1', null, 'Local Business Partners'),
          React.createElement('form', { onSubmit: submit, className: 'form' },
            React.createElement('label', { className: 'label' }, 'Business Name', React.createElement('input', { className: 'input', value: name, onChange: e => setName(e.target.value) })),
            React.createElement('label', { className: 'label' }, 'Email', React.createElement('input', { className: 'input', type: 'email', value: email, onChange: e => setEmail(e.target.value) })),
            React.createElement('div', { className: 'form__actions' }, React.createElement('button', { className: 'themeToggle', type: 'submit' }, 'Submit'))
          )
        )
      )
    );
  }

  function AdminDashboard() {
    const canvasRef = React.useRef(null);
    const [status, setStatus] = React.useState('');
    const [apiBase, setApiBase] = React.useState(() => localStorage.getItem('api:base') || '');
    const [health, setHealth] = React.useState(null);
    const [corsOrigin, setCorsOrigin] = React.useState('');
    const [blogsInfo, setBlogsInfo] = React.useState(null);
    const [artifactsInfo, setArtifactsInfo] = React.useState(null);
    function saveApiBase() { localStorage.setItem('api:base', apiBase.trim()); setStatus('API base saved'); }
    function clearApiBase() { localStorage.removeItem('api:base'); setApiBase(''); setStatus('API base cleared'); }
    async function checkStatus() {
      try {
        const token = localStorage.getItem('admin:token') || '';
        let res = await apiFetch('/api/admin/status', { headers: token ? { Authorization: 'Bearer ' + token } : {} });
        if (res.status === 401 || res.status === 403) {
          const secret = prompt('Enter admin secret (dev only)');
          if (!secret) return alert('No secret provided');
          const tRes = await apiFetch('/api/dev/token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret }) });
          const tJson = await tRes.json();
          if (!tRes.ok || !tJson.token) return alert('Failed to obtain dev token');
          localStorage.setItem('admin:token', tJson.token);
          res = await apiFetch('/api/admin/status', { headers: { Authorization: 'Bearer ' + tJson.token } });
        }
        const json = await res.json();
        setStatus(res.ok && json.ok ? 'Admin OK' : 'Access denied');
      } catch (e) {
        console.error(e);
        setStatus('Error checking status');
      }
    }

    async function checkHealth() {
      try {
        const res = await apiFetch('/api/health', { method: 'GET' });
        const origin = res.headers ? (res.headers.get('access-control-allow-origin') || '') : '';
        setCorsOrigin(origin);
        const json = await res.json();
        setHealth({ ok: res.ok, status: res.status, json });
      } catch (e) {
        console.error('Health check failed:', e);
        setHealth({ ok: false, status: 0, json: { error: 'Fetch blocked (likely CORS) or network error' } });
        setCorsOrigin('');
      }
    }

    async function checkBlogs() {
      try {
        const res = await apiFetch('/api/blogs', { method: 'GET' });
        const json = await res.json().catch(() => ({}));
        setBlogsInfo({ ok: res.ok, status: res.status, count: Array.isArray(json) ? json.length : 0 });
      } catch (e) {
        console.error('Blogs check failed:', e);
        setBlogsInfo({ ok: false, status: 0, count: 0 });
      }
    }

    async function checkArtifacts() {
      try {
        const res = await apiFetch('/api/artifacts', { method: 'GET' });
        const json = await res.json().catch(() => ({}));
        const count = Array.isArray(json) ? json.length : (Array.isArray(json?.items) ? json.items.length : 0);
        setArtifactsInfo({ ok: res.ok, status: res.status, count });
      } catch (e) {
        console.error('Artifacts check failed:', e);
        setArtifactsInfo({ ok: false, status: 0, count: 0 });
      }
    }
    async function preview3D() {
      try {
        await loadScript('https://unpkg.com/three@0.157.0/build/three.min.js');
        const THREE = window.THREE;
        const canvas = canvasRef.current; if (!canvas) return;
        const renderer = new THREE.WebGLRenderer({ canvas });
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 100); camera.position.z = 3;
        const cube = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshNormalMaterial());
        scene.add(cube);
        function animate(){ cube.rotation.x += 0.01; cube.rotation.y += 0.01; renderer.setSize(300,300); renderer.render(scene, camera); requestAnimationFrame(animate); }
        animate();
      } catch (e) { console.error('Three.js preview failed', e); }
    }
    return (
      React.createElement('section', { className: 'card' },
        React.createElement('div', { className: 'card__body' },
          React.createElement('h1', null, 'Admin Dashboard'),
          React.createElement('p', null, 'Upload 3D models, manage partner contracts (stubs).'),
          React.createElement('div', { className: 'surface pad', style: { marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' } },
            React.createElement('span', { className: 'subtle' }, 'API Base:'),
            React.createElement('input', { className: 'input', style: { flex: '1' }, placeholder: 'e.g., https://api.example.com', value: apiBase, onChange: e => setApiBase(e.target.value) }),
            React.createElement('button', { className: 'themeToggle', onClick: saveApiBase }, 'Save'),
            React.createElement('button', { className: 'themeToggle', onClick: clearApiBase }, 'Clear')
          ),
          React.createElement('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 } },
            React.createElement('button', { className: 'themeToggle', onClick: checkStatus }, 'Check Admin Status'),
            React.createElement('span', { className: 'subtle' }, status)
          ),
          React.createElement('div', { className: 'surface pad', style: { marginBottom: 12 } },
            React.createElement('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
              React.createElement('button', { className: 'themeToggle', onClick: checkHealth }, 'Check API Health'),
              React.createElement('span', { className: 'subtle' }, health ? `Status: ${health.status} (${health.ok ? 'OK' : 'Error'})` : '—')
            ),
            React.createElement('div', { className: 'subtle', style: { marginTop: 6 } }, corsOrigin ? `Access-Control-Allow-Origin: ${corsOrigin}` : '')
          ),
          React.createElement('div', { className: 'surface pad', style: { marginBottom: 12 } },
            React.createElement('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } },
              React.createElement('button', { className: 'themeToggle', onClick: checkBlogs }, 'Check Blogs'),
              React.createElement('span', { className: 'subtle' }, blogsInfo ? `Blogs: ${blogsInfo.count} (HTTP ${blogsInfo.status}, ${blogsInfo.ok ? 'OK' : 'Error'})` : '—'),
              React.createElement('button', { className: 'themeToggle', onClick: checkArtifacts }, 'Check Artifacts'),
              React.createElement('span', { className: 'subtle' }, artifactsInfo ? `Artifacts: ${artifactsInfo.count} (HTTP ${artifactsInfo.status}, ${artifactsInfo.ok ? 'OK' : 'Error'})` : '—')
            )
          ),
          React.createElement('button', { className: 'themeToggle', onClick: preview3D }, 'Preview 3D Cube'),
          React.createElement('div', { style: { marginTop: 12 } }, React.createElement('canvas', { ref: canvasRef, width: 300, height: 300 }))
        )
      )
    );
  }

  function BiographyPage() {
    const [content, setContent] = React.useState('A brief personal profile and timeline. More to come.');
    React.useEffect(() => { (async () => { try { const r = await apiFetch('/api/pages/biography'); if (r.ok) { const p = await r.json(); if (p && p.content) setContent(p.content); } } catch (_) {} })(); }, []);
    return (
      React.createElement('section', { className: 'card' },
        React.createElement('div', { className: 'card__body' },
          React.createElement('h1', null, 'Biography'),
          React.createElement('p', null, content)
        )
      )
    );
  }

  function NovelPage() {
    const [content, setContent] = React.useState('Draft chapters and notes placeholder.');
    React.useEffect(() => { (async () => { try { const r = await apiFetch('/api/pages/novel'); if (r.ok) { const p = await r.json(); if (p && p.content) setContent(p.content); } } catch (_) {} })(); }, []);
    return (
      React.createElement('section', { className: 'card' },
        React.createElement('div', { className: 'card__body' },
          React.createElement('h1', null, 'Novel'),
          React.createElement('p', null, content)
        )
      )
    );
  }

  function ResearchPage() {
    const [content, setContent] = React.useState('Ongoing explorations and references placeholder.');
    React.useEffect(() => { (async () => { try { const r = await apiFetch('/api/pages/research'); if (r.ok) { const p = await r.json(); if (p && p.content) setContent(p.content); } } catch (_) {} })(); }, []);
    return (
      React.createElement('section', { className: 'card' },
        React.createElement('div', { className: 'card__body' },
          React.createElement('h1', null, 'Research'),
          React.createElement('p', null, content)
        )
      )
    );
  }

  function AdminNewJournalPage() {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [content, setContent] = useState('');
    const [tags, setTags] = useState('');

    function onSubmit(e) {
      e.preventDefault();
      const id = `custom-${Date.now()}`;
      const entry = {
        id,
        title: title.trim() || 'Untitled',
        date: date || new Date().toISOString().slice(0,10),
        content: (content || '').replace(/\n/g, '<br/>'),
        excerpt: (content || '').split('\n')[0].slice(0, 180),
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        category: 'Journal'
      };
      try {
        const arr = JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]');
        arr.unshift(entry);
        localStorage.setItem(CUSTOM_KEY, JSON.stringify(arr));
        window.JOURNAL_ENTRIES = (window.JOURNAL_ENTRIES || []).concat([entry]).sort((a, b) => new Date(b.date) - new Date(a.date));
        console.log('New journal submitted:', entry);
        alert('Journal added!');
        navigate(`/entry/${id}`);
      } catch (err) {
        console.error('Failed to save journal entry', err);
        alert('Failed to save journal entry');
      }
    }

    return (
      React.createElement('section', { className: 'adminPage card' },
        React.createElement('div', { className: 'card__body' },
          React.createElement('h1', null, 'Create New Journal Entry'),
          React.createElement('form', { onSubmit: onSubmit, className: 'form' },
            React.createElement('label', { className: 'label' }, 'Title',
              React.createElement('input', { className: 'input', type: 'text', value: title, onChange: e => setTitle(e.target.value) })
            ),
            React.createElement('label', { className: 'label' }, 'Date',
              React.createElement('input', { className: 'input', type: 'date', value: date, onChange: e => setDate(e.target.value) })
            ),
            React.createElement('label', { className: 'label' }, 'Content',
              React.createElement('textarea', { className: 'textarea', rows: 10, value: content, onChange: e => setContent(e.target.value) })
            ),
            React.createElement('label', { className: 'label' }, 'Tags (comma-separated)',
              React.createElement('input', { className: 'input', type: 'text', value: tags, onChange: e => setTags(e.target.value), placeholder: 'e.g., consciousness, wellness' })
            ),
            React.createElement('div', { className: 'form__actions' },
              React.createElement('button', { className: 'themeToggle', type: 'submit' }, 'Submit')
            )
          )
        )
      )
    );
  }

  function EntryDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const entries = useMemo(() => (window.JOURNAL_ENTRIES || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date)), []);
    const idx = entries.findIndex(e => String(e.id) === String(id));
    const entry = entries[idx];

    if (!entry) {
      return React.createElement('div', null, 'Entry not found.');
    }

    const prev = entries[idx - 1];
    const next = entries[idx + 1];

    return (
      React.createElement('article', { className: 'entryPage' },
        React.createElement('header', { className: 'entryPage__header' },
          React.createElement('h1', { className: 'entryPage__title' }, entry.title),
          React.createElement('div', { className: 'entryPage__meta' }, formatDate(entry.date), entry.location ? ` · ${entry.location}` : '', ' · ', (entry.tags || []).map(t => React.createElement('span', { key: t, className: 'badge' }, t)))
        ),
        React.createElement('section', { className: 'entryPage__content', dangerouslySetInnerHTML: { __html: entry.content } }),
        React.createElement('div', { className: 'entryPage__nav' },
          prev ? React.createElement('a', { href: `#/entry/${prev.id}` }, '← Previous') : React.createElement('span'),
          React.createElement('a', { href: '#/journal' }, 'Back to Journal'),
          next ? React.createElement('a', { href: `#/entry/${next.id}` }, 'Next →') : React.createElement('span')
        )
      )
    );
  }

  function AboutPage() {
    return (
      React.createElement('section', { className: 'aboutPage card' },
        React.createElement('div', { className: 'card__body' },
          React.createElement('h1', null, 'About This Journal'),
          React.createElement('p', { className: 'aboutPage__intro' }, 'This is my life in words—personal reflections, travels, thoughts, and observations gathered over time.'),
          React.createElement('img', { className: 'aboutPage__photo', alt: 'Portrait', src: 'https://picsum.photos/200?grayscale' }),
          React.createElement('div', { className: 'aboutPage__section' },
            React.createElement('h3', null, 'Purpose'),
            React.createElement('p', null, 'To document a life honestly and carefully, with respect for the reader and the future.')
          ),
          React.createElement('div', { className: 'aboutPage__section' },
            React.createElement('h3', null, 'Contact'),
            React.createElement('p', null, 'Optional. Add an email or contact form as preferred.')
          )
        )
      )
    );
  }

  function ArchivePage() {
    const entries = useMemo(() => (window.JOURNAL_ENTRIES || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date)), []);
    const byYear = useMemo(() => {
      const m = new Map();
      for (const e of entries) {
        const y = new Date(e.date).getFullYear();
        const arr = m.get(y) || []; arr.push(e); m.set(y, arr);
      }
      return Array.from(m.entries()).sort((a,b) => b[0]-a[0]);
    }, [entries]);

    return (
      React.createElement('section', { className: 'archivePage' },
        React.createElement('h1', null, 'Archive'),
        byYear.map(([year, list]) => (
          React.createElement('div', { key: year, className: 'card' },
            React.createElement('div', { className: 'card__body' },
              React.createElement('h3', null, year),
              list.map(e => React.createElement('div', { key: e.id }, `${formatDate(e.date)} · ${e.title}`))
            )
          )
        ))
      )
    );
  }

  function SearchPage() {
    const params = useSearchParam();
    const initialQ = params.get('q') || '';
    const [q, setQ] = useState(initialQ);
    const [apiHits, setApiHits] = useState([]);
    const entries = useMemo(() => (window.JOURNAL_ENTRIES || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date)), []);

    const hits = useMemo(() => {
      const term = q.trim().toLowerCase();
      if (!term) return [];
      const local = entries.filter(e => [e.title, e.excerpt, e.content].some(t => String(t).toLowerCase().includes(term))).slice(0, 50);
      return local;
    }, [entries, q]);

    React.useEffect(() => {
      (async () => {
        const term = (q || '').trim(); if (!term) { setApiHits([]); return; }
        try {
          const res = await apiFetch('/api/search/text?q=' + encodeURIComponent(term));
          if (res.ok) {
            const data = await res.json();
            if (data && data.success && Array.isArray(data.results)) {
              const mapped = data.results.map(r => ({ id: r._id || r.id || r.slug || Math.random().toString(36).slice(2), title: r.title || r.name || 'Artifact', excerpt: r.description || '', date: new Date().toISOString() }));
              setApiHits(mapped);
            } else setApiHits([]);
          }
        } catch (_) { setApiHits([]); }
      })();
    }, [q]);

    return (
      React.createElement('section', { className: 'searchPage' },
        React.createElement('div', { className: 'searchPage__bar' },
          React.createElement('input', { className: 'input', value: q, onChange: e => setQ(e.target.value), placeholder: 'Search…', 'aria-label': 'Search term' })
        ),
        React.createElement('div', { className: 'searchPage__results' },
          (apiHits.length ? apiHits : hits).map(e => (
            React.createElement('article', { key: e.id, className: 'searchHit card' },
              React.createElement('div', { className: 'card__body' },
                React.createElement('div', { className: 'journalCard__header' },
                  React.createElement('div', { className: 'journalCard__title' }, e.title),
                  React.createElement('div', { className: 'journalCard__meta' }, e.date ? formatDate(e.date) : '')
                ),
                React.createElement('p', { className: 'searchHit__excerpt', dangerouslySetInnerHTML: { __html: highlight(e.excerpt || '', q) } })
              )
            )
          ))
        )
      )
    );
  }

  function App() {
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();
    useEffect(() => { if (searchTerm) navigate(`/search?q=${encodeURIComponent(searchTerm)}`); }, [searchTerm]);

    return (
      React.createElement(Layout, { onSearch: setSearchTerm, searchTerm },
        React.createElement(Routes, null,
          React.createElement(Route, { path: '/', element: React.createElement(HomePage) }),
          React.createElement(Route, { path: '/journal', element: React.createElement(JournalPage) }),
          React.createElement(Route, { path: '/journals', element: React.createElement(JournalsPage) }),
          React.createElement(Route, { path: '/entry/:id', element: React.createElement(EntryDetail) }),
          React.createElement(Route, { path: '/archive', element: React.createElement(ArchivePage) }),
          React.createElement(Route, { path: '/about', element: React.createElement(AboutPage) }),
          React.createElement(Route, { path: '/search', element: React.createElement(SearchPage) }),
          React.createElement(Route, { path: '/admin/new-journal', element: React.createElement(AdminNewJournalPage) }),
          React.createElement(Route, { path: '/writings', element: React.createElement(WritingsPage) }),
          React.createElement(Route, { path: '/blogs', element: React.createElement(BlogsPage) }),
          React.createElement(Route, { path: '/blog/:slug', element: React.createElement(BlogDetailPage) }),
          React.createElement(Route, { path: '/blog/:slug/edit', element: React.createElement(BlogEditorPage) }),
          React.createElement(Route, { path: '/blog/:slug/publish', element: React.createElement(BlogPublishPage) }),
          React.createElement(Route, { path: '/gallery', element: React.createElement(GalleryPage) }),
          React.createElement(Route, { path: '/artifact/:id', element: React.createElement(ArtifactDetailPage) }),
          React.createElement(Route, { path: '/artifact/new', element: React.createElement(NewArtifactPage) }),
          React.createElement(Route, { path: '/biography', element: React.createElement(BiographyPage) }),
          React.createElement(Route, { path: '/novel', element: React.createElement(NovelPage) }),
          React.createElement(Route, { path: '/research', element: React.createElement(ResearchPage) }),
          React.createElement(Route, { path: '/marketplace', element: React.createElement(MarketplacePage) }),
          React.createElement(Route, { path: '/pva-food', element: React.createElement(PvaFoodPage) }),
          React.createElement(Route, { path: '/pva-nation', element: React.createElement(PvaNationPage) }),
          React.createElement(Route, { path: '/partners', element: React.createElement(PartnersPage) }),
          React.createElement(Route, { path: '/admin', element: React.createElement(AdminDashboard) }),
        )
      )
    );
  }

  function mount() {
    const rootEl = document.getElementById('root');
    const root = createRoot(rootEl);
    root.render(React.createElement(HashRouter, null, React.createElement(App)));
  }

  document.addEventListener('DOMContentLoaded', mount);
})();
