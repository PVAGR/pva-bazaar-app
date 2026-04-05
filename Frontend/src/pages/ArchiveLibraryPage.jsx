import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
// Helper to build canonical URLs
function getCanonicalUrl(path = '') {
  const base = 'https://pvabazaar.org';
  return base + (path.startsWith('/') ? path : '/' + path);
}
import { Link } from 'react-router-dom';
import { fetchArchiveEntries } from '../lib/api';
import useArchiveTheme from '../hooks/useArchiveTheme.js';
import './ArchiveLibraryPage.css';

const archiveEntries = [
  {
    id: 'master-index',
    title: 'Archive Master Index',
    file: 'ARCHIVE_MASTER_INDEX.md',
    category: 'Index',
    description: 'Complete catalog of all 40+ works across 12 categories',
    wordCount: '2,000',
    priority: 1,
  },
  {
    id: 'man-from-taured-1',
    title: 'The Man from Taured - Part 1',
    file: 'Archive-Entry-001-Man-From-Taured-Part-1.md',
    category: 'Fiction',
    description: 'Science fiction novel - Chapters 1-6',
    wordCount: '18,000',
    priority: 2,
  },
  {
    id: 'man-from-taured-2',
    title: 'The Man from Taured - Part 2',
    file: 'Archive-Entry-002-Man-From-Taured-Part-2.md',
    category: 'Fiction',
    description: 'Science fiction novel - Chapters 7-12',
    wordCount: '15,000',
    priority: 2,
  },
  {
    id: 'asha-vs-druj',
    title: 'Spiritual Core: Asha vs Druj',
    file: 'Archive-Entry-003-Spiritual-Core-Asha-vs-Druj.md',
    category: 'Spiritual',
    description: 'Fundamental philosophy and duality framework',
    wordCount: '4,000',
    priority: 3,
  },
  {
    id: 'divine-connection',
    title: 'Divine Connection & Consciousness',
    file: 'Archive-Entry-004-Divine-Connection-Consciousness.md',
    category: 'Spiritual',
    description: 'Mystical practices and consciousness access',
    wordCount: '4,000',
    priority: 3,
  },
  {
    id: 'distributed-flame',
    title: 'The Distributed Flame',
    file: 'Archive-Entry-005-The-Distributed-Flame.md',
    category: 'Spiritual',
    description: 'Distributed enlightenment and soul groups',
    wordCount: '5,000',
    priority: 3,
  },
  {
    id: 'religious-texts',
    title: 'Religious Texts Manipulation',
    file: 'Archive-Entry-006-Religious-Texts-Manipulation.md',
    category: 'Spiritual',
    description: 'Analysis of how sacred texts were corrupted',
    wordCount: '4,500',
    priority: 3,
  },
  {
    id: 'unsettled-soul',
    title: 'The Unsettled Soul & Demiurge',
    file: 'Archive-Entry-007-Unsettled-Soul-Demiurge.md',
    category: 'Spiritual',
    description: 'Demiurge reinterpretation and governance',
    wordCount: '5,500',
    priority: 3,
  },
  {
    id: 'dharmic-quest',
    title: 'The Dharmic Quest',
    file: 'Archive-Entry-008-Dharmic-Quest.md',
    category: 'Spiritual',
    description: 'Life purpose and reincarnation teachings',
    wordCount: '3,500',
    priority: 3,
  },
  {
    id: 'bioharmonic-suit',
    title: 'The Bioharmonic Suit',
    file: 'Archive-Entry-009-Bioharmonic-Suit.md',
    category: 'Technology',
    description: 'Wearable technology for human enhancement',
    wordCount: '6,500',
    priority: 4,
  },
  {
    id: 'vimana-technology',
    title: 'Vimana Technology',
    file: 'Archive-Entry-010-Vimana-Technology.md',
    category: 'Technology',
    description: 'Ancient airship technology reinterpreted',
    wordCount: '6,000',
    priority: 4,
  },
  {
    id: 'pva-bazaar',
    title: 'PVA Bazaar Business Model',
    file: 'Archive-Entry-011-PVA-Bazaar-Business-Model.md',
    category: 'Business',
    description: 'Complete ethical marketplace blueprint',
    wordCount: '7,500',
    priority: 5,
  },
  {
    id: 'hermit-journey',
    title: "The Hermit's Journey",
    file: 'Archive-Entry-012-Hermit-Journey.md',
    category: 'Personal',
    description: 'Personal transformation and awakening',
    wordCount: '5,500',
    priority: 5,
  },
  {
    id: 'simulation-reality',
    title: 'Simulation, Reality & Consciousness',
    file: 'Archive-Entry-013-Simulation-Reality-Consciousness.md',
    category: 'Philosophy',
    description: 'Metaphysical framework and reality nature',
    wordCount: '6,500',
    priority: 5,
  },
  {
    id: 'essays-reflections',
    title: 'Essays & Reflections',
    file: 'Archive-Entry-014-Essays-Reflections.md',
    category: 'Wisdom',
    description: 'Collection of personal growth essays',
    wordCount: '5,500',
    priority: 5,
  },
  {
    id: 'ziggurat-hub',
    title: 'Ziggurat Hub Architecture',
    file: 'Archive-Entry-015-Ziggurat-Hub-Architecture.md',
    category: 'Architecture',
    description: 'Sacred community space blueprint',
    wordCount: '6,500',
    priority: 5,
  },
  {
    id: 'master-integration',
    title: 'Master Integration',
    file: 'Archive-Entry-016-Master-Integration.md',
    category: 'Strategic',
    description: 'Complete vision synthesis and 10-year roadmap',
    wordCount: '10,000',
    priority: 1,
  },
];

