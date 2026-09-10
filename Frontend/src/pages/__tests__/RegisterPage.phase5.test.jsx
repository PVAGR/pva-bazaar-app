import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import RegisterPage from '../RegisterPage.jsx';

const mocks = vi.hoisted(() => ({
  apiPost: vi.fn(),
}));

vi.mock('../../lib/api.js', () => ({ apiPost: mocks.apiPost }));
vi.mock('../../hooks/useConnectionMode.js', () => ({
  default: () => ({ status: 'live', label: 'Live', detail: 'ok', checkedAt: null }),
}));
vi.mock('../../hooks/useArchiveTheme.js', () => ({
  default: () => ({ darkMode: false, toggleTheme: vi.fn() }),
}));

function renderRegister() {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/onboarding" element={<div>ONBOARDING-SCREEN</div>} />
          <Route path="/login" element={<div>LOGIN-SCREEN</div>} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

async function fillAndSubmit(user, container) {
  const inputs = container.querySelectorAll('input:not([type]), input[type="password"]');
  const nameInput = inputs[0];
  const emailInput = inputs[1];
  const passwordInput = container.querySelector('input[type="password"]');
  await user.type(nameInput, 'Test Person');
  await user.type(emailInput, 'someone@example.com');
  await user.type(passwordInput, 'long-enough-secret');
  await user.click(screen.getByRole('button', { name: /create account/i }));
}

beforeEach(() => {
  mocks.apiPost.mockReset();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('RegisterPage (server-authoritative registration)', () => {
  it('shows an error on server failure and never creates a device account or token', async () => {
    const user = userEvent.setup();
    mocks.apiPost.mockRejectedValue(new Error('Backend request failed'));

    const { container } = renderRegister();
    await fillAndSubmit(user, container);

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByText('ONBOARDING-SCREEN')).toBeNull();
    expect(window.localStorage.getItem('token')).toBeNull();
    expect(window.localStorage.getItem('pva:local-auth-current-v1')).toBeNull();
    expect(window.localStorage.getItem('pva:local-auth-accounts-v1')).toBeNull();
  });

  it('surfaces the server duplicate-account error and does not proceed', async () => {
    const user = userEvent.setup();
    mocks.apiPost.mockRejectedValue({ response: { data: { message: 'User already exists' } } });

    const { container } = renderRegister();
    await fillAndSubmit(user, container);

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('User already exists'));
    expect(window.localStorage.getItem('token')).toBeNull();
  });

  it('stores only the server token on successful registration', async () => {
    const user = userEvent.setup();
    mocks.apiPost.mockResolvedValue({ ok: true, token: 'srv.payload.sig', user: { id: 'a'.repeat(24) } });

    const { container } = renderRegister();
    await fillAndSubmit(user, container);

    expect(window.localStorage.getItem('token')).toBe('srv.payload.sig');
    expect(await screen.findByText('ONBOARDING-SCREEN')).toBeTruthy();
  });
});