import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
// Helper to build canonical URLs
function getCanonicalUrl(path = '') {
  const base = 'https://pvabazaar.org';
  return base + (path.startsWith('/') ? path : '/' + path);
}
import { Link } from 'react-router-dom';
import { fetchArchiveEntries } from '../lib/api';
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

export default function ArchiveLibraryPage() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [markdown, setMarkdown] = useState('');
  const [loading, setLoading] = useState(false);
  const [customEntries, setCustomEntries] = useState([]);
  const [viewMode, setViewMode] = useState('archive'); // 'archive' or 'blog'
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('archive-theme');
    return saved ? saved === 'dark' : true;
  });

  // Function to load custom entries from API
  const loadCustomEntries = async () => {
    try {
      const response = await fetch('/api/archive');
      if (response.ok) {
        const data = await response.json();
        setCustomEntries(data.entries || []);
      }
    } catch (error) {
      console.error('Failed to load custom entries:', error);
      setCustomEntries([]);
    }
  };

  useEffect(() => {
    loadCustomEntries();
    
    // Refresh entries every 30 seconds to show new posts
    const interval = setInterval(loadCustomEntries, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem('archive-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const categories = ['All', 'Index', 'Fiction', 'Spiritual', 'Technology', 'Business', 'Personal', 'Philosophy', 'Wisdom', 'Architecture', 'Strategic'];

  // Get entries based on view mode
  const currentEntries = viewMode === 'archive' ? archiveEntries : customEntries;
  
  const filteredEntries =
    selectedCategory === 'All'
      ? currentEntries
      : currentEntries.filter((e) => e.category === selectedCategory);

  const loadMarkdown = async (entry) => {
    setLoading(true);
    setSelectedEntry(entry);
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
  };

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
          <h1>📚 The Complete Archive</h1>
          <div className="header-actions">
            <Link to="/admin" className="admin-link">⚙️ Admin</Link>
            <button 
              className="theme-toggle" 
              onClick={() => setDarkMode(!darkMode)}
              aria-label="Toggle theme"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
        
        <div className="view-mode-toggle">
          <button 
            className={`view-btn ${viewMode === 'archive' ? 'active' : ''}`}
            onClick={() => {
              setViewMode('archive');
              setSelectedEntry(null);
              setMarkdown('');
            }}
          >
            📚 Original Archive ({archiveEntries.length})
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
            ✍️ New Blog Posts ({customEntries.length})
          </button>
        </div>

        <p className="archive-subtitle">
          {viewMode === 'archive' 
            ? '110,000+ words • Ages 24-28 (2020-2026) • Every line preserved'
            : 'Fresh perspectives and new stories starting 2026'}
        </p>
        <div className="archive-stats">
          <span>{currentEntries.length} {viewMode === 'archive' ? 'Documents' : 'Posts'}</span>
          <span>•</span>
          <span>12 Categories</span>
          <span>•</span>
          <span>{viewMode === 'archive' ? '40+ Distinct Works' : 'Updated Regularly'}</span>
        </div>
      </header>

      <div className="archive-layout">
        <aside className="archive-sidebar">
          <div className="category-filter">
            <h3>Categories</h3>
            {categories.map((cat) => (
              <button
                key={cat}
                className={`category-btn ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
                <span className="count">
                  {cat === 'All'
                    ? archiveEntries.length
                    : archiveEntries.filter((e) => e.category === cat).length}
                </span>
              </button>
            ))}
          </div>

          <div className="entry-list">
            <h3>Documents</h3>
            {filteredEntries
              .sort((a, b) => a.priority - b.priority)
              .map((entry) => (
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
              ))}
          </div>
        </aside>

        <main className="archive-content">
          {!selectedEntry && viewMode === 'archive' && (
            <div className="archive-welcome">
              <h2>Welcome to the Archive</h2>
              <p>
                This is the complete preservation of writings from ages 24-28, spanning 2020 to 2026.
                Every single line and letter preserved per directive.
              </p>
              <p>Select a document from the sidebar to begin reading.</p>
              <div className="quick-links">
                <h3>Recommended Starting Points:</h3>
                <button onClick={() => loadMarkdown(archiveEntries[0])} className="quick-link">
                  📋 Start with the Master Index
                </button>
                <button onClick={() => loadMarkdown(archiveEntries[16])} className="quick-link">
                  🎯 See the Master Integration & Roadmap
                </button>
                <button onClick={() => loadMarkdown(archiveEntries[1])} className="quick-link">
                  📖 Read the Novel (The Man from Taured)
                </button>
              </div>
            </div>
          )}

          {!selectedEntry && viewMode === 'blog' && (
            <div className="archive-welcome">
              <h2>New Blog Posts</h2>
              {customEntries.length === 0 ? (
                <>
                  <p>
                    No blog posts yet. This section will display new writings created from 2026 onwards.
                  </p>
                  <p>
                    Visit the <a href="#/admin" style={{color: 'var(--accent)', textDecoration: 'underline'}}>Admin Panel</a> to create your first blog post.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    Fresh perspectives and evolving thoughts starting 2026. Select a post from the sidebar to read.
                  </p>
                  <p className="blog-count">
                    {customEntries.length} {customEntries.length === 1 ? 'post' : 'posts'} published
                  </p>
                </>
              )}
            </div>
          )}

          {loading && (
            <div className="archive-loading">
              <div className="spinner"></div>
              <p>Loading archive entry...</p>
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
