import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import BrokerHubPage from './BrokerHubPage.jsx';

vi.mock('../lib/api', () => ({
  apiGet: vi.fn(async (path) => {
    if (path === '/commodities') return { ok: true, items: [{ _id: '1', name: 'Coffee', category: 'Beverages' }] };
    if (path === '/contacts') return { ok: true, items: [{ _id: '2', name: 'Nairobi Co', type: 'supplier' }] };
    if (path === '/templates') return { ok: true, items: [{ _id: '3', name: 'Coffee Vetting', type: 'vetting' }] };
    if (path === '/deals') return { ok: true, items: [{ _id: '4', title: 'Deal 1', status: 'active', currency: 'USD', totalAmount: 1000 }] };
    if (path === '/vault-notes') return { ok: true, items: [{ _id: '5', title: 'Private thought', recordType: 'general' }] };
    return { ok: true, items: [] };
  }),
}));

describe('BrokerHubPage', () => {
  it('renders hub header and quick actions', async () => {
    render(
      <MemoryRouter>
        <BrokerHubPage />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /Broker Hub/i })).toBeInTheDocument();
    expect(screen.getByText(/All-in-one/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Chat with Richard AI/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /New commodity/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /New contact/i })).toBeInTheDocument();
  });

  it('loads and displays commodities, contacts, templates, deals', async () => {
    render(
      <MemoryRouter>
        <BrokerHubPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Coffee')).toBeInTheDocument();
    expect(screen.getByText('Nairobi Co')).toBeInTheDocument();
    expect(screen.getByText('Coffee Vetting')).toBeInTheDocument();
    expect(screen.getByText('Deal 1')).toBeInTheDocument();
  });

  it('has search input', async () => {
    render(
      <MemoryRouter>
        <BrokerHubPage />
      </MemoryRouter>
    );

    expect(await screen.findByPlaceholderText(/Search commodities/i)).toBeInTheDocument();
  });

  it('loads and displays vault notes', async () => {
    render(
      <MemoryRouter>
        <BrokerHubPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Private thought')).toBeInTheDocument();
    expect(screen.getByText('Vault notes')).toBeInTheDocument();
  });
});
