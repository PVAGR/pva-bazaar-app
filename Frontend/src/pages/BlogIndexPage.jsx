import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { fetchBlogFeed } from '../lib/api.js';
import './BlogPostPage.css';

// Sort modes for the public blog feed. Default is newest-first.
const SORT_MODES = [
  { key: 'newest', label: 'Newest', title: 'Sort by newest first' },
  { key: 'oldest', label: 'Oldest', title: 'Sort by oldest first' },
  { key: 'title-az', label: 'Title A–Z', title: 'Sort by title A to Z' },
  { key: 'title-za', label: 'Title Z–A', title: 'Sort by title Z to A' },
];

// Date normalization mirrors the server: publishedAt -> createdAt -> updatedAt.
// The feed endpoint already normalizes, this is a defensive fallback for
// sorting only — never used to invent content.
function postDate(post) {
  const t = new Date(post?.publishedAt || post?.createdAt || post?.updatedAt || 0).getTime();
  return Number.isFinite(t) ? t : 0;
}

function formatPostDate(post) {
  const t = postDate(post);
  return t > 0 ? new Date(t).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '';
}

export default function BlogIndexPage() {
  const [state, setState] = useState({ loading: true, error: '', posts: [] });
  const [sortKey, setSortKey] = useState('newest');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setState((prev) => ({ ...prev, loading: true, error: '' }));
      try {
        // Server authority: /blog-feed merges published ArchiveEntry and Blog
        // records server-side. Only published posts come back. Local drafts
        // and editor recovery copies are never merged into this view.
        const result = await fetchBlogFeed({ limit: 50 });
        if (!cancelled) {
          if (result.ok) {
            setState({ loading: false, error: '', posts: result.items });
          } else {
            setState({ loading: false, error: result.error || 'Unable to load posts', posts: [] });
          }
        }
      } catch (error) {
        if (!cancelled) {
          setState({ loading: false, error: error?.message || 'Unable to load posts', posts: [] });
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const sortedPosts = useMemo(() => {
    const posts = [...(state.posts || [])];
    switch (sortKey) {
      case 'oldest':
        return posts.sort((a, b) => postDate(a) - postDate(b));
      case 'title-az':
        return posts.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
      case 'title-za':
        return posts.sort((a, b) => String(b.title || '').localeCompare(String(a.title || '')));
      case 'newest':
      default:
        return posts.sort((a, b) => postDate(b) - postDate(a));
    }
  }, [state.posts, sortKey]);

  return (
    <>
      <Helmet>
        <title>Blog | PVA Bazaar</title>
        <meta name="description" content="Published posts from PVA Bazaar — field notes, essays, and updates." />
        <meta property="og:title" content="Blog | PVA Bazaar" />
        <meta property="og:description" content="Published posts from PVA Bazaar — field notes, essays, and updates." />
        <meta property="og:type" content="website" />
      </Helmet>
      <section className="blog-post section-card">
        <div className="blog-post__header">
          <p className="pill">PVA blog</p>
          <h1>Blog</h1>
          <p className="blog-index__intro">
            Every published post — field notes, essays, and updates — in one feed.
          </p>
        </div>

        <div className="blog-index__toolbar">
          <div className="blog-index__sort" role="group" aria-label="Sort posts">
            {SORT_MODES.map((mode) => (
              <button
                key={mode.key}
                type="button"
                className={`blog-index__sortBtn ${sortKey === mode.key ? 'blog-index__sortBtn--active' : ''}`}
                onClick={() => setSortKey(mode.key)}
                aria-pressed={sortKey === mode.key}
                title={mode.title}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <Link className="blog-index__archiveLink" to="/archive">
            Browse the full Archive →
          </Link>
        </div>

        {state.loading ? (
          <div className="blog-index__status blog-index__status--loading" role="status">
            <p>Loading posts…</p>
          </div>
        ) : state.error ? (
          <div className="blog-index__status blog-index__status--error" role="alert">
            <p>{state.error}</p>
            <p>The blog could not be reached right now. Please try again shortly.</p>
          </div>
        ) : sortedPosts.length === 0 ? (
          <div className="blog-index__status blog-index__status--empty" role="status">
            <p>No published posts yet.</p>
            <p>
              When a post is published it will appear here. Meanwhile, the{' '}
              <Link to="/archive">Archive</Link> holds the full writing collection.
            </p>
          </div>
        ) : (
          <div className="blog-index__list">
            {sortedPosts.map((post) => (
              <Link key={post.id} className="blog-index__item" to={post.path || '/blog'}>
                <strong className="blog-index__itemTitle">{post.title}</strong>
                {post.excerpt ? <span className="blog-index__itemExcerpt">{post.excerpt}</span> : null}
                <span className="blog-index__itemMeta">
                  {post.category ? `${post.category} · ` : ''}
                  {formatPostDate(post)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