const logicSections = [
  {
    id: 'math-properties',
    title: 'Mathematical Properties',
    content: [
      'Integer: 1637',
      'Type: Prime Number (divisible only by 1 and itself)',
      'Binary: 11001100101',
      'Hexadecimal: 665',
      'Factorization: 1637 (Prime)',
      'Significance: No inherent mathematical constant association (e.g., not Pi, e, or Phi derived)',
    ],
  },
  {
    id: 'gematria-analysis',
    title: 'Gematria System Analysis',
    content: [
      'Definition: Gematria assigns numerical values to letters.',
      'Constraint: Multiple phrases can equal the same sum (Hash Collision).',
      'Uniqueness: LOW. A value of 1637 does not map to a single unique word.',
      'Common Cipher Estimates for Value 1637:',
      'Simple Gematria (A=1): Requires phrase length ~15-25 letters (avg value 7-10 per letter).',
      'English Gematria (A=6): 1637 is NOT divisible by 6 (1+6+3+7=17). Result: impossible in standard sixfold English Gematria without non-letter characters.',
      'Atbash Cipher (A<->Z): Values inverted. Sum potential remains similar to Simple/Ordinal.',
      'Hebrew Gematria: 1637 = תשלז (Tav-Shin-Lamed-Zayin). Semantic Meaning: NULL (No standard word formation).',
    ],
  },
  {
    id: 'database-correlation',
    title: 'Database Correlation (Public Registry)',
    content: [
      'Search Query: 1637 Gematria Meaning',
      'Common associations (user-submitted / unverified): THE GREAT RESET, CORONA VIRUS, THE PLANDEMIC (cipher-variant dependent).',
      'Verification Status: LOW CONFIDENCE.',
      'Reason: These associations depend on selective cipher switching (e.g., Atbash + Ordinal + skip codes) to force a match.',
      'Logical Fallacy: Confirmation Bias. Any number can be matched to many phrases with enough variation.',
    ],
  },
  {
    id: 'atbash-logic',
    title: 'Atbash Combined Logic',
    content: [
      'Method: Substitute letters (A=Z, B=Y...) then sum values.',
      'Example: EXAMPLE -> VCZNKOV -> 22+3+26+14+11+15+22 = 113 (Not 1637).',
      'To reach 1637: Requires long phrase length or repeated high-value letters under the chosen mapping.',
    ],
  },
  {
    id: 'risk-assessment',
    title: 'Risk Assessment',
    content: [
      'Assigning singular meaning to 1637 is logically unsound.',
      'Numerology/Gematria is not deterministic science.',
      'Correlation does not imply causation.',
      'Online communities often retrofit meaning to support existing narratives.',
    ],
  },
  {
    id: 'numerology-conclusion',
    title: 'Numerology Conclusion',
    content: [
      '1637 is a prime integer.',
      'In Gematria/Atbash, it is a sum, not a unique identifier.',
      'Many phrases can equal 1637 depending on selected cipher rules.',
      'No canonical or universal meaning is established.',
      'Recommendation: treat as arbitrary numerical data unless a specific key and context are provided.',
    ],
  },
  {
    id: 'fasting-model',
    title: 'Fasting Model (Input-Based Calculation)',
    content: [
      'Current mass: 170 lbs | Target mass: 145 lbs | Delta: -25 lbs',
      'Energy model: 25 x 3,500 = 87,500 kcal deficit.',
      'Theoretical minimum duration: 87,500 / 2,200 = ~40 days.',
      'Adapted duration estimate: ~50-60 days due to metabolic adaptation and lean-mass losses.',
      'Safe-rate benchmark: 1-2 lbs/week; at 1.5 lbs/week, timeline is ~117 days.',
    ],
  },
  {
    id: 'constraints',
    title: 'Constraint Protocols and Safety Notes',
    content: [
      'Extended fasting is medically risky without supervision.',
      'Electrolyte monitoring and refeeding management become critical in prolonged zero-intake scenarios.',
      'Rebound and complications are likely without structured refeed and maintenance planning.',
    ],
  },
  {
    id: 'optimization',
    title: 'Optimal Path Recommendation',
    content: [
      'Higher-probability path: time-restricted eating (e.g., 16:8 or 18:6) with moderate caloric deficit and protein prioritization.',
      'Expected timeline: ~14-20 weeks for the same target shift, with better functional preservation.',
      'Risk-adjusted efficiency from provided model: fasting-only 2.1/10 vs controlled deficit protocol 8.7/10.',
    ],
  },
];

