// pvabazaar.org Journal SPA (CDN React + HashRouter)
(function(){
  const { useState, useMemo, useEffect } = React;
  const { createRoot } = ReactDOM;
  const { HashRouter, Routes, Route, NavLink, useParams, useNavigate, useLocation } = ReactRouterDOM;

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
    const latest = entries.slice(0, 6);

    return (
      React.createElement('section', { className: 'homePage' },
        React.createElement('div', { className: 'homePage__hero' },
          React.createElement('div', { className: 'tabs', role: 'tablist' },
            React.createElement('button', { className: 'tab', role: 'tab', 'aria-selected': tab === 'journal', onClick: () => setTab('journal') }, 'Journal'),
            React.createElement('button', { className: 'tab', role: 'tab', 'aria-selected': tab === 'archive', onClick: () => setTab('archive') }, 'Archive'),
            React.createElement('button', { className: 'tab', role: 'tab', 'aria-selected': tab === 'about', onClick: () => setTab('about') }, 'About')
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
                )),
              React.createElement('div', { style: { marginTop: '0.5rem' } },
                React.createElement('a', { className: 'link', href: '#/journal' }, 'View all entries →')
              )
            )
          ),
          tab === 'archive' && (
            React.createElement('div', { className: 'tab-panel' },
              React.createElement('p', { className: 'subtle' }, 'Browse by year and category.'),
              React.createElement('a', { className: 'link', href: '#/archive' }, 'Open Archive →')
            )
          ),
          tab === 'about' && (
            React.createElement('div', { className: 'tab-panel' },
              React.createElement('h2', null, 'pvabazaar.org — A Life in Words'),
              React.createElement('p', null, 'Personal reflections, travels, thoughts, and observations.'),
              React.createElement('a', { className: 'link', href: '#/about' }, 'Read About →')
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
          React.createElement(Route, { path: '/journals', element: React.createElement(JournalsPage) }),
          React.createElement(Route, { path: '/entry/:id', element: React.createElement(EntryDetail) }),
          React.createElement(Route, { path: '/archive', element: React.createElement(ArchivePage) }),
          React.createElement(Route, { path: '/about', element: React.createElement(AboutPage) }),
          React.createElement(Route, { path: '/search', element: React.createElement(SearchPage) }),
          React.createElement(Route, { path: '/admin/new-journal', element: React.createElement(AdminNewJournalPage) }),
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
