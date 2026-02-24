import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import TemplatesPage from './TemplatesPage.jsx';

vi.mock('../lib/api', () => ({
  apiGet: vi.fn(async (path) => {
    if (path === '/templates') return { ok: true, items: [{ _id: '1', name: 'Coffee Vetting', type: 'vetting', body: 'What is FOB?' }] };
    if (path === '/templates/1') return { ok: true, item: { _id: '1', name: 'Coffee Vetting', type: 'vetting', body: 'What is FOB?' } };
    if (path === '/contacts') return { ok: true, items: [] };
    if (path === '/commodities') return { ok: true, items: [] };
    return { ok: true, items: [] };
  }),
  apiPost: vi.fn(async () => ({ ok: true, item: { _id: '2', name: 'New Template' } })),
  apiPut: vi.fn(async () => ({ ok: true, item: {} })),
  apiDelete: vi.fn(async () => ({ ok: true })),
}));

describe('TemplatesPage', () => {
  it('renders and loads templates list', async () => {
    render(
      <MemoryRouter>
        <TemplatesPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Coffee Vetting')).toBeInTheDocument();
    expect(screen.getByText(/Copy-paste vetting prompts/i)).toBeInTheDocument();
  });

  it('has Copy and Use with contact actions per template', async () => {
    render(
      <MemoryRouter>
        <TemplatesPage />
      </MemoryRouter>
    );

    await screen.findByText('Coffee Vetting');
    expect(screen.getByRole('button', { name: /Copy/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Use with contact/i }).length).toBeGreaterThan(0);
  });
});
