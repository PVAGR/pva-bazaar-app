import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import HelpTip from '../components/HelpTip.jsx';
import { createMarketplaceItem, retryMarketplaceSyndication } from '../lib/api';
import './ListItemPage.css';

const STEPS = ['Basic Info', 'Pricing', 'Images', 'Syndication'];
const SYNDICATION_CHANNELS = ['facebook', 'etsy', 'ebay'];
const NEEDS_ATTENTION_STATUSES = new Set(['failed', 'manual_required']);

const CATEGORY_OPTIONS = ['clothing', 'electronics', 'home', 'art', 'jewelry', 'other'];
const CONDITION_OPTIONS = ['new', 'like-new', 'used', 'used-fair', 'vintage'];

export default function ListItemPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createdItemId, setCreatedItemId] = useState('');
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
      etsy: false,
      facebook: false,
    },
  });
  const [syndicationSummary, setSyndicationSummary] = useState(null);

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
    setSyndicationSummary(null);

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

    if (res.syndication) {
      setSyndicationSummary(res.syndication);
    }
    setCreatedItemId(res.item?.id || '');

    const requiresAttention = Boolean(
      res.syndication?.jobs?.some(job => NEEDS_ATTENTION_STATUSES.has(job.status)),
    );
    if (requiresAttention) {
      setSuccess('Listing submitted. Review syndication results below and retry channels that need attention.');
      return;
    }

    setSuccess('Listing submitted successfully. It is now pending review. Redirecting to marketplace...');
    setTimeout(() => navigate('/marketplace'), 1200);
  }

  async function retrySyndicationChannels(channels) {
    if (!createdItemId || !Array.isArray(channels) || !channels.length) return;

    setRetrying(true);
    setError('');
    const retry = await retryMarketplaceSyndication(createdItemId, channels);
    setRetrying(false);

    if (!retry.ok) {
      setError(retry.error || 'Syndication retry failed');
      return;
    }

    if (retry.syndication) {
      setSyndicationSummary(retry.syndication);
    }
    setSuccess('Syndication retry completed.');
  }

  async function handleRetryFailedSyndication() {
    if (!syndicationSummary?.jobs?.length) return;
    const retryChannels = syndicationSummary.jobs
      .filter(job => NEEDS_ATTENTION_STATUSES.has(job.status))
      .map(job => job.channel);
    if (!retryChannels.length) return;
    await retrySyndicationChannels(retryChannels);
  }

  async function handleRetrySingleChannel(channel) {
    if (!channel) return;
    await retrySyndicationChannels([channel]);
  }

  return (
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
              <label className="list-labelRow">
                Title *
                <HelpTip
                  title="Listing title"
                  body="Short, clear name for the item. Buyers see this first."
                  example="Handmade silver ring"
                />
              </label>
              <input value={form.title} onChange={e => updateField('title', e.target.value)} />

              <label className="list-labelRow">
                Description *
                <HelpTip
                  title="Description"
                  body="Explain what it is, condition, size, and anything a buyer should know. This improves conversion and reduces refunds."
                  example="Size 7, worn twice, no scratches"
                />
              </label>
              <textarea
                rows={5}
                value={form.description}
                onChange={e => updateField('description', e.target.value)}
              />

              <label className="list-labelRow">
                Category *
                <HelpTip
                  title="Category"
                  body="Used for filtering and marketplace SEO. Pick the closest match."
                  example="jewelry"
                />
              </label>
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
              <label className="list-labelRow">
                Price (USD) *
                <HelpTip
                  title="Price"
                  body="The amount the buyer pays. Use a realistic price; you can always adjust later."
                  example="49.99"
                />
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.price}
                onChange={e => updateField('price', e.target.value)}
              />

              <label className="list-labelRow">
                Condition *
                <HelpTip
                  title="Condition"
                  body="Set expectations for buyers. Pick the option that matches the real condition."
                  example="like-new"
                />
              </label>
              <select value={form.condition} onChange={e => updateField('condition', e.target.value)}>
                {CONDITION_OPTIONS.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <label className="list-labelRow">
                Brand
                <HelpTip
                  title="Brand"
                  body="Optional. If the item is handmade, you can put your maker name or studio."
                  example="PVA Studio"
                />
              </label>
              <input value={form.brand} onChange={e => updateField('brand', e.target.value)} />

              <label className="list-labelRow">
                Measurements
                <HelpTip
                  title="Measurements"
                  body="Optional. Size details reduce returns."
                  example="10 x 8 x 5 in"
                />
              </label>
              <input
                placeholder="e.g. 10 x 8 x 5 in"
                value={form.measurements}
                onChange={e => updateField('measurements', e.target.value)}
              />

              <label className="list-labelRow">
                Materials (comma separated)
                <HelpTip
                  title="Materials"
                  body="Optional tags used for search and trust."
                  example="silver, ruby"
                />
              </label>
              <input
                placeholder="e.g. cotton, leather"
                value={form.materials}
                onChange={e => updateField('materials', e.target.value)}
              />
            </section>
          )}

          {step === 3 && (
            <section>
              <label className="list-labelRow">
                Upload Images
                <HelpTip
                  title="Images"
                  body="Upload up to 6 images. For now this draft flow stores small images inline."
                  example="Front, back, close-up"
                />
              </label>
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
              <p className="hint">Choose marketplaces to publish in parallel during submission.</p>
              {SYNDICATION_CHANNELS.map(platform => (
                <label key={platform} className="check">
                  <input
                    type="checkbox"
                    checked={form.syndication[platform]}
                    onChange={() => updateSyndication(platform)}
                  />
                  {platform}
                  <HelpTip
                    title="Syndication"
                    body="When enabled, PVA dispatches this listing to the configured connector for the selected channel at submit time."
                    example="ebay"
                  />
                </label>
              ))}
            </section>
          )}

          {error && <div className="form-error">{error}</div>}
          {success && <div className="form-success">{success}</div>}
          {syndicationSummary && (
            <div className="form-success" role="status" aria-live="polite">
              Syndication dispatched: {syndicationSummary.summary?.success || 0} success,{' '}
              {syndicationSummary.summary?.failed || 0} failed,{' '}
              {syndicationSummary.summary?.skipped || 0} skipped,{' '}
              {syndicationSummary.summary?.manualRequired || 0} manual required.

              {!!syndicationSummary.jobs?.length && (
                <div className="syndication-jobs">
                  {syndicationSummary.jobs.map(job => (
                    <div key={job.channel} className="syndication-job-row">
                      <div className="syndication-job-main">
                        <span className="syndication-job-channel">{job.channel}</span>
                        <span className={`syndication-job-status is-${job.status}`}>{job.status}</span>
                      </div>
                      <span className="syndication-job-message">{job.message || 'No details'}</span>
                      <div className="syndication-job-actions">
                        {job.externalUrl ? (
                          <a
                            className="btn ghost syndication-link"
                            href={job.externalUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open Listing
                          </a>
                        ) : null}
                        {NEEDS_ATTENTION_STATUSES.has(job.status) ? (
                          <button
                            type="button"
                            className="btn ghost"
                            onClick={() => handleRetrySingleChannel(job.channel)}
                            disabled={retrying}
                          >
                            {retrying ? 'Retrying...' : `Retry ${job.channel}`}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!!syndicationSummary.jobs?.some(job => ['failed', 'manual_required'].includes(job.status)) && (
                <div className="syndication-actions">
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={handleRetryFailedSyndication}
                    disabled={retrying}
                  >
                    {retrying ? 'Retrying...' : 'Retry Failed Channels'}
                  </button>
                </div>
              )}
            </div>
          )}

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
  );
}

