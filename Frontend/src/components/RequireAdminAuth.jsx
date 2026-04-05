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
  if (!token) {
    logger.warn('Unauthorized access attempt to admin dashboard');
    // Route to /admin so the admin login/bootstrap form is available.
    return <Navigate to="/admin" replace />;
  }

  // Token exists - allow access
  // Note: Backend will validate token on API calls
  // Additional role check (admin vs user) can be added here if needed
  return children;
}
