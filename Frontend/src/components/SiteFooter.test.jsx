import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import SiteFooter from './SiteFooter.jsx';

describe('SiteFooter', () => {
  it('renders nav links and Back to top', () => {
    render(
      <MemoryRouter>
        <SiteFooter />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: /Archive/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /Marketplace/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /About/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Back to top/i })).toBeInTheDocument();
  });

  it('Back to top scrolls to top when clicked', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SiteFooter />
      </MemoryRouter>
    );
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo;
    await user.click(screen.getByRole('button', { name: /Back to top/i }));
    expect(scrollTo).toHaveBeenCalled();
    expect(scrollTo.mock.calls[0][0]).toEqual({ top: 0, behavior: expect.stringMatching(/^(smooth|auto)$/) });
  });
});
