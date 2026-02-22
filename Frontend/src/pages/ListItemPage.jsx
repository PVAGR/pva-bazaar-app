import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { createMarketplaceItem } from '../lib/api';
import './ListItemPage.css';

const STEPS = ['Basic Info', 'Pricing', 'Images', 'Syndication'];

const CATEGORY_OPTIONS = ['clothing', 'electronics', 'home', 'art', 'jewelry', 'other'];
const CONDITION_OPTIONS = ['new', 'like-new', 'used', 'used-fair', 'vintage'];

export default function ListItemPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    price: '',
    condition: 'used',
    brand: '',
    measurements: '',
    materials: '',
    images: [],
    syndication: {
      ebay: false,
      amazon: false,
      facebook: false,
      offerup: false,
    },
  });

  const imagePreviews = useMemo(() => form.images.slice(0, 6), [form.images]);

  function updateField(name, value) {
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function updateSyndication(platform) {
    setForm(prev => ({
      ...prev,
      syndication: {
        ...prev.syndication,
        [platform]: !prev.syndication[platform],
      },
    }));
  }

  async function handleImageUpload(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    if (form.images.length + files.length > 6) {
      setError('Maximum 6 images allowed');
      return;
    }
    const oversized = files.find(file => file.size > 250 * 1024);
    if (oversized) {
      setError(`"${oversized.name}" is too large. Max size is 250KB per image in this draft flow.`);
      return;
    }
    const asDataUrls = await Promise.all(
      files.map(
        file =>
          new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
          }),
      ),
    );
    setError('');
    setForm(prev => ({
      ...prev,
      images: [...prev.images, ...asDataUrls.filter(Boolean)],
    }));
  }

  function validateCurrentStep() {
    if (step === 1) {
      if (!form.title.trim()) return 'Title is required';
      if (!form.description.trim()) return 'Description is required';
      if (!form.category) return 'Category is required';
    }
    if (step === 2) {
      const priceNum = Number(form.price);
      if (!priceNum || Number.isNaN(priceNum) || priceNum <= 0) return 'Price must be greater than 0';
      if (!form.condition) return 'Condition is required';
    }
    return '';
  }

  function goNext() {
    const validationError = validateCurrentStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setStep(s => Math.min(4, s + 1));
  }

  function goBack() {
    setError('');
    setStep(s => Math.max(1, s - 1));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationError = validateCurrentStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setSubmitting(true);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      price: Number(form.price),
      condition: form.condition,
      brand: form.brand.trim(),
      measurements: form.measurements.trim(),
      materials: form.materials
        .split(',')
        .map(s => s.trim())
        .filter(Boolean),
      images: form.images,
      syndication: form.syndication,
    };

    const res = await createMarketplaceItem(payload);
    setSubmitting(false);

    if (!res.ok) {
      setError(res.error || 'Failed to create listing');
      return;
    }

    setSuccess('Listing submitted successfully. It is now pending review.');
    setTimeout(() => navigate('/marketplace'), 1200);
  }

  return (
    <Layout>
      <main className="list-item-page">
        <div className="list-item-header">
          <h1>Create New Listing</h1>
          <p>Submit your item for review and publication in the marketplace.</p>
        </div>

        <div className="list-progress" aria-label="Listing form progress">
          {STEPS.map((label, idx) => {
            const number = idx + 1;
            const active = number === step;
            const done = number < step;
            return (
              <div key={label} className={`list-progress-step ${active ? 'active' : ''} ${done ? 'done' : ''}`}>
                <span>{number}</span>
                <small>{label}</small>
              </div>
            );
          })}
        </div>

        <form className="list-form" onSubmit={handleSubmit}>
          {step === 1 && (
            <section>
              <label>Title *</label>
              <input value={form.title} onChange={e => updateField('title', e.target.value)} />

              <label>Description *</label>
              <textarea
                rows={5}
                value={form.description}
                onChange={e => updateField('description', e.target.value)}
              />

              <label>Category *</label>
              <select value={form.category} onChange={e => updateField('category', e.target.value)}>
                <option value="">Select category</option>
                {CATEGORY_OPTIONS.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </section>
          )}

          {step === 2 && (
            <section>
              <label>Price (USD) *</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.price}
                onChange={e => updateField('price', e.target.value)}
              />

              <label>Condition *</label>
              <select value={form.condition} onChange={e => updateField('condition', e.target.value)}>
                {CONDITION_OPTIONS.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <label>Brand</label>
              <input value={form.brand} onChange={e => updateField('brand', e.target.value)} />

              <label>Measurements</label>
              <input
                placeholder="e.g. 10 x 8 x 5 in"
                value={form.measurements}
                onChange={e => updateField('measurements', e.target.value)}
              />

              <label>Materials (comma separated)</label>
              <input
                placeholder="e.g. cotton, leather"
                value={form.materials}
                onChange={e => updateField('materials', e.target.value)}
              />
            </section>
          )}

          {step === 3 && (
            <section>
              <label>Upload Images</label>
              <input type="file" multiple accept="image/*" onChange={handleImageUpload} />
              <p className="hint">Images are currently sent as inline data URLs for the draft flow.</p>

              {imagePreviews.length > 0 && (
                <div className="image-previews">
                  {imagePreviews.map((src, idx) => (
                    <img key={idx} src={src} alt={`preview-${idx + 1}`} />
                  ))}
                </div>
              )}
            </section>
          )}

          {step === 4 && (
            <section>
              <p className="hint">Choose external marketplaces for future syndication automation.</p>
              {Object.keys(form.syndication).map(platform => (
                <label key={platform} className="check">
                  <input
                    type="checkbox"
                    checked={form.syndication[platform]}
                    onChange={() => updateSyndication(platform)}
                  />
                  {platform}
                </label>
              ))}
            </section>
          )}

          {error && <div className="form-error">{error}</div>}
          {success && <div className="form-success">{success}</div>}

          <div className="form-actions">
            <Link to="/marketplace" className="btn ghost">
              Cancel
            </Link>
            {step > 1 && (
              <button type="button" className="btn ghost" onClick={goBack}>
                Back
              </button>
            )}
            {step < 4 ? (
              <button type="button" className="btn primary" onClick={goNext}>
                Next
              </button>
            ) : (
              <button type="submit" className="btn primary" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Listing'}
              </button>
            )}
          </div>
        </form>
      </main>
    </Layout>
  );
}

