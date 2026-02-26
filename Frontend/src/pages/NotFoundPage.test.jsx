import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import NotFoundPage from './NotFoundPage.jsx';

describe('NotFoundPage', () => {
  it('renders 404 message and nav links', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: '404' })).toBeInTheDocument();
    expect(screen.getByText(/This page doesn't exist/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to Archive/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /Marketplace/i })).toBeInTheDocument();
  });
});
