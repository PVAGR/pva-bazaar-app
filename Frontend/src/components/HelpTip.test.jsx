import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HelpTip from './HelpTip.jsx';

describe('HelpTip', () => {
  it('opens, closes with Escape, and closes on outside click', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <HelpTip title="Test title" body="Test body" example="Example value" />
        <button type="button">outside</button>
      </div>,
    );

    expect(screen.queryByText('Test body')).toBeNull();
    await user.click(screen.getByRole('button', { name: '?' }));
    expect(screen.getByText('Test body')).toBeTruthy();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText('Test body')).toBeNull();

    await user.click(screen.getByRole('button', { name: '?' }));
    expect(screen.getByText('Test body')).toBeTruthy();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText('Test body')).toBeNull();
  });
});
