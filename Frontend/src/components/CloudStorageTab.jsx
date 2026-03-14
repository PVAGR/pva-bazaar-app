/**
 * Cloud Storage Admin Tab
 * Universal cloud storage management with one-click buttons
 */

import { useState, useEffect, useRef } from 'react';
import { apiGet, apiPost, apiDelete, apiUpload } from '../lib/api';
import { createLogger } from '../lib/logger';
import LoadingSpinner, { LoadingDots } from './LoadingSpinner';
import HelpTip from './HelpTip.jsx';
import './CloudStorageTab.css';

const logger = createLogger('CloudStorageTab');

export default function CloudStorageTab() {
  const [providers, setProviders] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadingTo, setUploadingTo] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadProviders();
    loadFiles();
  }, []);

  const loadProviders = async () => {
    try {
      const data = await apiGet('/cloud-storage/providers');
      if (data.ok) {
        setProviders(data.providers);
      }
    } catch (err) {
      logger.error('Load providers error:', err);
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
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
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
    return <div className="cloud-storage-tab"><LoadingSpinner /></div>;
  }

  return (
    <div className="cloud-storage-tab">
      <div className="tab-header">
        <h2>☁️ Cloud Storage Management</h2>
        <p>Connect providers, upload assets, and manage storage evidence with a consistent operator workflow.</p>
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

      {/* Upload Section */}
      <section className="upload-section">
        <div className="section-title-row">
          <h3>📤 Upload Files</h3>
          <HelpTip
            title="What this section is for"
            body="Upload once to the provider that matches your delivery need. Local is fastest for draft work, Cloudinary is ideal for storefront media, and IPFS is best when you need immutable references."
            example="A product photo can go to Cloudinary for fast page rendering, while final certificate media can also be pinned to IPFS."
          />
        </div>
        <div className="upload-box">
          <input 
            type="file" 
            id="file-input"
            ref={fileInputRef}
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
        <div className="section-title-row">
          <h3>🔌 Cloud Providers</h3>
          <HelpTip
            title="How provider status works"
            body="Connected means environment credentials are present and available to the backend. Not configured means uploads are blocked until keys are added."
            example="If Pinata is not configured, add PINATA_API_KEY and PINATA_API_SECRET, then retest connection."
          />
        </div>
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
          <div className="section-title-row">
            <h3>📂 Uploaded Files ({files.length})</h3>
            <HelpTip
              title="How to use this file list"
              body="Use Open to verify content, Copy URL to attach assets to listings or records, and Delete only when the file is no longer referenced anywhere."
              example="Copy a Cloudinary URL into a listing image field, or store an IPFS URL in verification metadata."
            />
          </div>
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
        <div className="section-title-row">
          <h3>⚙️ Quick Setup Guide</h3>
          <HelpTip
            title="Why this setup matters"
            body="This checklist keeps media operations reliable for teams moving from traditional workflows into blockchain-backed commerce. It prevents missing credentials and broken file references."
            example="Before launch day, complete all four steps and run Test Connection for every provider marked in your deployment plan."
          />
        </div>
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
