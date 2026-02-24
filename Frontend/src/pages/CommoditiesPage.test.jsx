import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import CommoditiesPage from './CommoditiesPage.jsx';

vi.mock('../lib/api', () => ({
  apiGet: vi.fn(async (path) => {
    if (path === '/commodities') return { ok: true, items: [{ _id: '1', name: 'Coffee', category: 'Beverages' }] };
    if (path === '/commodities/1') return { ok: true, item: { _id: '1', name: 'Coffee', category: 'Beverages', notes: '', marketData: {}, redFlags: [], greenFlags: [], linkedTemplateIds: [], linkedContactIds: [] } };
    if (path === '/contacts') return { ok: true, items: [] };
    if (path === '/templates') return { ok: true, items: [] };
    return { ok: true, items: [] };
  }),
  apiPost: vi.fn(async () => ({ ok: true, item: { _id: '2', name: 'Malachite' } })),
  apiPut: vi.fn(async () => ({ ok: true, item: {} })),
  apiDelete: vi.fn(async () => ({ ok: true })),
}));

describe('CommoditiesPage', () => {
  it('renders and loads commodities list', async () => {
    render(
      <MemoryRouter>
        <CommoditiesPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Coffee')).toBeInTheDocument();
    expect(screen.getByText('Beverages')).toBeInTheDocument();
  });

  it('shows create form with name input and Create button', async () => {
    render(
      <MemoryRouter>
        <CommoditiesPage />
      </MemoryRouter>
    );

    await screen.findByText('Coffee');
    expect(screen.getByPlaceholderText(/e\.g\. Vietnamese Arabica/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create/i })).toBeInTheDocument();
  });
});
