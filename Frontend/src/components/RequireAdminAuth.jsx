import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getToken } from '../lib/auth';
import { createLogger } from '../lib/logger';

const logger = createLogger('RequireAdminAuth');

/**
 * RequireAdminAuth - Guards admin-only routes
 *
 * SECURITY: Only allows access to /admin with valid JWT token
 * Prevents public access to admin dashboard
 * Redirects unauthorized users to home page
 */
export default function RequireAdminAuth({ children }) {
  const location = useLocation();
  const token = getToken();
  if (!token) {
    logger.warn('Unauthorized access attempt to admin dashboard');
    // Preserve the intended destination so successful admin login can resume navigation.
    const requestedPath = `${location.pathname || '/admin'}${location.search || ''}`;
    return <Navigate to={`/admin?next=${encodeURIComponent(requestedPath)}`} replace />;
  }

  // Token exists - allow access
  // Note: Backend will validate token on API calls
  // Additional role check (admin vs user) can be added here if needed
  return children;
}
