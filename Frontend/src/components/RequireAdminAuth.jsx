import React from 'react';
import { Navigate } from 'react-router-dom';
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
  const token = getToken();
  const adminSession = sessionStorage.getItem('admin-auth');
  const adminSessionVersion = sessionStorage.getItem('admin-auth-version');

  if (!token || adminSession !== 'authenticated' || adminSessionVersion !== 'v2') {
    logger.warn('Unauthorized access attempt to admin dashboard');
    // Redirect to home, not login (admin signup is at /admin login page)
    return <Navigate to="/" replace />;
  }

  // Token exists - allow access
  // Note: Backend will validate token on API calls
  // Additional role check (admin vs user) can be added here if needed
  return children;
}