export default function ArchiveLibraryPage() {
  const { darkMode, toggleTheme } = useArchiveTheme();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [markdown, setMarkdown] = useState('');
  const [loading, setLoading] = useState(false);
  const [customEntries, setCustomEntries] = useState([]);
  const [entriesError, setEntriesError] = useState('');
  const [viewMode, setViewMode] = useState('archive'); // 'archive' | 'blog' | 'logic'
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('archive-sidebar-open');
    if (saved === 'true' || saved === 'false') return saved === 'true';
    return window.innerWidth > 1024;
  });

  // Function to load custom entries from API
  const loadCustomEntries = useCallback(async () => {
    setEntriesError('');
    try {
      const result = await fetchArchiveEntries({ limit: 100 });
      if (result.ok && Array.isArray(result.items)) {
        setCustomEntries(result.items);
      } else {
        setCustomEntries([]);
        setEntriesError('Unable to load new posts right now. Please try again.');
      }
    } catch (error) {
      console.error('Failed to load custom entries:', error);
      setCustomEntries([]);
      setEntriesError('Connection issue while loading new posts. Please retry.');
    }
  }, []);

  useEffect(() => {
    loadCustomEntries();
  }, [loadCustomEntries]);

  useEffect(() => {
    if (viewMode !== 'blog') return undefined;

    const interval = setInterval(loadCustomEntries, 30000);
    return () => clearInterval(interval);
  }, [viewMode, loadCustomEntries]);

  useEffect(() => {
    localStorage.setItem('archive-sidebar-open', String(sidebarOpen));
  }, [sidebarOpen]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 1024) {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const categories = ['All', 'Index', 'Fiction', 'Spiritual', 'Technology', 'Business', 'Personal', 'Philosophy', 'Wisdom', 'Architecture', 'Strategic'];
  const isEntryMode = viewMode === 'archive' || viewMode === 'blog';

  // Get entries based on view mode
  const currentEntries = viewMode === 'archive' ? archiveEntries : customEntries;
  
  const filteredEntries =
    !isEntryMode
      ? []
      : selectedCategory === 'All'
      ? currentEntries
      : currentEntries.filter((e) => e.category === selectedCategory);

  const sortedFilteredEntries = [...filteredEntries].sort((a, b) => {
    const ap = Number.isFinite(a.priority) ? a.priority : 999;
    const bp = Number.isFinite(b.priority) ? b.priority : 999;
    if (ap !== bp) return ap - bp;
    return String(a.title || '').localeCompare(String(b.title || ''));
  });

  const loadMarkdown = useCallback(async (entry) => {
    setLoading(true);
    setSelectedEntry(entry);
    if (window.innerWidth <= 1024) {
      setSidebarOpen(false);
    }
    try {
      // Check if it's a custom entry (has content field)
      if (entry.content) {
        setMarkdown(entry.content);
      } else {
        // Load from file for original entries
        const response = await fetch(`/archive/${entry.file}`);
        const text = await response.text();
        setMarkdown(text);
      }
    } catch (error) {
      console.error('Failed to load entry:', error);
      setMarkdown('# Error\n\nFailed to load this archive entry.');
    } finally {
      setLoading(false);
    }
  }, []);

  const getMediaType = (url) => {
    const lower = url.toLowerCase();
    if (/(\.png|\.jpe?g|\.gif|\.webp|\.svg)$/.test(lower)) return 'image';
    if (/(\.mp4|\.webm|\.ogg|\.mov)$/.test(lower)) return 'video';
    if (/(\.mp3|\.wav|\.m4a|\.aac)$/.test(lower)) return 'audio';
    return 'link';
  };

  const renderMediaItem = (url, index) => {
    const type = getMediaType(url);
    if (type === 'image') {
      return (
        <div className="media-item" key={`${url}-${index}`}>
          <img src={url} alt="Entry media" loading="lazy" />
        </div>
      );
    }
    if (type === 'video') {
      return (
        <div className="media-item" key={`${url}-${index}`}>
          <video src={url} controls preload="metadata" />
        </div>
      );
    }
    if (type === 'audio') {
      return (
        <div className="media-item" key={`${url}-${index}`}>
          <audio src={url} controls preload="metadata" />
        </div>
      );
    }
    return (
      <a className="media-link" key={`${url}-${index}`} href={url} target="_blank" rel="noopener">
        {url}
      </a>
    );
  };

  // Convert markdown to simple HTML (basic parser)
  const renderMarkdown = (md) => {
    if (!md) return '';
    
    let html = md
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Images
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      // Lists
      .replace(/^\- (.+)$/gim, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      // Paragraphs
      .split('\n\n')
      .map((para) => {
        if (
          para.startsWith('<h') ||
          para.startsWith('<ul') ||
          para.startsWith('```') ||
          para.trim() === ''
        ) {
          return para;
        }
        return `<p>${para}</p>`;
      })
      .join('\n');

    return html;
  };

  return (
    <>
      <Helmet>
        <title>Archive Library | PVA Bazaar</title>
        <meta name="description" content="Browse the complete PVA Bazaar Archive: 40+ works, 12 categories, 110,000+ words." />
        <meta property="og:title" content="Archive Library | PVA Bazaar" />
        <meta property="og:description" content="Browse the complete PVA Bazaar Archive: 40+ works, 12 categories, 110,000+ words." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={getCanonicalUrl('/archive')} />
        <meta property="og:image" content={getCanonicalUrl('/og-default.jpg')} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content={getCanonicalUrl('/og-default.jpg')} />
      </Helmet>
      <div className={`archive-library ${darkMode ? 'dark-theme' : 'light-theme'}`}>
        <header className="archive-header">
        <div className="header-content">
          <h1>PVA Bazaar Archive Library</h1>
          <div className="header-actions">
            <Link to="/admin" className="admin-link">⚙️ Admin</Link>
            <button 
              className="theme-toggle" 
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>

        <p className="hero-headline">A curated archive of long-form writings, research, and worldbuilding from PVA Bazaar.</p>
        <p className="hero-subheadline">Use one navigation model: choose a mode, choose a category, then open a document.</p>

        <div className="top-destination-tabs" aria-label="Top destinations">
          <Link to="/civilization-library" className="destination-tab">
            Civilization Library
          </Link>
          <Link to="/career-quiz" className="destination-tab">
            Career Quiz
          </Link>
          <Link to="/marketplace" className="destination-tab">
            Marketplace
          </Link>
          <Link to="/showroom" className="destination-tab">
            Showroom
          </Link>
          <Link to="/creator" className="destination-tab">
            Creator Sign Up
          </Link>
        </div>

        <div className="hero-actions">
          <button
            onClick={() => loadMarkdown(archiveEntries[0])}
            className="hero-cta"
          >
            Read Master Index
          </button>
          <button
            onClick={() => {
              setSelectedCategory('All');
              if (window.innerWidth <= 1024) {
                setSidebarOpen(true);
              }
            }}
            className="hero-cta hero-cta-secondary"
          >
            Browse All Categories
          </button>
        </div>
        
        <div className="view-mode-toggle">
          <button 
            className={`view-btn ${viewMode === 'archive' ? 'active' : ''}`}
            onClick={() => {
              setViewMode('archive');
              setSelectedEntry(null);
              setMarkdown('');
              setSelectedCategory('All');
            }}
          >
            Archive Collection ({archiveEntries.length})
          </button>
          <button 
            className={`view-btn ${viewMode === 'blog' ? 'active' : ''}`}
            onClick={() => {
              setViewMode('blog');
              setSelectedEntry(null);
              setMarkdown('');
              setSelectedCategory('All');
            }}
          >
            Recent Posts ({customEntries.length})
          </button>
          <button
            className={`view-btn ${viewMode === 'logic' ? 'active' : ''}`}
            onClick={() => {
              setViewMode('logic');
              setSelectedEntry(null);
              setMarkdown('');
              setSelectedCategory('All');
            }}
          >
            Logic Mode
          </button>
        </div>

        <p className="archive-subtitle">
          {viewMode === 'archive'
            ? '110,000+ words • Ages 24-28 (2020-2026) • Every line preserved'
            : viewMode === 'blog'
              ? 'Fresh perspectives and new stories starting 2026'
              : 'Structured analytical transmission across numerology and risk-adjusted weight-loss modeling'}
        </p>
        <div className="archive-stats">
          <span>
            {viewMode === 'logic'
              ? `${logicSections.length} Analysis Sections`
              : `${currentEntries.length} ${viewMode === 'archive' ? 'Documents' : 'Posts'}`}
          </span>
          <span className="stat-separator">•</span>
          <span>{viewMode === 'logic' ? 'Dual-Domain Analysis' : '12 Categories'}</span>
          <span className="stat-separator">•</span>
          <span>
            {viewMode === 'archive'
              ? '40+ Distinct Works'
              : viewMode === 'blog'
                ? 'Updated Regularly'
                : 'No Canonical Meaning Claims'}
          </span>
        </div>
      </header>

      <div className="archive-layout">
        <aside className={`archive-sidebar ${sidebarOpen ? 'is-open' : 'is-collapsed'}`}>
          {isEntryMode ? (
            <>
              <div className="category-filter">
                <h3>{viewMode === 'archive' ? 'Archive Categories' : 'Post Categories'}</h3>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    className={`category-btn ${selectedCategory === cat ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                    <span className="count">
                      {cat === 'All'
                        ? currentEntries.length
                        : currentEntries.filter((e) => e.category === cat).length}
                    </span>
                  </button>
                ))}
              </div>

              <div className="entry-list">
                <h3>{viewMode === 'archive' ? 'Documents' : 'Posts'}</h3>
                {sortedFilteredEntries.length === 0 ? (
                  <div className="sidebar-empty-state">
                    No items in this category yet.
                  </div>
                ) : (
                  sortedFilteredEntries.map((entry) => (
                    <button
                      key={entry.id}
                      className={`entry-item ${selectedEntry?.id === entry.id ? 'active' : ''}`}
                      onClick={() => loadMarkdown(entry)}
                    >
                      <div className="entry-title">{entry.title}</div>
                      <div className="entry-meta">
                        <span className="entry-category">{entry.category}</span>
                        <span className="entry-words">{entry.wordCount} words</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="logic-sidebar-note">
              <h3>Logic Mode</h3>
              <p>
                This transmission view is fixed-reference content, not user-submitted archive material.
              </p>
              <p>
                Use Archive Collection or Recent Posts to return to document navigation.
              </p>
            </div>
          )}
        </aside>

        <main className="archive-content">
          <button
            className="mobile-sidebar-toggle"
            onClick={() => setSidebarOpen((prev) => !prev)}
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? 'Hide Navigation' : 'Show Navigation'}
          </button>

          {!selectedEntry && viewMode === 'archive' && (
            <div className="archive-welcome">
              <h2>Start with the Archive Master Index</h2>
              <p>
                The homepage is intentionally archive-first: this is the canonical reading shell for the full PVA Bazaar writing archive.
              </p>
              <p>Select a category on the left, then open a document. If you want one best first click, open the Master Index.</p>
              <div className="quick-links">
                <h3>Recommended First Reads</h3>
                <button onClick={() => loadMarkdown(archiveEntries[0])} className="quick-link">
                  Read Master Index
                </button>
                <button onClick={() => loadMarkdown(archiveEntries[16])} className="quick-link">
                  Read Master Integration and Roadmap
                </button>
                <button onClick={() => loadMarkdown(archiveEntries[1])} className="quick-link">
                  Read The Man from Taured, Part 1
                </button>
              </div>
            </div>
          )}

          {!selectedEntry && viewMode === 'blog' && (
            <div className="archive-welcome">
              <h2>Recent Posts</h2>
              {entriesError && (
                <div className="archive-error-box" role="status">
                  <p>{entriesError}</p>
                  <button className="quick-link retry-link" onClick={loadCustomEntries}>Retry Loading Posts</button>
                </div>
              )}
              {customEntries.length === 0 ? (
                <>
                  <p>
                    No posts are published yet. This section will display new writings created from 2026 onward.
                  </p>
                  <p>
                    Visit the <a href="#/admin" style={{color: 'var(--accent)', textDecoration: 'underline'}}>Admin Panel</a> to publish the first post.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    Fresh perspectives and evolving thoughts from 2026 onward. Select a post from the sidebar to read.
                  </p>
                  <p className="blog-count">
                    {customEntries.length} {customEntries.length === 1 ? 'post' : 'posts'} published
                  </p>
                </>
              )}
            </div>
          )}

          {!selectedEntry && viewMode === 'logic' && (
            <article className="archive-document logic-document">
              <div className="document-header">
                <span className="document-category">Logic Mode</span>
                <h1>Query Analysis Transmission</h1>
                <p className="document-description">
                  Prime-number numerology context and constrained fasting math presented as structured analytical output.
                </p>
              </div>

              <div className="logic-disclaimer" role="note" aria-live="polite">
                <strong>Medical note:</strong> the fasting section is a theoretical calculation summary only and not clinical advice. Any extended fasting requires medical supervision.
              </div>

              <div className="logic-sections">
                {logicSections.map((section) => (
                  <section key={section.id} className="logic-section">
                    <h2>{section.title}</h2>
                    <ul>
                      {section.content.map((line, index) => (
                        <li key={`${section.id}-${index}`}>{line}</li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </article>
          )}

          {loading && (
            <div className="archive-loading">
              <div className="spinner"></div>
              <p>Loading document...</p>
            </div>
          )}

          {selectedEntry && !loading && (
            <article className="archive-document">
              <div className="document-header">
                <span className="document-category">{selectedEntry.category}</span>
                <h1>{selectedEntry.title}</h1>
                {selectedEntry.description && (
                  <p className="document-description">{selectedEntry.description}</p>
                )}
                <div className="document-meta">
                  {selectedEntry.wordCount && <span>📝 {selectedEntry.wordCount} words</span>}
                  {selectedEntry.wordCount && selectedEntry.file && <span>•</span>}
                  {selectedEntry.file && <span>📄 {selectedEntry.file}</span>}
                </div>
              </div>
              <div
                className="markdown-content"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown) }}
              />
              {Array.isArray(selectedEntry.media) && selectedEntry.media.length > 0 && (
                <div className="entry-media">
                  <h3>Media</h3>
                  <div className="media-grid">
                    {selectedEntry.media.map((url, index) => renderMediaItem(url, index))}
                  </div>
                </div>
              )}
            </article>
          )}
        </main>
      </div>
    </div>
    </>
  );
}
