import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import ContactsPage from './ContactsPage.jsx';

vi.mock('../lib/api', () => ({
  apiGet: vi.fn(async (path) => {
    if (path === '/contacts') return { ok: true, items: [{ _id: '1', name: 'Nairobi Co', type: 'supplier', country: 'Kenya' }] };
    if (path === '/contacts/1') return { ok: true, item: { _id: '1', name: 'Nairobi Co', type: 'supplier', country: 'Kenya', email: '', commodities: [] } };
    if (path === '/commodities') return { ok: true, items: [] };
    return { ok: true, items: [] };
  }),
  apiPost: vi.fn(async () => ({ ok: true, item: { _id: '2' } })),
  apiPut: vi.fn(async () => ({ ok: true, item: {} })),
  apiDelete: vi.fn(async () => ({ ok: true })),
}));

describe('ContactsPage', () => {
  it('renders and loads contacts list', async () => {
    render(
      <MemoryRouter>
        <ContactsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Nairobi Co')).toBeInTheDocument();
    expect(screen.getByText(/Contacts \(CRM\)/)).toBeInTheDocument();
  });

  it('has Create button for new contact', async () => {
    render(
      <MemoryRouter>
        <ContactsPage />
      </MemoryRouter>
    );

    expect(await screen.findByRole('button', { name: /Create/i })).toBeInTheDocument();
  });
});
