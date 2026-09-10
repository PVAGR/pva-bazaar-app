import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { apiGet } from '../lib/api.js';
import './BlogPostPage.css';

function getCanonicalUrl(path = '') {
  const base = 'https://pvabazaar.org';
  return base + (path.startsWith('/') ? path : `/${path}`);
}

// Post detail for ArchiveEntry-backed posts (created via the archive editor).
// The slug-based /blog/:slug route serves Blog-model posts; this route serves
// the owner's archive posts, keyed by stable archive entry id.
export default function BlogArchivePostPage() {
  const { id } = useParams();
  const [state, setState] = useState({ loading: true, error: '', item: null });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setState({ loading: true, error: '', item: null });
      try {
        const response = await apiGet(`/archive/${encodeURIComponent(id)}`);
        if (!cancelled) {
          setState({ loading: false, error: '', item: response?.item || null });
        }
      } catch (error) {
        if (!cancelled) {
          setState({ loading: false, error: error?.message || 'Unable to load this post', item: null });
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state.loading) {
    return <section className="blog-post section-card">Loading post…</section>;
  }

  if (!state.item) {
    return (
      <section className="blog-post section-card">
        <h1>Post unavailable</h1>
        <p>{state.error || 'This post could not be found. It may have been removed or is not published.'}</p>
        <nav className="blog-post__footer">
          <Link className="blog-post__back" to="/blog">Back to blog</Link>
          <Link className="blog-post__back" to="/archive">Archive</Link>
        </nav>
      </section>
    );
  }

  const item = state.item;
  const metaDate = item.createdAt
    ? new Date(item.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <>
      <Helmet>
        <title>{item.title} | PVA Bazaar Blog</title>
        <meta name="description" content={String(item.description || item.content || '').slice(0, 160)} />
        <meta property="og:title" content={item.title} />
        <meta property="og:description" content={String(item.description || item.content || '').slice(0, 160)} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={getCanonicalUrl(`/blog/a/${encodeURIComponent(id)}`)} />
      </Helmet>
      <section className="blog-post section-card">
        <div className="blog-post__header">
          <p className="pill">PVA blog</p>
          <h1>{item.title}</h1>
          <p className="blog-post__meta">
            {item.category ? `${item.category} · ` : ''}
            {metaDate}
          </p>
        </div>
        <article className="blog-post__body">
          <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
            {item.content || item.description || ''}
          </ReactMarkdown>
        </article>
        <nav className="blog-post__footer">
          <Link className="blog-post__back" to="/blog">Blog</Link>
          <Link className="blog-post__back" to="/archive">Archive</Link>
        </nav>
      </section>
    </>
  );
}
