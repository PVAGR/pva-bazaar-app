import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import LoginPage from '../LoginPage.jsx';

const mocks = vi.hoisted(() => ({
  apiPost: vi.fn(),
  apiGet: vi.fn(),
}));

vi.mock('../../lib/api.js', () => ({ apiPost: mocks.apiPost, apiGet: mocks.apiGet }));
vi.mock('../../hooks/useConnectionMode.js', () => ({
  default: () => ({ status: 'live', label: 'Live', detail: 'ok', checkedAt: null }),
}));
vi.mock('../../hooks/useArchiveTheme.js', () => ({
  default: () => ({ darkMode: false, toggleTheme: vi.fn() }),
}));

function renderLogin() {
  const utils = render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/onboarding" element={<div>ONBOARDING-SCREEN</div>} />
          <Route path="/account" element={<div>ACCOUNT-SCREEN</div>} />
          <Route path="/admin" element={<div>ADMIN-SCREEN</div>} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
  return utils;
}

beforeEach(() => {
  mocks.apiPost.mockReset();
  mocks.apiGet.mockReset();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('LoginPage (server-authoritative sign-in)', () => {
  it('shows an error on server failure and never signs the user in', async () => {
    const user = userEvent.setup();
    mocks.apiPost.mockRejectedValue(new Error('Connection is down right now.'));

    const { container } = renderLogin();
    await user.type(container.querySelector('input[autocomplete="username"]'), 'someone@example.com');
    await user.type(container.querySelector('input[autocomplete="current-password"]'), 'secret-password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByText('ONBOARDING-SCREEN')).toBeNull();
    expect(screen.queryByText('ACCOUNT-SCREEN')).toBeNull();
    expect(window.localStorage.getItem('token')).toBeNull();
    expect(window.sessionStorage.getItem('admin-auth')).toBeNull();
  });

  it('does not create a fake device account when the server rejects the password', async () => {
    const user = userEvent.setup();
    mocks.apiPost.mockRejectedValue({ response: { data: { message: 'Invalid username or password' } } });

    const { container } = renderLogin();
    await user.type(container.querySelector('input[autocomplete="username"]'), 'someone@example.com');
    await user.type(container.querySelector('input[autocomplete="current-password"]'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Invalid username or password'));
    // No local "account" was silently created on the device.
    expect(window.localStorage.getItem('pva:local-auth-current-v1')).toBeNull();
    expect(window.localStorage.getItem('pva:local-auth-accounts-v1')).toBeNull();
  });

  it('stores only the server token on success', async () => {
    const user = userEvent.setup();
    mocks.apiPost.mockResolvedValue({ ok: true, token: 'srv.payload.sig', user: { role: 'user' } });
    mocks.apiGet.mockResolvedValue({ user: { preferences: { onboarding: { dismissedAt: 'yes' } } } });

    const { container } = renderLogin();
    await user.type(container.querySelector('input[autocomplete="username"]'), 'someone@example.com');
    await user.type(container.querySelector('input[autocomplete="current-password"]'), 'secret-password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(window.localStorage.getItem('token')).toBe('srv.payload.sig');
    expect(await screen.findByText('ACCOUNT-SCREEN')).toBeTruthy();
  });

  it('routes server-confirmed admins to the admin shell', async () => {
    const user = userEvent.setup();
    mocks.apiPost.mockResolvedValue({ ok: true, token: 'srv.payload.sig', user: { role: 'admin' } });

    const { container } = renderLogin();
    await user.type(container.querySelector('input[autocomplete="username"]'), 'owner@example.com');
    await user.type(container.querySelector('input[autocomplete="current-password"]'), 'owner-password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('ADMIN-SCREEN')).toBeTruthy();
    expect(window.sessionStorage.getItem('admin-auth')).toBe('authenticated');
  });
});