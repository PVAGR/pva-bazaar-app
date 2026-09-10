import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getToken } from '../lib/auth';
import { createLogger } from '../lib/logger';

const logger = createLogger('RequireAdminAuth');

function decodeTokenRole(token) {
  try {
    const value = String(token || '');
    if (!value || value.startsWith('local.')) return '';
    const parts = value.split('.');
    if (parts.length !== 3) return '';
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    return String(payload?.role || '');
  } catch (_err) {
    return '';
  }
}

/**
 * RequireAdminAuth - Guards admin-only routes.
 *
 * SECURITY: Admin UI only renders for a token that actually carries the
 * `admin` role claim. Actual authorization is always re-enforced by the
 * backend; this guard prevents non-admins from reaching admin surfaces and
 * redirects them to the admin login/bootstrap shell.
 */
export default function RequireAdminAuth({ children }) {
  const location = useLocation();
  const token = getToken();
  const adminToken =
    typeof window !== 'undefined'
      ? (window.localStorage.getItem('admin:token') || window.localStorage.getItem('admin_token') || '')
      : '';
  const candidate = adminToken || token;
  const isAdmin = decodeTokenRole(candidate) === 'admin';

  if (!isAdmin) {
    logger.warn('Unauthorized non-admin access attempt to admin dashboard');
    const requestedPath = `${location.pathname || '/admin'}${location.search || ''}`;
    return <Navigate to={`/admin?next=${encodeURIComponent(requestedPath)}`} replace />;
  }

  return children;
}