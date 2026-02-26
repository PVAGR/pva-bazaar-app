import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import TokenCreatorPage from './TokenCreatorPage.jsx';

vi.mock('../lib/auth', () => ({
  getToken: vi.fn(() => 'mock-token'),
}));

vi.mock('../lib/api', () => ({
  apiGet: vi.fn(async (path) => {
    if (path === '/tokens') return { ok: true, items: [] };
    if (path === '/users/profile') return { ok: true, user: { email: 'u@t.com' } };
    return { ok: true };
  }),
  apiPost: vi.fn(async () => ({ ok: true, item: {} })),
}));

describe('TokenCreatorPage', () => {
  it('renders Token Creator header and sections', async () => {
    render(
      <MemoryRouter>
        <TokenCreatorPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Token Creator/)).toBeInTheDocument();
    expect(screen.getByText(/Deploy new token/)).toBeInTheDocument();
    expect(screen.getByText(/Register existing token/)).toBeInTheDocument();
    expect(screen.getByText(/Your tokens/)).toBeInTheDocument();
  });

  it('has Deploy and Register buttons', async () => {
    render(
      <MemoryRouter>
        <TokenCreatorPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /Deploy/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Register/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Deploy via Remix/i })).toBeInTheDocument();
  });
});
