import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import ShareButton from './ShareButton.jsx';

describe('ShareButton', () => {
  it('renders Share button', () => {
    render(<ShareButton />);
    expect(screen.getByRole('button', { name: /Share this page/i })).toBeInTheDocument();
  });

  it('clicking triggers share or copy (shows Copied when no navigator.share)', async () => {
    const user = userEvent.setup();
    render(<ShareButton url="https://example.com" />);
    await user.click(screen.getByRole('button', { name: /Share this page/i }));
    // Without navigator.share, fallback copies to clipboard and shows "✓ Copied"
    expect(screen.getByRole('button', { name: /Copied/i })).toBeInTheDocument();
  });
});
