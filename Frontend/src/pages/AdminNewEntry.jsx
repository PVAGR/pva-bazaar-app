import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createArchiveEntry, requestAdminToken } from '../lib/archiveApi.js';

export default function AdminNewEntry({ onCreated }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [category, setCategory] = useState('journal');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  const ensureToken = async () => {
    let token = localStorage.getItem('admin:token') || '';
    if (token) return token;
    const secret = prompt('Enter admin secret');
    if (!secret) throw new Error('No secret provided');
    token = await requestAdminToken(secret);
    localStorage.setItem('admin:token', token);
    return token;
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
      alert(`Failed to save entry: ${err.message}\n\nPlease check your connection and try again.`);
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
        <label>Content<textarea rows={10} value={content} onChange={(e) => setContent(e.target.value)} /></label>
        <div className="form__actions">
          <button className="button" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save entry'}</button>
          <a className="button ghost" href="#/journal">Cancel</a>
        </div>
      </form>
    </section>
  );
}
