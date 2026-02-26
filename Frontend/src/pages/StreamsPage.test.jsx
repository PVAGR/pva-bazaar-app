import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import StreamsPage from './StreamsPage.jsx';

vi.mock('../lib/auth', () => ({
  getToken: vi.fn(() => 'mock-token'),
}));

vi.mock('../config/env.ts', () => ({
  ENV: { API_URL: 'https://api.test' },
}));

vi.mock('../lib/api', () => ({
  apiGet: vi.fn(async (path) => {
    if (path === '/streams') return { ok: true, items: [] };
    if (path === '/users/profile') return { ok: true, user: { email: 'test@test.com' } };
    if (path === '/oauth/twitch/status') return { ok: true, configured: false };
    if (path === '/oauth/youtube/status') return { ok: true, configured: false };
    if (path === '/oauth/twitch/live-status') return { ok: true, connected: false };
    if (path === '/oauth/youtube/live-status') return { ok: true, connected: false };
    if (path === '/oauth/kick/live-status') return { ok: true, connected: false };
    if (path === '/streams/drafts') return { ok: true, draft: null };
    return { ok: true };
  }),
  apiPost: vi.fn(async () => ({ ok: true, item: {} })),
  apiPut: vi.fn(async () => ({ ok: true, user: {} })),
  apiDelete: vi.fn(async () => ({ ok: true })),
}));

describe('StreamsPage', () => {
  it('renders Livestreams header and Create stream session', async () => {
    render(
      <MemoryRouter>
        <StreamsPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Livestreams/)).toBeInTheDocument();
    expect(await screen.findByText(/Create stream session/)).toBeInTheDocument();
  });

  it('shows platform labels for Twitch, YouTube, Kick', async () => {
    render(
      <MemoryRouter>
        <StreamsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Twitch')).toBeInTheDocument();
    expect(screen.getByText('YouTube')).toBeInTheDocument();
    expect(screen.getByText('Kick')).toBeInTheDocument();
  });
});
