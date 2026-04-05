/**
 * Cloud Storage Admin Tab
 * Universal cloud storage management with one-click buttons
 */

import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiDelete, apiUpload } from '../lib/api';
import { createLogger } from '../lib/logger';
import LoadingSpinner, { LoadingDots } from './LoadingSpinner';
import './CloudStorageTab.css';

const logger = createLogger('CloudStorageTab');

export default function CloudStorageTab() {
  const [providers, setProviders] = useState(null);
  const [cloudinaryStatus, setCloudinaryStatus] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadingTo, setUploadingTo] = useState(null);
  const [error, setError] = useState(null);
  const [providerError, setProviderError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [activeProvider, setActiveProvider] = useState('local');

  useEffect(() => {
    loadProviders();
    loadCloudinaryStatus();
    loadFiles();
  }, []);

  const loadProviders = async () => {
    setProviderError(null);
    try {
      const data = await apiGet('/cloud-storage/providers');
      if (data.ok) {
        setProviders(data.providers);
      } else {
        setProviderError(data?.message || 'Unable to load storage provider configuration.');
      }
    } catch (err) {
      logger.error('Load providers error:', err);
      setProviderError('Unable to load storage provider configuration. Please retry.');
    }
  };

  const loadFiles = async () => {
    try {
      const data = await apiGet('/cloud-storage/files');
      if (data.ok) {
        setFiles(data.files);
      }
    } catch (err) {
      logger.error('Load files error:', err);
    }
  };

  const loadCloudinaryStatus = async () => {
    try {
      const data = await apiGet('/cloud-storage/status');
      if (data.ok && data.cloudinary) {
        setCloudinaryStatus(data.cloudinary);
      }
    } catch (err) {
      logger.error('Load Cloudinary status error:', err);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
      setSuccess(null);
    }
  };

  const handleUpload = async (provider) => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    setUploadingTo(provider);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const data = await apiUpload(`/api/cloud-storage/upload/${provider}`, formData);

      if (data.ok) {
        setSuccess(`✅ Uploaded to ${provider.toUpperCase()}: ${data.url}`);
        setSelectedFile(null);
        document.getElementById('file-input').value = '';
        loadCloudinaryStatus();
        loadFiles();
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingTo(null);
    }
  };

  const handleDelete = async (file) => {
    if (!confirm(`Delete ${file.name} from ${file.provider}?`)) return;

    setLoading(true);
    try {
      const id = file.ipfsHash || file.publicId || file.name;
      const data = await apiDelete(`/cloud-storage/delete/${file.provider}/${id}`);
      
      if (data.ok) {
        setSuccess(`Deleted ${file.name}`);
        loadFiles();
      } else {
        setError(data.error || 'Delete failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (provider) => {
    setLoading(true);
    try {
      const data = await apiPost(`/cloud-storage/test-connection/${provider}`);
      if (data.connected) {
        setSuccess(`✅ ${providers[provider].name} is connected and working!`);
        loadCloudinaryStatus();
      } else {
        setError(`❌ ${providers[provider].name} connection failed: ${data.message}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openSignup = (url) => {
    window.open(url, '_blank');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
  };

  if (!providers) {
    return (
      <div className="cloud-storage-tab" role="tabpanel" id="cloud-panel">
        {providerError ? (
          <div className="alert alert-error">
            ❌ {providerError}
            <button onClick={loadProviders}>↻</button>
          </div>
        ) : (
          <LoadingSpinner />
        )}
      </div>
    );
  }

  return (
    <div className="cloud-storage-tab" role="tabpanel" id="cloud-panel">
      <div className="tab-header">
        <h2>☁️ Cloud Storage Management</h2>
        <p>Connect and manage files across multiple cloud providers with one-click buttons</p>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="alert alert-error">
          ❌ {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          {success}
          <button onClick={() => setSuccess(null)}>×</button>
        </div>
      )}
      {providerError && (
        <div className="alert alert-error">
          ⚠️ {providerError}
          <button onClick={loadProviders}>↻</button>
        </div>
      )}

      {cloudinaryStatus && (
        <div className={`alert ${cloudinaryStatus.configured ? 'alert-success' : 'alert-error'}`}>
          {cloudinaryStatus.configured
            ? '☁️ Cloudinary backend is connected.'
            : `☁️ Cloudinary backend is not configured. Missing: ${cloudinaryStatus.missingVars.join(', ')}`}
          <button onClick={loadCloudinaryStatus}>↻</button>
        </div>
      )}

      {/* Upload Section */}
      <section className="upload-section">
        <h3>📤 Upload Files</h3>
        <div className="upload-box">
          <input 
            type="file" 
            id="file-input"
            onChange={handleFileSelect}
            className="file-input"
          />
          <label htmlFor="file-input" className="file-label">
            {selectedFile ? `📎 ${selectedFile.name}` : '📁 Choose file to upload'}
          </label>

          {selectedFile && (
            <div className="upload-buttons">
              <button 
                onClick={() => handleUpload('local')}
                disabled={uploadingTo}
                className="btn btn-upload"
              >
                {uploadingTo === 'local' ? <LoadingDots /> : '💾 Upload Local'}
              </button>

              <button 
                onClick={() => handleUpload('cloudinary')}
                disabled={uploadingTo || !providers.cloudinary.configured}
                className="btn btn-upload"
                title={!providers.cloudinary.configured ? 'Configure Cloudinary first' : ''}
              >
                {uploadingTo === 'cloudinary' ? <LoadingDots /> : '☁️ Upload Cloudinary'}
              </button>

              <button 
                onClick={() => handleUpload('pinata')}
                disabled={uploadingTo || !providers.pinata.configured}
                className="btn btn-upload"
                title={!providers.pinata.configured ? 'Configure Pinata first' : ''}
              >
                {uploadingTo === 'pinata' ? <LoadingDots /> : '🌐 Upload IPFS'}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Providers Grid */}
      <section className="providers-section">
        <h3>🔌 Cloud Providers</h3>
        <div className="providers-grid">
          {Object.entries(providers).map(([key, provider]) => (
            <div key={key} className={`provider-card ${provider.status}`}>
              <div className="provider-header">
                <h4>{provider.name}</h4>
                <span className={`status-badge ${provider.status}`}>
                  {provider.status === 'connected' ? '✅ Connected' : '⚪ Not Configured'}
                </span>
              </div>

              <div className="provider-features">
                {provider.features.map((feature, i) => (
                  <span key={i} className="feature-tag">{feature}</span>
                ))}
              </div>

              <div className="provider-actions">
                {provider.signupUrl && (
                  <button 
                    onClick={() => openSignup(provider.signupUrl)}
                    className="btn btn-signup"
                  >
                    🚀 Sign Up Free
                  </button>
                )}

                {provider.dashboardUrl && (
                  <button 
                    onClick={() => openSignup(provider.dashboardUrl)}
                    className="btn btn-secondary"
                  >
                    📊 Dashboard
                  </button>
                )}

                {provider.status === 'connected' && (
                  <button 
                    onClick={() => handleTestConnection(key)}
                    className="btn btn-test"
                    disabled={loading}
                  >
                    🔍 Test Connection
                  </button>
                )}

                {provider.docsUrl && (
                  <button 
                    onClick={() => openSignup(provider.docsUrl)}
                    className="btn btn-docs"
                  >
                    📚 Docs
                  </button>
                )}
              </div>

              {!provider.configured && provider.name !== 'Local Storage' && (
                <div className="config-hint">
                  ⚠️ Add environment variables to connect
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Files List */}
      <section className="files-section">
        <div className="section-header">
          <h3>📂 Uploaded Files ({files.length})</h3>
          <button onClick={loadFiles} className="btn btn-refresh" disabled={loading}>
            {loading ? <LoadingDots /> : '🔄 Refresh'}
          </button>
        </div>

        {files.length === 0 ? (
          <div className="empty-state">
            <p>No files uploaded yet. Upload your first file above! 📤</p>
          </div>
        ) : (
          <div className="files-grid">
            {files.map((file, index) => (
              <div key={index} className="file-card">
                <div className="file-preview">
                  {file.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <img src={file.url} alt={file.name} loading="lazy" />
                  ) : (
                    <div className="file-icon">📄</div>
                  )}
                </div>

                <div className="file-info">
                  <div className="file-name" title={file.name}>{file.name}</div>
                  <div className="file-meta">
                    <span className={`provider-badge ${file.provider}`}>
                      {file.provider.toUpperCase()}
                    </span>
                    <span className="file-size">{formatBytes(file.size)}</span>
                  </div>
                </div>

                <div className="file-actions">
                  <button 
                    onClick={() => window.open(file.url, '_blank')}
                    className="btn-icon"
                    title="Open"
                  >
                    👁️
                  </button>
                  <button 
                    onClick={() => copyToClipboard(file.url)}
                    className="btn-icon"
                    title="Copy URL"
                  >
                    📋
                  </button>
                  <button 
                    onClick={() => handleDelete(file)}
                    className="btn-icon btn-delete"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Setup Guide */}
      <section className="setup-guide">
        <h3>⚙️ Quick Setup Guide</h3>
        <div className="guide-steps">
          <div className="guide-step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h4>Choose Your Provider</h4>
              <p>Click "Sign Up Free" on any provider above to create an account. We recommend starting with Cloudinary for images/videos or Pinata for decentralized IPFS storage.</p>
            </div>
          </div>

          <div className="guide-step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h4>Get API Credentials</h4>
              <p>After signing up, get your API keys from the provider's dashboard. Each provider has a different format:</p>
              <ul>
                <li><strong>Cloudinary:</strong> CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET</li>
                <li><strong>Pinata:</strong> PINATA_API_KEY, PINATA_API_SECRET</li>
                <li><strong>AWS S3:</strong> AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_BUCKET_NAME</li>
              </ul>
            </div>
          </div>

          <div className="guide-step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h4>Add Environment Variables</h4>
              <p>Add your credentials to:</p>
              <ul>
                <li><strong>Local:</strong> <code>backend/.env</code> file</li>
                <li><strong>Production:</strong> Vercel dashboard → Settings → Environment Variables</li>
              </ul>
            </div>
          </div>

          <div className="guide-step">
            <div className="step-number">4</div>
            <div className="step-content">
              <h4>Test & Upload</h4>
              <p>Click "Test Connection" to verify your credentials, then start uploading files with the one-click buttons above!</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
