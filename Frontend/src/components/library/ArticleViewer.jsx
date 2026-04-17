import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { fetchLibraryArticleById } from '../../lib/api';
import './LibraryModule.css';

export default function ArticleViewer({ articleId }) {
  const [item, setItem] = useState(null);
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadArticle() {
      if (!articleId) {
        setLoading(false);
        setError('Missing article identifier');
        return;
      }

      setLoading(true);
      setError('');
      try {
        const response = await fetchLibraryArticleById(articleId);
        if (!response?.ok) throw new Error(response?.error || 'Failed to load article');
        if (!mounted) return;
        setItem(response.item || null);
        setSource(response.source || 'database');
      } catch (err) {
        if (!mounted) return;
        setError(err.message || 'Failed to load article');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadArticle();
    return () => {
      mounted = false;
    };
  }, [articleId]);

  return (
    <section className="library-module" aria-label="Article viewer">
      {loading ? <p className="library-alert">Loading article...</p> : null}
      {error ? <p className="library-alert library-alert-error">{error}</p> : null}

      {!loading && !error && item ? (
        <article className="library-viewer">
          <header className="library-viewer-header">
            <h1>{item.title}</h1>
            <div className="library-chip-row">
              <span className="library-chip">v{item.version}</span>
              <span className="library-chip">{item.slug}</span>
              <span className="library-chip">Source: {source}</span>
              {item.ipfsCid ? <span className="library-chip">IPFS: {item.ipfsCid}</span> : null}
            </div>
          </header>

          {item.renderedHtml ? (
            <div className="library-rendered-html" dangerouslySetInnerHTML={{ __html: item.renderedHtml }} />
          ) : (
            <div className="library-markdown-preview">
              <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{item.markdown || ''}</ReactMarkdown>
            </div>
          )}
        </article>
      ) : null}
    </section>
  );
}
