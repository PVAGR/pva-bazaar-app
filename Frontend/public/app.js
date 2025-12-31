// pvabazaar.org Journal SPA (CDN React + HashRouter)
(function(){
  const { useState, useMemo, useEffect } = React;
  const { createRoot } = ReactDOM;
  const { HashRouter, Routes, Route, NavLink, useParams, useNavigate, useLocation } = ReactRouterDOM;

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
              React.createElement(NavLink, { to: '/archive' }, 'Archive'),
              React.createElement(NavLink, { to: '/about' }, 'About'),
              React.createElement(NavLink, { to: '/search' }, 'Search'),
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
    return (
      React.createElement('section', { className: 'homePage' },
        React.createElement('div', { className: 'homePage__hero card' },
          React.createElement('div', { className: 'card__body' },
            React.createElement('h1', { className: 'homePage__title' }, 'pvabazaar.org'),
            React.createElement('p', { className: 'homePage__subtitle' }, 'A Life in Words — My Personal Journal'),
            React.createElement('div', { className: 'homePage__cta' },
              React.createElement(NavLink, { to: '/journal' }, 'Explore My Story')
            )
          )
        ),
        React.createElement('div', { className: 'homePage__sections grid cols-3' },
          [
            { title: 'Latest Entries', desc: 'Read recent thoughts and reflections.', link: '#/journal' },
            { title: 'Archive', desc: 'Browse by year and category.', link: '#/archive' },
            { title: 'About', desc: 'Why this journal exists.', link: '#/about' },
          ].map((s, i) => (
            React.createElement('div', { key: i, className: 'card' },
              React.createElement('div', { className: 'card__body' },
                React.createElement('h3', null, s.title),
                React.createElement('p', null, s.desc),
                React.createElement('a', { className: 'link', href: s.link }, 'Open →')
              )
            )
          ))
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
    const entries = useMemo(() => (window.JOURNAL_ENTRIES || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date)), []);

    const hits = useMemo(() => {
      const term = q.trim().toLowerCase();
      if (!term) return [];
      return entries.filter(e => [e.title, e.excerpt, e.content].some(t => String(t).toLowerCase().includes(term))).slice(0, 50);
    }, [entries, q]);

    return (
      React.createElement('section', { className: 'searchPage' },
        React.createElement('div', { className: 'searchPage__bar' },
          React.createElement('input', { className: 'input', value: q, onChange: e => setQ(e.target.value), placeholder: 'Search…', 'aria-label': 'Search term' })
        ),
        React.createElement('div', { className: 'searchPage__results' },
          hits.map(e => (
            React.createElement('article', { key: e.id, className: 'searchHit card' },
              React.createElement('div', { className: 'card__body' },
                React.createElement('div', { className: 'journalCard__header' },
                  React.createElement('div', { className: 'journalCard__title' }, e.title),
                  React.createElement('div', { className: 'journalCard__meta' }, formatDate(e.date), e.location ? ` · ${e.location}` : '')
                ),
                React.createElement('p', { className: 'searchHit__excerpt', dangerouslySetInnerHTML: { __html: highlight(e.excerpt, q) } }),
                React.createElement('a', { className: 'link', href: `#/entry/${e.id}` }, 'Read →')
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
          React.createElement(Route, { path: '/entry/:id', element: React.createElement(EntryDetail) }),
          React.createElement(Route, { path: '/archive', element: React.createElement(ArchivePage) }),
          React.createElement(Route, { path: '/about', element: React.createElement(AboutPage) }),
          React.createElement(Route, { path: '/search', element: React.createElement(SearchPage) }),
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
