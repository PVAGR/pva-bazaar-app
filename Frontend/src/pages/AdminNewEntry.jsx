import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createArchiveEntry, requestAdminToken } from '../lib/archiveApi.js';
import { PromptModal, AlertModal } from '../components/ui/DialogModals.jsx';

export default function AdminNewEntry({ onCreated }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [category, setCategory] = useState('journal');
  const [location, setLocation] = useState('');
  const [mediaUrls, setMediaUrls] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null);
  const [pendingSubmit, setPendingSubmit] = useState(null);

  const parseMediaUrls = (value) =>
    value
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);

  const getCloudinaryConfig = () => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    return { cloudName, uploadPreset };
  };

  const uploadMediaFiles = async (files) => {
    const { cloudName, uploadPreset } = getCloudinaryConfig();
    if (!cloudName || !uploadPreset) {
      setMediaError('Missing Cloudinary config. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.');
      return;
    }
    if (!files?.length) return;

    setMediaError('');
    setUploadingMedia(true);

    try {
      const uploads = await Promise.all(
        Array.from(files).map(async (file) => {
          const form = new FormData();
          form.append('file', file);
          form.append('upload_preset', uploadPreset);
          const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
            method: 'POST',
            body: form,
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data?.error?.message || 'Upload failed');
          }
          return data.secure_url;
        })
      );

      setMediaUrls((prev) => {
        const existing = prev ? `${prev}\n` : '';
        return `${existing}${uploads.join('\n')}`.trim();
      });
    } catch (err) {
      setMediaError(err.message || 'Upload failed');
    } finally {
      setUploadingMedia(false);
    }
  };

  const ensureToken = async () => {
    let token = localStorage.getItem('admin:token') || '';
    if (token) return token;
    
    // Show prompt modal and wait for user input
    return new Promise((resolve, reject) => {
      setPendingSubmit({ resolve, reject });
      setShowPrompt(true);
    });
  };

  const handleSecretSubmit = async (secret) => {
    try {
      const token = await requestAdminToken(secret);
      localStorage.setItem('admin:token', token);
      if (pendingSubmit) {
        pendingSubmit.resolve(token);
        setPendingSubmit(null);
      }
    } catch (err) {
      setAlertMsg(`Authentication failed: ${err.message}`);
      if (pendingSubmit) {
        pendingSubmit.reject(err);
        setPendingSubmit(null);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatus('');
    const entry = {
      id: `local-${Date.now()}`,
      title: title.trim() || 'Untitled',
      date: date || new Date().toISOString().slice(0, 10),
      contentHtml: content.replace(/\n/g, '<br/>'),
      excerpt: content.slice(0, 200),
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      category,
      location,
      media: parseMediaUrls(mediaUrls),
    };

    try {
      const token = await ensureToken();
      const created = await createArchiveEntry(entry, token);
      const newId = created._id || created.id || entry.id;
      await onCreated?.(); // refresh from backend
      setStatus('Saved to backend');
      navigate(`/entry/${newId}`);
    } catch (err) {
      console.error('Save failed', err);
      setStatus('Failed to save');
      setAlertMsg(`Failed to save entry: ${err.message}\n\nPlease check your connection and try again.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="section-card">
      <div className="section-heading">
        <div>
          <div className="pill">Admin</div>
          <h2>New journal entry</h2>
        </div>
        <span className="pill">{status || 'Drafting'}</span>
      </div>

      <form className="form" onSubmit={handleSubmit}>
        <label>Title<input value={title} onChange={(e) => setTitle(e.target.value)} required /></label>
        <label>Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <label>Location<input value={location} onChange={(e) => setLocation(e.target.value)} /></label>
        <label>Category<input value={category} onChange={(e) => setCategory(e.target.value)} /></label>
        <label>Tags (comma separated)<input value={tags} onChange={(e) => setTags(e.target.value)} /></label>
        <label>
          Media URLs (comma or new line separated)
          <textarea rows={3} value={mediaUrls} onChange={(e) => setMediaUrls(e.target.value)} />
        </label>
        <div
          className="media-uploader"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            uploadMediaFiles(e.dataTransfer.files);
          }}
        >
          <div className="media-uploader__text">
            Drag & drop files here, or select files to upload
          </div>
          <label className="media-uploader__button">
            {uploadingMedia ? 'Uploading…' : 'Choose files'}
            <input
              type="file"
              accept="image/*,video/*,audio/*"
              multiple
              disabled={uploadingMedia}
              onChange={(e) => uploadMediaFiles(e.target.files)}
            />
          </label>
          {mediaError && <div className="media-uploader__error">{mediaError}</div>}
        </div>
        <label>Content<textarea rows={10} value={content} onChange={(e) => setContent(e.target.value)} /></label>
        <div className="form__actions">
          <button className="button" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save entry'}</button>
          <a className="button ghost" href="#/journal">Cancel</a>
        </div>
      </form>
      <PromptModal
        isOpen={showPrompt}
        onClose={() => {
          setShowPrompt(false);
          if (pendingSubmit) {
            pendingSubmit.reject(new Error('Cancelled'));
            setPendingSubmit(null);
          }
        }}
        onSubmit={handleSecretSubmit}
        title="Admin Authentication"
        message="Enter your admin secret to continue:"
        placeholder="Admin secret"
        inputType="password"
      />
      <AlertModal
        isOpen={!!alertMsg}
        onClose={() => setAlertMsg(null)}
        title="Error"
        message={alertMsg}
      />
    </section>
  );
}
