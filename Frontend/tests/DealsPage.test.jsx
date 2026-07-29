import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import DealsPage from '../src/pages/DealsPage.jsx';

vi.mock('../lib/api', () => {
  const apiGet = vi.fn(async (path) => {
    if (path === '/deals') return { ok: true, items: [] };
    if (path === '/users/profile') {
      return {
        ok: true,
        user: {
          email: 't@example.com',
          preferences: { defaultCountry: 'Kenya', defaultCurrency: 'USD', defaultWalletAddress: '' },
        },
      };
    }
    if (path === '/deals/drafts') return { ok: true, draft: null };
    return { ok: true };
  });
  const apiPost = vi.fn(async () => ({ ok: true, item: { _id: '1' } }));
  const apiPut = vi.fn(async () => ({ ok: true, user: { preferences: {} } }));
  const apiDelete = vi.fn(async () => ({ ok: true }));
  return { apiGet, apiPost, apiPut, apiDelete };
});

describe('DealsPage', () => {
  it('adds payment and milestone rows', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <DealsPage />
      </MemoryRouter>
    );

    // Payment schedule has "Label" inputs; should start with 3.
    expect(screen.getAllByPlaceholderText('Label').length).toBe(3);
    await user.click(screen.getByRole('button', { name: '+ Add payment' }));
    expect(screen.getAllByPlaceholderText('Label').length).toBe(4);

    // Milestones have "Milestone title" inputs; should start with 2.
    expect(screen.getAllByPlaceholderText('Milestone title').length).toBe(2);
    await user.click(screen.getByRole('button', { name: '+ Add milestone' }));
    expect(screen.getAllByPlaceholderText('Milestone title').length).toBe(3);
  });
});

