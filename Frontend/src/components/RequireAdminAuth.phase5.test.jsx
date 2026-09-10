import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RequireAdminAuth from './RequireAdminAuth.jsx';

function b64url(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function fakeJwt(payload) {
  return `header.${b64url(payload)}.signature`;
}

function renderGuard(seedToken) {
  window.localStorage.clear();
  if (seedToken !== undefined) {
    window.localStorage.setItem('token', seedToken);
  }
  return render(
    <MemoryRouter initialEntries={['/admin/orders']}>
      <Routes>
        <Route path="/admin" element={<div>ADMIN-GATE</div>} />
        <Route
          path="/admin/orders"
          element={
            <RequireAdminAuth>
              <div>SECRET-ADMIN-UI</div>
            </RequireAdminAuth>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
});

describe('RequireAdminAuth (admin UI is authority-gated)', () => {
  it('redirects to the admin shell when no token exists', () => {
    renderGuard('');
    expect(screen.queryByText('SECRET-ADMIN-UI')).toBeNull();
    expect(screen.getByText('ADMIN-GATE')).toBeTruthy();
  });

  it('redirects a normal user token even though a token exists', () => {
    renderGuard(fakeJwt({ id: 'someuser', role: 'user' }));
    expect(screen.queryByText('SECRET-ADMIN-UI')).toBeNull();
    expect(screen.getByText('ADMIN-GATE')).toBeTruthy();
  });

  it('never treats a browser-fabricated local token as admin', () => {
    renderGuard(`local.${btoa(JSON.stringify({ local: true, id: '1', role: 'admin' }))}`);
    expect(screen.queryByText('SECRET-ADMIN-UI')).toBeNull();
    expect(screen.getByText('ADMIN-GATE')).toBeTruthy();
  });

  it('renders children for a token that carries the admin role claim', () => {
    renderGuard(fakeJwt({ id: 'admin-id', role: 'admin' }));
    expect(screen.getByText('SECRET-ADMIN-UI')).toBeTruthy();
  });
});