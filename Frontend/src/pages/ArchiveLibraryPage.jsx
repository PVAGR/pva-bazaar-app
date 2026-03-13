import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { Helmet } from 'react-helmet-async';
// Helper to build canonical URLs
function getCanonicalUrl(path = '') {
  const base = 'https://pvabazaar.org';
  return base + (path.startsWith('/') ? path : '/' + path);
}
import { Link } from 'react-router-dom';
import { fetchArchiveEntries, apiGet } from '../lib/api';
import { createLogger } from '../lib/logger';
import { SkeletonArticle, SkeletonList } from '../components/SkeletonLoader.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import './ArchiveLibraryPage.css';

const logger = createLogger('ArchiveLibrary');

export default function ArchiveLibraryPage() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [markdown, setMarkdown] = useState('');
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState([]);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [liveStats, setLiveStats] = useState({
    count: 0,
    categories: 0,
    lastUpdated: null,
  });
  const [aiEvents, setAiEvents] = useState([]);
  // Use global theme system
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    const isDark = saved ? saved === 'dark' : false;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    return isDark;
  });

  // Load live archive entries from API
  const loadEntries = async () => {
    setEntriesLoading(true);
    try {
      const result = await fetchArchiveEntries({ limit: 100 });
      if (result.ok && Array.isArray(result.items)) {
        const items = result.items;
        setEntries(items);

        // Derive live stats from API-backed entries
        const categorySet = new Set();
        let latestTs = null;
        for (const entry of items) {
          if (entry.category) {
            categorySet.add(entry.category);
          }
          const ts = entry.updatedAt || entry.createdAt;
          if (ts) {
            const time = new Date(ts).getTime();
            if (!Number.isNaN(time) && (!latestTs || time > latestTs)) {
              latestTs = time;
            }
          }
        }
        setLiveStats({
          count: items.length,
          categories: categorySet.size,
          lastUpdated: latestTs ? new Date(latestTs).toISOString() : null,
        });
      } else {
        setEntries([]);
        setLiveStats({
          count: 0,
          categories: 0,
          lastUpdated: null,
        });
      }
    } catch (error) {
      logger.error('Failed to load archive entries', error);
      setEntries([]);
      setLiveStats({
        count: 0,
        categories: 0,
        lastUpdated: null,
      });
    } finally {
      setEntriesLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();

    // Keep archive listings live without a hard refresh.
    const interval = setInterval(loadEntries, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load recent AI / OpenClaw events for a small activity ticker
  useEffect(() => {
    let cancelled = false;
    const loadEvents = async () => {
      try {
        const res = await apiGet('/openclaw/recent-events', { params: { limit: 5 } });
        if (!cancelled && res?.ok && Array.isArray(res.events)) {
          setAiEvents(res.events);
        }
      } catch {
        if (!cancelled) {
          setAiEvents([]);
        }
      }
    };
    loadEvents();
    const interval = setInterval(loadEvents, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Sync theme to global system
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const categories = ['All', ...Array.from(new Set(entries.map((e) => e.category).filter(Boolean)))];
  
  const filteredEntries =
    selectedCategory === 'All'
      ? entries
      : entries.filter((e) => e.category === selectedCategory);

  const loadMarkdown = async (entry) => {
    setLoading(true);
    setSelectedEntry(entry);
    try {
      setMarkdown(entry.content || '# Entry unavailable\n\nThis entry does not include readable content yet.');
    } catch (error) {
      logger.error('Failed to load archive entry', error, { entryId: entry?.id, entryFile: entry?.file });
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

  return (
    <>
      <Helmet>
        <title>Archive Library | PVA Bazaar</title>
        <meta name="description" content="Browse the live PVA Bazaar archive: entries, categories, and updates served directly from the API." />
        <meta property="og:title" content="Archive Library | PVA Bazaar" />
        <meta property="og:description" content="Browse the live PVA Bazaar archive: entries, categories, and updates served directly from the API." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={getCanonicalUrl('/archive')} />
        <meta property="og:image" content={getCanonicalUrl('/og-default.jpg')} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content={getCanonicalUrl('/og-default.jpg')} />
      </Helmet>
      <div className="archive-library">
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

        <p className="archive-subtitle">
          Live archive feed backed by the API.
        </p>
        <div className="archive-stats">
          <span>{liveStats.count} Documents</span>
          <span>•</span>
          <span>{liveStats.categories} Categories</span>
          <span>•</span>
          <span>
            {liveStats.lastUpdated
              ? `Updated ${new Date(liveStats.lastUpdated).toLocaleString()}`
              : 'Updated live'}
          </span>
        </div>
        {aiEvents.length > 0 && (
          <div className="archive-ai-ticker">
            <span className="archive-ai-label">AI activity:</span>
            <ul className="archive-ai-list">
              {aiEvents.map((ev) => (
                <li key={ev.id} className="archive-ai-item">
                  <span className="archive-ai-time">
                    {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : ''}
                  </span>
                  <span className="archive-ai-message">{ev.message || ev.event}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
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
                    ? entries.length
                    : entries.filter((e) => e.category === cat).length}
                </span>
              </button>
            ))}
          </div>

          <div className="entry-list">
            <h3>Documents</h3>
            {entriesLoading ? (
              <SkeletonList count={5} />
            ) : (
              filteredEntries
                .sort((a, b) => {
                  const dateA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
                  const dateB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
                  return dateB - dateA;
                })
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
                ))
            )}
          </div>
        </aside>

        <main className="archive-content">
          {!selectedEntry && (
            <div className="archive-welcome">
              <h2>Welcome to the Archive</h2>
              <p>
                Browse and open live entries from the archive database.
              </p>
              <p>Select a document from the sidebar to begin reading.</p>
              {entries.length === 0 && !entriesLoading ? (
                <p>
                  No entries are available yet. Visit the <Link to="/admin" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>Admin Panel</Link> to publish one.
                </p>
              ) : null}
            </div>
          )}

          {loading && (
            <div className="archive-loading">
              <LoadingSpinner size="medium" label="Loading archive entry..." />
              <SkeletonArticle />
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
              <div className="markdown-content">
                <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                  {markdown || ''}
                </ReactMarkdown>
              </div>
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
