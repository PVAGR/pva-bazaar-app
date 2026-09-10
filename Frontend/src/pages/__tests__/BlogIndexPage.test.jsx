import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import BlogIndexPage from '../BlogIndexPage.jsx';

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
}));

vi.mock('../../lib/api.js', () => ({ apiGet: mocks.apiGet }));

const serverBlogs = [
  { slug: 'first-post', title: 'First Post', authorName: 'Richard Torres', updatedAt: '2026-09-01T00:00:00.000Z' },
  { slug: 'field-notes', title: 'Field Notes from Nairobi', authorName: 'Richard Torres', updatedAt: '2026-09-02T00:00:00.000Z' },
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
  mocks.apiGet.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('BlogIndexPage (public blog index is server-authoritative)', () => {
  it('lists only published posts returned by the server', async () => {
    mocks.apiGet.mockResolvedValue({ blogs: serverBlogs });

    renderPage();

    expect(await screen.findByText('First Post')).toBeTruthy();
    expect(screen.getByText('Field Notes from Nairobi')).toBeTruthy();
    expect(mocks.apiGet).toHaveBeenCalledWith('/blogs');
  });

  it('never merges local / draft or unpublished records into the public index', async () => {
    mocks.apiGet.mockResolvedValue({
      blogs: [
        ...serverBlogs,
        { slug: 'draft-not-ready', title: 'Unpublished Draft', status: 'pending', authorName: '' },
      ],
    });
    window.localStorage.setItem(
      'pva-writing-studio-blog-draft',
      JSON.stringify({ title: 'Local-Only Device Draft', status: 'draft' }),
    );

    renderPage();

    // Only what came back from the server renders; the pending server draft and
    // the device-local draft must not appear as published posts.
    expect(await screen.findByText('First Post')).toBeTruthy();
    expect(screen.queryByText('Unpublished Draft')).toBeNull();
    expect(screen.queryByText('Local-Only Device Draft')).toBeNull();
    window.localStorage.clear();
  });

  it('shows an explicit error instead of fake content when the feed fails', async () => {
    mocks.apiGet.mockRejectedValue(new Error('Network down'));

    renderPage();

    expect(await screen.findByText(/The blog could not be reached right now/)).toBeTruthy();
  });

  it('shows the empty published state when there are no posts', async () => {
    mocks.apiGet.mockResolvedValue({ blogs: [] });

    renderPage();

    expect(await screen.findByText('No published posts yet.')).toBeTruthy();
  });
});