import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { apiGet } from '../lib/api.js';
import './BlogPostPage.css';

export default function BlogIndexPage() {
  const [state, setState] = useState({ loading: true, error: '', blogs: [] });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setState({ loading: true, error: '', blogs: [] });
      try {
        // Server authority: only published posts come back from /blogs. Local
        // drafts and editor recovery copies are never merged into this view.
        const response = await apiGet('/blogs');
        if (!cancelled) {
          const publishedOnly = Array.isArray(response?.blogs)
            ? response.blogs.filter((blog) => String(blog.status || 'published') !== 'pending')
            : [];
          setState({ loading: false, error: '', blogs: publishedOnly });
        }
      } catch (error) {
        if (!cancelled) {
          setState({ loading: false, error: error?.message || 'Unable to load posts', blogs: [] });
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <Helmet>
        <title>Blog | PVA Bazaar</title>
        <meta name="description" content="Published posts from PVA Bazaar." />
        <meta property="og:title" content="Blog | PVA Bazaar" />
        <meta property="og:description" content="Published posts from PVA Bazaar." />
        <meta property="og:type" content="website" />
      </Helmet>
      <section className="blog-post section-card">
        <div className="blog-post__header">
          <p className="pill">PVA blog</p>
          <h1>Blog</h1>
        </div>

        {state.loading ? (
          <p className="blog-index__status">Loading posts...</p>
        ) : state.error ? (
          <div className="blog-index__status blog-index__status--error">
            <p>{state.error}</p>
            <p>The blog could not be reached right now. Please try again shortly.</p>
          </div>
        ) : state.blogs.length === 0 ? (
          <p className="blog-index__status">No published posts yet.</p>
        ) : (
          <div className="blog-index__list">
            {state.blogs.map((blog) => (
              <Link key={blog.slug} className="blog-index__item" to={`/blog/${blog.slug}`}>
                <strong>{blog.title}</strong>
                <span>
                  {blog.authorName ? `${blog.authorName} · ` : ''}
                  {blog.updatedAt ? new Date(blog.updatedAt).toLocaleDateString() : 'Published'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}