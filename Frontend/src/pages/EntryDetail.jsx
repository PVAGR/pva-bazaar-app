import React, { useMemo, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { Helmet } from 'react-helmet-async';
import { useParams, Link } from 'react-router-dom';
import { fetchArchiveEntryById } from '../lib/archiveApi.js';
// Helper to build canonical URLs
function getCanonicalUrl(path = '') {
  const base = 'https://pvabazaar.org';
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export default function EntryDetail({ entries = [] }) {
  const { id } = useParams();
  const list = useMemo(() => entries, [entries]);
  const idx = list.findIndex((e) => String(e.id) === String(id));
  const entry = idx >= 0 ? list[idx] : null;
  const prev = idx > 0 ? list[idx - 1] : null;
  const next = idx >= 0 && idx + 1 < list.length ? list[idx + 1] : null;

  const [fetchedEntry, setFetchedEntry] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!entry) {
      setLoading(true);
      const controller = new AbortController();
      fetchArchiveEntryById(id, { signal: controller.signal })
        .then((data) => {
          if (mounted) {
            setFetchedEntry(data);
            setLoading(false);
          }
        })
        .catch((err) => {
          if (err?.name === 'AbortError') return;
          if (mounted) {
            console.warn('Failed to fetch entry', err);
            setLoading(false);
          }
        });
      return () => {
        mounted = false;
        controller.abort();
      };
    }
  }, [id, entry]);

  const displayEntry = entry || fetchedEntry;

  // Extract headings for TOC
  const [toc, setToc] = useState([]);
  useEffect(() => {
    if (!displayEntry?.content) {
      setToc([]);
      return;
    }
    // Simple regex-based heading extraction (##, ###, etc.)
    const lines = displayEntry.content.split('\n');
    const headings = lines
      .map((line, i) => {
        const match = /^(#{1,6})\s+(.*)/.exec(line);
        if (match) {
          return {
            level: match[1].length,
            text: match[2],
            id: `heading-${i}-${match[2].replace(/[^a-z0-9]+/gi, '-')}`,
          };
        }
        return null;
      })
      .filter(Boolean);
    setToc(headings);
  }, [displayEntry?.content]);

  if (loading) {
    return (
      <section className="entry-detail-container">
        <div className="entry-detail-header">
          <Link to="#/journal" className="entry-close-btn">✕</Link>
        </div>
        <div className="entry-detail-content">Loading entry...</div>
      </section>
    );
  }

  if (!displayEntry) {
    return (
      <section className="entry-detail-container">
        <div className="entry-detail-header">
          <Link to="#/journal" className="entry-close-btn">✕</Link>
        </div>
        <div className="entry-detail-content">Entry not found.</div>
      </section>
    );
  }

  return (
    <>
      <Helmet>
        <title>{displayEntry.title ? `${displayEntry.title} | PVA Bazaar Archive` : 'Archive Entry | PVA Bazaar'}</title>
        <meta name="description" content={displayEntry.description || 'Read this archive entry on PVA Bazaar.'} />
        <meta property="og:title" content={displayEntry.title || 'Archive Entry | PVA Bazaar'} />
        <meta property="og:description" content={displayEntry.description || 'Read this archive entry on PVA Bazaar.'} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={getCanonicalUrl(`/archive/${displayEntry.id || id}`)} />
        <meta property="og:image" content={displayEntry.media?.[0] || getCanonicalUrl('/og-default.svg')} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content={displayEntry.media?.[0] || getCanonicalUrl('/og-default.svg')} />
      </Helmet>
      <section className="entry-detail-container">
        <div className="entry-detail-header">
          <Link to="#/" className="entry-home-btn" aria-label="Home">🏠</Link>
          <h2 className="entry-detail-title">{displayEntry.title}</h2>
          <Link to="#/journal" className="entry-close-btn" aria-label="Close">✕</Link>
        </div>

        <div className="entry-detail-scrollable">
          <article className="entry-detail-content">
            <div className="entry-page__meta">
              {new Date(displayEntry.date).toLocaleDateString()}
              {displayEntry.location ? ` · ${displayEntry.location}` : ''}
              {displayEntry.tags?.length ? ` · ${displayEntry.tags.join(', ')}` : ''}
            </div>

            {/* Table of Contents */}
            {toc.length > 1 && (
              <nav className="entry-toc">
                <strong>Table of Contents</strong>
                <ul>
                  {toc.map((h) => (
                    <li key={h.id} style={{ marginLeft: (h.level - 2) * 12 }}>
                      <a href={`#${h.id}`}>{h.text}</a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}

            {/* Markdown body with heading anchors */}
            <div className="entry-page__body">
              <ReactMarkdown
                rehypePlugins={[rehypeSanitize]}
                components={{
                  h1: ({ ...props }) => {
                    const text = String(props.children);
                    const id = toc.find((h) => h.text === text && h.level === 1)?.id || undefined;
                    return <h1 id={id} {...props} />;
                  },
                  h2: ({ ...props }) => {
                    const text = String(props.children);
                    const id = toc.find((h) => h.text === text && h.level === 2)?.id || undefined;
                    return <h2 id={id} {...props} />;
                  },
                  h3: ({ ...props }) => {
                    const text = String(props.children);
                    const id = toc.find((h) => h.text === text && h.level === 3)?.id || undefined;
                    return <h3 id={id} {...props} />;
                  },
                  h4: ({ ...props }) => {
                    const text = String(props.children);
                    const id = toc.find((h) => h.text === text && h.level === 4)?.id || undefined;
                    return <h4 id={id} {...props} />;
                  },
                  h5: ({ ...props }) => {
                    const text = String(props.children);
                    const id = toc.find((h) => h.text === text && h.level === 5)?.id || undefined;
                    return <h5 id={id} {...props} />;
                  },
                  h6: ({ ...props }) => {
                    const text = String(props.children);
                    const id = toc.find((h) => h.text === text && h.level === 6)?.id || undefined;
                    return <h6 id={id} {...props} />;
                  },
                }}
              >
                {displayEntry.content}
              </ReactMarkdown>
            </div>
          </article>
        </div>

        <nav className="entry-detail-nav">
          {prev && <Link to={`#/entry/${prev.id}`} className="nav-link nav-prev">← Previous</Link>}
          <Link to="#/" className="nav-link nav-back">Back to Home</Link>
          {next && <Link to={`#/entry/${next.id}`} className="nav-link nav-next">Next →</Link>}
        </nav>
      </section>
    </>
  );
}
