import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import ChatPage from './ChatPage.jsx';

vi.mock('../lib/api', () => ({
  apiPost: vi.fn(async (path, body) => {
    if (path === '/chat' && body?.messages?.length) {
      return { ok: true, reply: "I'm Richard. Reach me at pvaglobalreach@gmail.com or pvabazaar.com." };
    }
    throw new Error('Chat failed');
  }),
}));

vi.mock('../lib/auth', () => ({
  getToken: vi.fn(() => null),
}));

describe('ChatPage', () => {
  it('renders header and welcome message', () => {
    render(
      <MemoryRouter>
        <ChatPage />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: /Chat with Richard/i })).toBeInTheDocument();
    expect(screen.getByText(/Direct supply chain sourcer/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ask Richard/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send/i })).toBeInTheDocument();
  });

  it('sends message and displays reply', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ChatPage />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/Ask Richard/i);
    await user.type(input, 'How do I vet a coffee supplier?');
    await user.click(screen.getByRole('button', { name: /Send/i }));

    expect(await screen.findByText(/How do I vet a coffee supplier?/)).toBeInTheDocument();
    expect(await screen.findByText("I'm Richard. Reach me at pvaglobalreach@gmail.com or pvabazaar.com.")).toBeInTheDocument();
  });

  it('disables send when input is empty', () => {
    render(
      <MemoryRouter>
        <ChatPage />
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: /Send/i })).toBeDisabled();
  });

  it('has back link to pvabazaar.org', () => {
    render(
      <MemoryRouter>
        <ChatPage />
      </MemoryRouter>
    );
    const backLink = screen.getByRole('link', { name: /pvabazaar\.org/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute('href', '/');
  });
});
