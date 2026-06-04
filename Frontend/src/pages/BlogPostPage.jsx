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

export default function BlogPostPage() {
  const { slug } = useParams();
  const [state, setState] = useState({ loading: true, error: '', blog: null });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setState({ loading: true, error: '', blog: null });
      try {
        const response = await apiGet(`/blogs/${encodeURIComponent(slug)}`);
        if (!cancelled) {
          setState({ loading: false, error: '', blog: response?.blog || null });
        }
      } catch (error) {
        if (!cancelled) {
          setState({ loading: false, error: error?.message || 'Unable to load blog post', blog: null });
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (state.loading) {
    return <section className="blog-post section-card">Loading blog post...</section>;
  }

  if (!state.blog) {
    return (
      <section className="blog-post section-card">
        <h1>Blog post unavailable</h1>
        <p>{state.error || 'This post could not be found.'}</p>
        <Link className="blog-post__back" to="/studio">Back to studio</Link>
      </section>
    );
  }

  return (
    <>
      <Helmet>
        <title>{state.blog.title} | PVA Bazaar Blog</title>
        <meta name="description" content={String(state.blog.content || '').slice(0, 160)} />
        <meta property="og:title" content={state.blog.title} />
        <meta property="og:description" content={String(state.blog.content || '').slice(0, 160)} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={getCanonicalUrl(`#/blog/${slug}`)} />
      </Helmet>
      <section className="blog-post section-card">
        <div className="blog-post__header">
          <p className="pill">PVA blog</p>
          <h1>{state.blog.title}</h1>
          <p className="blog-post__meta">
            {state.blog.updatedAt ? new Date(state.blog.updatedAt).toLocaleString() : 'Published'}
          </p>
        </div>
        <article className="blog-post__body">
          <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
            {state.blog.content || ''}
          </ReactMarkdown>
        </article>
        <nav className="blog-post__footer">
          <Link className="blog-post__back" to="/studio">Writing studio</Link>
          <Link className="blog-post__back" to="/archive">Archive</Link>
        </nav>
      </section>
    </>
  );
}
