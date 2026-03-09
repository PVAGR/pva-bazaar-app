import React, { useState } from 'react';
import { ENV } from '../config/env';
import './ApiDocsTab.css';

/**
 * ApiDocsTab
 * 
 * Comprehensive API documentation with direct links, examples, and contact info.
 * Shows all available endpoints with copy-to-clipboard functionality.
 */
export default function ApiDocsTab() {
  const [copiedEndpoint, setCopiedEndpoint] = useState(null);
  const [expandedCategory, setExpandedCategory] = useState('artifacts');

  const apiBase = ENV.API_URL || 'http://localhost:5001';

  const copyToClipboard = (text, endpoint) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedEndpoint(endpoint);
      setTimeout(() => setCopiedEndpoint(null), 2000);
    });
  };

  const apiCategories = [
    {
      id: 'artifacts',
      name: '🎨 Artifacts API',
      description: 'Manage artisan marketplace artifacts and NFTs',
      endpoints: [
        {
          method: 'GET',
          path: '/api/artifacts',
          description: 'Get all artifacts (with optional filters)',
          auth: 'None',
          params: 'category, origin, minPrice, maxPrice',
          example: `${apiBase}/api/artifacts?category=textiles&origin=Kenya`
        },
        {
          method: 'GET',
          path: '/api/artifacts/:id',
          description: 'Get a specific artifact by ID',
          auth: 'None',
          example: `${apiBase}/api/artifacts/507f1f77bcf86cd799439011`
        },
        {
          method: 'POST',
          path: '/api/artifacts',
          description: 'Create a new artifact',
          auth: 'Required (JWT)',
          body: {
            name: 'Maasai Beaded Necklace',
            description: 'Traditional beadwork...',
            price: 150,
            category: 'jewelry',
            origin: 'Kenya'
          }
        },
        {
          method: 'PUT',
          path: '/api/artifacts/:id',
          description: 'Update an artifact',
          auth: 'Required (JWT)',
          body: { price: 175 }
        },
        {
          method: 'DELETE',
          path: '/api/artifacts/:id',
          description: 'Delete an artifact',
          auth: 'Required (JWT)'
        }
      ]
    },
    {
      id: 'users',
      name: '👥 Users API',
      description: 'User account management',
      endpoints: [
        {
          method: 'GET',
          path: '/api/users/me',
          description: 'Get current user profile',
          auth: 'Required (JWT)',
          example: `${apiBase}/api/users/me`
        },
        {
          method: 'PUT',
          path: '/api/users/me',
          description: 'Update current user profile',
          auth: 'Required (JWT)',
          body: { name: 'John Doe', email: 'john@example.com' }
        },
        {
          method: 'GET',
          path: '/api/users/:id',
          description: 'Get user by ID (public profile)',
          auth: 'None',
          example: `${apiBase}/api/users/507f1f77bcf86cd799439011`
        }
      ]
    },
    {
      id: 'auth',
      name: '🔐 Authentication API',
      description: 'User authentication and authorization',
      endpoints: [
        {
          method: 'POST',
          path: '/api/auth/register',
          description: 'Register a new user account',
          auth: 'None',
          body: {
            name: 'Jane Smith',
            email: 'jane@example.com',
            password: 'SecurePass123!'
          }
        },
        {
          method: 'POST',
          path: '/api/auth/login',
          description: 'Login with email and password',
          auth: 'None',
          body: {
            email: 'jane@example.com',
            password: 'SecurePass123!'
          },
          response: {
            token: 'eyJhbGciOiJIUzI1NiIsInR5...',
            user: { id: '...', name: 'Jane Smith', email: 'jane@example.com' }
          }
        },
        {
          method: 'POST',
          path: '/api/auth/logout',
          description: 'Logout current user',
          auth: 'Required (JWT)'
        },
        {
          method: 'POST',
          path: '/api/auth/refresh',
          description: 'Refresh authentication token',
          auth: 'Required (JWT)'
        }
      ]
    },
    {
      id: 'admin',
      name: '⚡ Admin API',
      description: 'Administrative operations (admin-only)',
      endpoints: [
        {
          method: 'GET',
          path: '/api/admin/users',
          description: 'Get all users with pagination',
          auth: 'Required (Admin)',
          params: 'page, limit, search, sortBy, order',
          example: `${apiBase}/api/admin/users?page=1&limit=20&search=john`
        },
        {
          method: 'GET',
          path: '/api/admin/users/:id',
          description: 'Get detailed user information',
          auth: 'Required (Admin)',
          example: `${apiBase}/api/admin/users/507f1f77bcf86cd799439011`
        },
        {
          method: 'PUT',
          path: '/api/admin/users/:id',
          description: 'Update user profile (admin)',
          auth: 'Required (Admin)',
          body: { name: 'Updated Name', email: 'updated@example.com' }
        },
        {
          method: 'DELETE',
          path: '/api/admin/users/:id',
          description: 'Delete user (admin protection applies)',
          auth: 'Required (Admin)'
        },
        {
          method: 'GET',
          path: '/api/admin/stats',
          description: 'Get dashboard statistics',
          auth: 'Required (Admin)',
          example: `${apiBase}/api/admin/stats`,
          response: {
            totalUsers: 150,
            activeUsers: 140,
            adminUsers: 3,
            newUsersThisMonth: 12,
            growthRate: '8.7'
          }
        }
      ]
    },
    {
      id: 'archive',
      name: '📚 Archive API',
      description: 'Archive entry management',
      endpoints: [
        {
          method: 'GET',
          path: '/api/archive',
          description: 'Get all archive entries',
          auth: 'None',
          example: `${apiBase}/api/archive`
        },
        {
          method: 'GET',
          path: '/api/archive/:slug',
          description: 'Get archive entry by slug',
          auth: 'None',
          example: `${apiBase}/api/archive/man-from-taured`
        },
        {
          method: 'POST',
          path: '/api/archive',
          description: 'Create new archive entry',
          auth: 'Required (Admin)',
          body: {
            title: 'New Archive Entry',
            category: 'Research',
            content: 'Entry content...',
            description: 'Brief description'
          }
        }
      ]
    },
    {
      id: 'verification',
      name: '✅ Verification API',
      description: 'Artifact verification and provenance',
      endpoints: [
        {
          method: 'GET',
          path: '/api/verification/artifact/:idOrSlug',
          description: 'Get verification status for artifact',
          auth: 'None',
          example: `${apiBase}/api/verification/artifact/maasai-necklace-001`
        },
        {
          method: 'POST',
          path: '/api/verification/submit',
          description: 'Submit artifact for verification',
          auth: 'Required (JWT)',
          body: {
            artifactId: '507f1f77bcf86cd799439011',
            evidence: ['photo1.jpg', 'certificate.pdf']
          }
        }
      ]
    },
    {
      id: 'health',
      name: '💚 Health & Monitoring',
      description: 'System health checks and monitoring',
      endpoints: [
        {
          method: 'GET',
          path: '/api/health',
          description: 'Basic health check',
          auth: 'None',
          example: `${apiBase}/api/health`,
          response: {
            ok: true,
            status: 'healthy',
            timestamp: '2026-03-09T12:00:00Z'
          }
        },
        {
          method: 'GET',
          path: '/api/health/db',
          description: 'Database connection health',
          auth: 'None',
          example: `${apiBase}/api/health/db`
        },
        {
          method: 'GET',
          path: '/api/health/watchdog',
          description: 'OpenClaw watchdog status',
          auth: 'Required (Admin)',
          example: `${apiBase}/api/health/watchdog`
        }
      ]
    }
  ];

  const contactInfo = {
    support: 'support@pvabazaar.org',
    technical: 'dev@pvabazaar.org',
    business: 'partnerships@pvabazaar.org',
    github: 'https://github.com/PVAGR/pva-bazaar-app',
    website: 'https://pvabazaar.org'
  };

  return (
    <div className="api-docs-tab">
      <div className="api-docs-header">
        <h2>🔗 API Documentation</h2>
        <p>Complete reference for PVA Bazaar API endpoints with direct links</p>
      </div>

      {/* Quick Info Panel */}
      <div className="quick-info-panel">
        <div className="info-item">
          <span className="info-label">Base URL:</span>
          <code className="api-base-url">{apiBase}</code>
          <button
            className="btn-copy-small"
            onClick={() => copyToClipboard(apiBase, 'base-url')}
            title="Copy base URL"
          >
            {copiedEndpoint === 'base-url' ? '✓' : '📋'}
          </button>
        </div>
        <div className="info-item">
          <span className="info-label">Authentication:</span>
          <code>Bearer TOKEN</code>
        </div>
        <div className="info-item">
          <span className="info-label">Content-Type:</span>
          <code>application/json</code>
        </div>
      </div>

      {/* API Categories */}
      <div className="api-categories">
        {apiCategories.map((category) => (
          <div key={category.id} className="api-category">
            <button
              className={`category-header ${expandedCategory === category.id ? 'expanded' : ''}`}
              onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
            >
              <span className="category-name">{category.name}</span>
              <span className="category-description">{category.description}</span>
              <span className="expand-icon">{expandedCategory === category.id ? '▼' : '▶'}</span>
            </button>

            {expandedCategory === category.id && (
              <div className="category-endpoints">
                {category.endpoints.map((endpoint, idx) => (
                  <div key={idx} className="endpoint-card">
                    <div className="endpoint-header">
                      <span className={`http-method method-${endpoint.method.toLowerCase()}`}>
                        {endpoint.method}
                      </span>
                      <code className="endpoint-path">{endpoint.path}</code>
                      <button
                        className="btn-copy"
                        onClick={() => copyToClipboard(
                          endpoint.example || `${apiBase}${endpoint.path}`,
                          `${category.id}-${idx}`
                        )}
                        title="Copy full URL"
                      >
                        {copiedEndpoint === `${category.id}-${idx}` ? '✓ Copied' : '📋 Copy'}
                      </button>
                    </div>

                    <p className="endpoint-description">{endpoint.description}</p>

                    <div className="endpoint-details">
                      <div className="detail-row">
                        <span className="detail-label">Auth:</span>
                        <span className={`auth-badge ${endpoint.auth === 'None' ? 'auth-none' : 'auth-required'}`}>
                          {endpoint.auth}
                        </span>
                      </div>

                      {endpoint.params && (
                        <div className="detail-row">
                          <span className="detail-label">Query Params:</span>
                          <code>{endpoint.params}</code>
                        </div>
                      )}

                      {endpoint.example && (
                        <div className="detail-row">
                          <span className="detail-label">Example URL:</span>
                          <div className="example-url">
                            <code>{endpoint.example}</code>
                          </div>
                        </div>
                      )}

                      {endpoint.body && (
                        <div className="detail-row">
                          <span className="detail-label">Request Body:</span>
                          <pre className="code-block">
                            {JSON.stringify(endpoint.body, null, 2)}
                          </pre>
                        </div>
                      )}

                      {endpoint.response && (
                        <div className="detail-row">
                          <span className="detail-label">Response:</span>
                          <pre className="code-block">
                            {JSON.stringify(endpoint.response, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Contact Information */}
      <div className="contact-section">
        <h3>📞 Contact & Resources</h3>
        <div className="contact-grid">
          <div className="contact-item">
            <span className="contact-icon">📧</span>
            <div className="contact-details">
              <strong>Support</strong>
              <a href={`mailto:${contactInfo.support}`}>{contactInfo.support}</a>
            </div>
          </div>
          <div className="contact-item">
            <span className="contact-icon">💻</span>
            <div className="contact-details">
              <strong>Technical</strong>
              <a href={`mailto:${contactInfo.technical}`}>{contactInfo.technical}</a>
            </div>
          </div>
          <div className="contact-item">
            <span className="contact-icon">🤝</span>
            <div className="contact-details">
              <strong>Partnerships</strong>
              <a href={`mailto:${contactInfo.business}`}>{contactInfo.business}</a>
            </div>
          </div>
          <div className="contact-item">
            <span className="contact-icon">🌐</span>
            <div className="contact-details">
              <strong>Website</strong>
              <a href={contactInfo.website} target="_blank" rel="noopener noreferrer">
                pvabazaar.org
              </a>
            </div>
          </div>
          <div className="contact-item">
            <span className="contact-icon">📦</span>
            <div className="contact-details">
              <strong>GitHub</strong>
              <a href={contactInfo.github} target="_blank" rel="noopener noreferrer">
                pva-bazaar-app
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Guide */}
      <div className="usage-guide">
        <h3>🚀 Quick Start Guide</h3>
        <div className="guide-steps">
          <div className="guide-step">
            <span className="step-number">1</span>
            <div className="step-content">
              <strong>Authentication</strong>
              <p>Register or login to get your JWT token. Include it in requests:</p>
              <code>Authorization: Bearer YOUR_TOKEN_HERE</code>
            </div>
          </div>
          <div className="guide-step">
            <span className="step-number">2</span>
            <div className="step-content">
              <strong>Make Requests</strong>
              <p>Use fetch or axios with the base URL and endpoint path:</p>
              <code>fetch('{apiBase}/api/artifacts')</code>
            </div>
          </div>
          <div className="guide-step">
            <span className="step-number">3</span>
            <div className="step-content">
              <strong>Handle Responses</strong>
              <p>All responses are JSON. Check the <code>ok</code> field for success:</p>
              <code>{`{ok: true, data: {...}}`}</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
