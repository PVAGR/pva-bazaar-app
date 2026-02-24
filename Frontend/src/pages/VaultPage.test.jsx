import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import VaultPage from './VaultPage.jsx';

vi.mock('../lib/api', () => ({
  apiGet: vi.fn(async (path) => {
    if (path === '/vault-notes') return { ok: true, items: [{ _id: '1', title: 'Private note', recordType: 'contact', content: 'For my eyes only.' }] };
    if (path === '/vault-notes/1') return { ok: true, item: { _id: '1', title: 'Private note', recordType: 'contact', content: 'For my eyes only.' } };
    return { ok: true, items: [] };
  }),
  apiPost: vi.fn(async () => ({ ok: true, item: { _id: '2' } })),
  apiPut: vi.fn(async () => ({ ok: true, item: {} })),
  apiDelete: vi.fn(async () => ({ ok: true })),
}));

describe('VaultPage', () => {
  it('renders and loads vault notes', async () => {
    render(
      <MemoryRouter>
        <VaultPage />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /My Record \(Vault\)/i })).toBeInTheDocument();
    expect(await screen.findByText('Private note')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create/i })).toBeInTheDocument();
  });

  it('has New note form with type select', async () => {
    render(
      <MemoryRouter>
        <VaultPage />
      </MemoryRouter>
    );

    await screen.findByText('Private note');
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Brief title/i)).toBeInTheDocument();
  });
});
