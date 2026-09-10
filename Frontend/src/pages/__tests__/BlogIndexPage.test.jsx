import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import BlogIndexPage from '../BlogIndexPage.jsx';

const mocks = vi.hoisted(() => ({
  fetchBlogFeed: vi.fn(),
}));

vi.mock('../../lib/api.js', () => ({ fetchBlogFeed: mocks.fetchBlogFeed }));

// Server feed shape: stable prefixed ids, kind, path, normalized publishedAt.
const feedItems = [
  {
    id: 'archive:6aa2bd64c29261b02fc7dff2',
    kind: 'archive',
    refId: '6aa2bd64c29261b02fc7dff2',
    slug: '',
    title: 'The Next Chapter: From Nairobi to Homa Bay County',
    excerpt: 'My message before I begin my travel',
    category: 'Personal',
    authorName: '',
    wordCount: 400,
    publishedAt: '2026-09-10T14:23:32.703Z',
    updatedAt: '2026-09-10T14:23:32.703Z',
    path: '/blog/a/6aa2bd64c29261b02fc7dff2',
  },
  {
    id: 'blog:first-post',
    kind: 'blog',
    refId: 'first-post',
    slug: 'first-post',
    title: 'First Post',
    excerpt: 'Body A',
    category: 'Blog',
    authorName: 'Richard Torres',
    wordCount: 0,
    publishedAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    path: '/blog/first-post',
  },
  {
    id: 'blog:field-notes',
    kind: 'blog',
    refId: 'field-notes',
    slug: 'field-notes',
    title: 'Field Notes from Nairobi',
    excerpt: 'Notes',
    category: 'Blog',
    authorName: 'Richard Torres',
    wordCount: 0,
    publishedAt: '2026-09-02T00:00:00.000Z',
    updatedAt: '2026-09-02T00:00:00.000Z',
    path: '/blog/field-notes',
  },
];

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <BlogIndexPage />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

beforeEach(() => {
  mocks.fetchBlogFeed.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('BlogIndexPage (combined server-authoritative blog feed)', () => {
  it('lists every published post returned by the server feed', async () => {
    mocks.fetchBlogFeed.mockResolvedValue({ ok: true, items: feedItems });

    renderPage();

    expect(await screen.findByText('The Next Chapter: From Nairobi to Homa Bay County')).toBeTruthy();
    expect(screen.getByText('First Post')).toBeTruthy();
    expect(screen.getByText('Field Notes from Nairobi')).toBeTruthy();
    expect(mocks.fetchBlogFeed).toHaveBeenCalledWith({ limit: 50 });
  });

  it('defaults to newest-first and re-sorts on demand', async () => {
    mocks.fetchBlogFeed.mockResolvedValue({ ok: true, items: feedItems });

    renderPage();

    // Wait for load
    await screen.findByText('First Post');

    // Default: newest first — Nairobi (09-10) before Field Notes (09-02) before First Post (09-01)
    let order = Array.from(document.querySelectorAll('.blog-index__itemTitle')).map((el) => el.textContent);
    expect(order[0]).toBe('The Next Chapter: From Nairobi to Homa Bay County');
    expect(order[2]).toBe('First Post');

    // Oldest first
    fireEvent.click(screen.getByTitle('Sort by oldest first'));
    order = Array.from(document.querySelectorAll('.blog-index__itemTitle')).map((el) => el.textContent);
    expect(order[0]).toBe('First Post');
    expect(order[2]).toBe('The Next Chapter: From Nairobi to Homa Bay County');

    // Title A-Z
    fireEvent.click(screen.getByTitle('Sort by title A to Z'));
    order = Array.from(document.querySelectorAll('.blog-index__itemTitle')).map((el) => el.textContent);
    expect(order[0]).toBe('Field Notes from Nairobi');

    // Title Z-A
    fireEvent.click(screen.getByTitle('Sort by title Z to A'));
    order = Array.from(document.querySelectorAll('.blog-index__itemTitle')).map((el) => el.textContent);
    expect(order[0]).toBe('The Next Chapter: From Nairobi to Homa Bay County');
  });

  it('never merges local / draft or unpublished records into the public index', async () => {
    mocks.fetchBlogFeed.mockResolvedValue({ ok: true, items: feedItems });
    window.localStorage.setItem(
      'pva-writing-studio-blog-draft',
      JSON.stringify({ title: 'Local-Only Device Draft', status: 'draft' }),
    );

    renderPage();

    expect(await screen.findByText('First Post')).toBeTruthy();
    expect(screen.queryByText('Local-Only Device Draft')).toBeNull();
  });

  it('shows an explicit error instead of fake content when the feed fails', async () => {
    mocks.fetchBlogFeed.mockResolvedValue({ ok: false, items: [], error: 'Backend down' });

    renderPage();

    expect(await screen.findByText(/The blog could not be reached right now/)).toBeTruthy();
  });

  it('shows the empty published state when there are no posts', async () => {
    mocks.fetchBlogFeed.mockResolvedValue({ ok: true, items: [] });

    renderPage();

    expect(await screen.findByText('No published posts yet.')).toBeTruthy();
  });

  it('links to the full archive for cross-navigation', async () => {
    mocks.fetchBlogFeed.mockResolvedValue({ ok: true, items: feedItems });

    renderPage();

    expect(await screen.findByText('Browse the full Archive →')).toBeTruthy();
  });
});
