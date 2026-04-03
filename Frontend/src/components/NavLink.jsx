import React from 'react';
import { Link } from 'react-router-dom';

/**
 * NavLink - Simple wrapper around react-router-dom Link
 * Allows hash-based navigation for PVA's HashRouter setup
 */
export default function NavLink({ to, children, className, ...props }) {
  return (
    <Link to={to} className={className} {...props}>
      {children}
    </Link>
  );
}
