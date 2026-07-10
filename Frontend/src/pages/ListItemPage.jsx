import React, { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import HelpTip from '../components/HelpTip.jsx';
import PrePublishChecklist from '../components/PrePublishChecklist.jsx';
import SetupReminder from '../components/SetupReminder.jsx';
import {
  apiGet,
  checkMarketplaceItemProvenance,
  claimMarketplaceItem,
  createMarketplaceItem,
  fetchManagedMarketplaceItem,
  retryMarketplaceSyndication,
  updateMarketplaceItem,
} from '../lib/api';
import { getMissingProfileSteps } from '../utils/sellerProfileUtils.js';
import './ListItemPage.css';

const STEPS = ['Basic Info', 'Pricing', 'Story', 'Images', 'Syndication'];
const SYNDICATION_CHANNELS = ['facebook', 'etsy', 'ebay'];
const NEEDS_ATTENTION_STATUSES = new Set(['failed', 'manual_required']);

const COMPLIANCE_FIELD_LABELS = {
  legalFullName: 'legal full name',
  legalIdType: 'government ID type',
  legalIdNumber: 'government ID number',
  addressLine1: 'address line 1',
  city: 'city',
  postalCode: 'postal code',
  country: 'country',
  phone: 'phone',
  identityAttested: 'identity attestation checkbox',
};

const CATEGORY_OPTIONS = ['clothing', 'electronics', 'home', 'art', 'jewelry', 'other'];
const CONDITION_OPTIONS = ['new', 'like-new', 'used', 'used-fair', 'vintage'];

function formatListingSubmissionError(result) {
  if (result?.code === 'TRADING_RESTRICTED') {
    return 'Your account is currently restricted from trading. Contact support to resolve this before creating listings or shops.';
  }

  if (result?.code === 'TRADER_IDENTITY_REQUIRED') {
    const missing = (result?.missingFields || [])
      .map((field) => COMPLIANCE_FIELD_LABELS[field] || field)
      .join(', ');
    if (missing) {
      return `Complete your trader identity profile first. Missing: ${missing}. You can update this in onboarding.`;
    }
    return 'Complete your trader identity profile first before creating listings or shops.';
  }

  return result?.error || 'Failed to create listing';
}

function splitLines(value) {
  return String(value || '')
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function ListItemPage() {
  const navigate = useNavigate();
  const { itemId } = useParams();
  const [profile, setProfile] = useState(null);
  const [dismissedReminder, setDismissedReminder] = useState(false);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(Boolean(itemId));
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createdItemId, setCreatedItemId] = useState('');
  const [provenanceChecking, setProvenanceChecking] = useState(false);
  const [provenanceSignature, setProvenanceSignature] = useState('');
  const [provenanceResult, setProvenanceResult] = useState(null);
  const [loadedItem, setLoadedItem] = useState(null);
  const [claimBusy, setClaimBusy] = useState(false);
  const [claimCode, setClaimCode] = useState('');
  const [claimRole, setClaimRole] = useState('owner');
  const [claimNote, setClaimNote] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    price: '',
    condition: 'used',
    brand: '',
    measurements: '',
    materials: '',
    knowledgeProfile: {
      history: '',
      scientificClassification: '',
      traditionalUses: '',
      modernUses: '',
      economicImportance: '',
      educationalValue: '',
      relatedDisciplines: '',
      safetyInformation: '',
      importExportNotes: '',
      certifications: '',
      articles: '',
      researchPapers: '',
      videos: '',
      classroomActivities: '',
      universityApplications: '',
      museumApplications: '',
      laboratoryApplications: '',
      industrialApplications: '',
    },
    images: [],
    syndication: {
      ebay: false,
      etsy: false,
      facebook: false,
    },
  });
  const [syndicationSummary, setSyndicationSummary] = useState(null);
  const editMode = Boolean(itemId);

  useEffect(() => {
    apiGet('/users/profile')
      .then(res => {
        if (res?.ok && res.user) setProfile(res.user);
      })
      .catch(() => {
        // silent fallback
      });
  }, []);

  useEffect(() => {
    if (!editMode || !itemId) return undefined;
    let mounted = true;
    setLoadingExisting(true);
    setError('');
    setSuccess('');
    fetchManagedMarketplaceItem(itemId).then((result) => {
      if (!mounted) return;
      setLoadingExisting(false);
      if (!result.ok || !result.item) {
        setError(result.error || 'Listing not found');
        return;
      }
      setLoadedItem(result.item);
      setCreatedItemId(result.item.id || itemId);
      hydrateFormFromItem(result.item);
      setSuccess('Listing loaded. You can steward or update this perennial listing.');
    });
    return () => {
      mounted = false;
    };
  }, [editMode, itemId]);

  const imagePreviews = useMemo(() => form.images.slice(0, 6), [form.images]);
  const canManageLoadedItem = Boolean(
    editMode
      && loadedItem
      && profile
      && (
        String(loadedItem.creator || '') === String(profile.id || '')
        || String(loadedItem?.stewardship?.currentHolderUserId || '') === String(profile.id || '')
        || String(profile?.role || '').toLowerCase() === 'admin'
      ),
  );

  function hydrateFormFromItem(item) {
    if (!item) return;
    const firstTag = Array.isArray(item.tags) && item.tags.length > 0 ? item.tags[0] : '';
    setForm({
      title: item.name || item.title || '',
      description: item.description || '',
      category: item.category || '',
      price: item.priceCents ? (Number(item.priceCents) / 100).toFixed(2) : '',
      condition: firstTag || 'used',
      brand: item.artisan || '',
      measurements: '',
      materials: Array.isArray(item.materials) ? item.materials.join(', ') : '',
      knowledgeProfile: {
        history: item?.knowledgeProfile?.history || '',
        scientificClassification: item?.knowledgeProfile?.scientificClassification || '',
        traditionalUses: Array.isArray(item?.knowledgeProfile?.traditionalUses) ? item.knowledgeProfile.traditionalUses.join('\n') : '',
        modernUses: Array.isArray(item?.knowledgeProfile?.modernUses) ? item.knowledgeProfile.modernUses.join('\n') : '',
        economicImportance: item?.knowledgeProfile?.economicImportance || '',
        educationalValue: item?.knowledgeProfile?.educationalValue || '',
        relatedDisciplines: Array.isArray(item?.knowledgeProfile?.relatedDisciplines) ? item.knowledgeProfile.relatedDisciplines.join('\n') : '',
        safetyInformation: item?.knowledgeProfile?.safetyInformation || '',
        importExportNotes: item?.knowledgeProfile?.importExportNotes || '',
        certifications: Array.isArray(item?.knowledgeProfile?.certifications) ? item.knowledgeProfile.certifications.join('\n') : '',
        articles: Array.isArray(item?.knowledgeProfile?.articles) ? item.knowledgeProfile.articles.join('\n') : '',
        researchPapers: Array.isArray(item?.knowledgeProfile?.researchPapers) ? item.knowledgeProfile.researchPapers.join('\n') : '',
        videos: Array.isArray(item?.knowledgeProfile?.videos) ? item.knowledgeProfile.videos.join('\n') : '',
        classroomActivities: Array.isArray(item?.knowledgeProfile?.classroomActivities) ? item.knowledgeProfile.classroomActivities.join('\n') : '',
        universityApplications: Array.isArray(item?.knowledgeProfile?.universityApplications) ? item.knowledgeProfile.universityApplications.join('\n') : '',
        museumApplications: Array.isArray(item?.knowledgeProfile?.museumApplications) ? item.knowledgeProfile.museumApplications.join('\n') : '',
        laboratoryApplications: Array.isArray(item?.knowledgeProfile?.laboratoryApplications) ? item.knowledgeProfile.laboratoryApplications.join('\n') : '',
        industrialApplications: Array.isArray(item?.knowledgeProfile?.industrialApplications) ? item.knowledgeProfile.industrialApplications.join('\n') : '',
      },
      images: Array.isArray(item.media) ? item.media.filter(Boolean).slice(0, 6) : [],
      syndication: {
        ebay: Array.isArray(item?.syndication?.requestedChannels) ? item.syndication.requestedChannels.includes('ebay') : false,
        etsy: Array.isArray(item?.syndication?.requestedChannels) ? item.syndication.requestedChannels.includes('etsy') : false,
        facebook: Array.isArray(item?.syndication?.requestedChannels) ? item.syndication.requestedChannels.includes('facebook') : false,
      },
    });
  }

  function updateField(name, value) {
    setProvenanceResult(null);
    setProvenanceSignature('');
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function updateKnowledgeField(name, value) {
    setProvenanceResult(null);
    setProvenanceSignature('');
    setForm(prev => ({
      ...prev,
      knowledgeProfile: {
        ...prev.knowledgeProfile,
        [name]: value,
      },
    }));
  }

  function updateSyndication(platform) {
    setProvenanceResult(null);
    setProvenanceSignature('');
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
    setProvenanceResult(null);
    setProvenanceSignature('');
    setForm(prev => ({
      ...prev,
      images: [...prev.images, ...asDataUrls.filter(Boolean)],
    }));
  }

  function buildListingPayload() {
    return {
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
      knowledgeProfile: {
        history: form.knowledgeProfile.history.trim(),
        scientificClassification: form.knowledgeProfile.scientificClassification.trim(),
        traditionalUses: splitLines(form.knowledgeProfile.traditionalUses),
        modernUses: splitLines(form.knowledgeProfile.modernUses),
        economicImportance: form.knowledgeProfile.economicImportance.trim(),
        educationalValue: form.knowledgeProfile.educationalValue.trim(),
        relatedDisciplines: splitLines(form.knowledgeProfile.relatedDisciplines),
        safetyInformation: form.knowledgeProfile.safetyInformation.trim(),
        importExportNotes: form.knowledgeProfile.importExportNotes.trim(),
        certifications: splitLines(form.knowledgeProfile.certifications),
        articles: splitLines(form.knowledgeProfile.articles),
        researchPapers: splitLines(form.knowledgeProfile.researchPapers),
        videos: splitLines(form.knowledgeProfile.videos),
        classroomActivities: splitLines(form.knowledgeProfile.classroomActivities),
        universityApplications: splitLines(form.knowledgeProfile.universityApplications),
        museumApplications: splitLines(form.knowledgeProfile.museumApplications),
        laboratoryApplications: splitLines(form.knowledgeProfile.laboratoryApplications),
        industrialApplications: splitLines(form.knowledgeProfile.industrialApplications),
      },
      images: form.images,
      syndication: form.syndication,
    };
  }

  function buildProvenanceSignature(payload) {
    return JSON.stringify({
      title: payload.title,
      description: payload.description,
      category: payload.category,
      price: payload.price,
      materials: payload.materials,
      images: payload.images,
      knowledgeProfile: payload.knowledgeProfile,
    });
  }

  async function runProvenanceCheck(payload) {
    const signature = buildProvenanceSignature(payload);
    setError('');
    setProvenanceChecking(true);
    const check = await checkMarketplaceItemProvenance(payload);
    setProvenanceChecking(false);

    if (!check.ok) {
      setError(check.error || 'Failed to run provenance check');
      setProvenanceResult(null);
      setProvenanceSignature('');
      return { ok: false, signature, blocked: false };
    }

    setProvenanceResult(check);
    setProvenanceSignature(signature);

    if (check.isDuplicateLikely) {
      setError('Potential duplicate detected by provenance checks. Review before submitting.');
      return { ok: true, signature, blocked: true };
    }

    setSuccess('Provenance check passed: no strong duplicate signal detected.');
    return { ok: true, signature, blocked: false };
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
    setStep(s => Math.min(5, s + 1));
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

    const payload = buildListingPayload();
    const signature = buildProvenanceSignature(payload);

    if (!editMode && provenanceSignature !== signature) {
      const checkRun = await runProvenanceCheck(payload);
      if (!checkRun.ok || checkRun.blocked) {
        setSubmitting(false);
        return;
      }
    } else if (!editMode && provenanceResult?.isDuplicateLikely) {
      setSubmitting(false);
      setError('Potential duplicate detected by provenance checks. Resolve before submitting.');
      return;
    }

    let res;
    if (editMode) {
      if (!canManageLoadedItem) {
        if (!claimCode.trim()) {
          setSubmitting(false);
          setError('Enter the claim code before stewarding an existing listing.');
          return;
        }
        setClaimBusy(true);
        const claimResult = await claimMarketplaceItem(itemId, {
          claimCode: claimCode.trim(),
          role: claimRole,
          note: claimNote.trim(),
          claimantName: profile?.name || profile?.email || '',
        });
        setClaimBusy(false);
        if (!claimResult.ok) {
          setSubmitting(false);
          setError(claimResult.error || 'Failed to claim listing');
          return;
        }
        setLoadedItem(claimResult.item || loadedItem);
        setSuccess(claimResult.message || 'Listing stewardship claimed.');
      }
      res = await updateMarketplaceItem(itemId, payload);
    } else {
      res = await createMarketplaceItem(payload);
    }
    setSubmitting(false);

    if (!res.ok) {
      setError(formatListingSubmissionError(res));
      return;
    }

    if (res.syndication) {
      setSyndicationSummary(res.syndication);
    }
    setCreatedItemId(res.item?.id || itemId || '');
    if (res.item) {
      setLoadedItem(res.item);
    }

    const requiresAttention = Boolean(
      res.syndication?.jobs?.some(job => NEEDS_ATTENTION_STATUSES.has(job.status)),
    );
    if (requiresAttention) {
      setSuccess(editMode
        ? 'Listing updated. Review syndication results below and retry channels that need attention.'
        : 'Listing submitted. Review syndication results below and retry channels that need attention.');
      return;
    }

    setSuccess(editMode
      ? 'Listing updated successfully. Redirecting to marketplace...'
      : 'Listing submitted successfully. It is now pending review. Redirecting to marketplace...');
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
          <h1>{editMode ? 'Manage Existing Listing' : 'Create New Listing'}</h1>
          <p>
            {editMode
              ? 'Claim a duplicate, continue a perennial item, and update the public listing without starting over.'
              : 'Submit your item for review and publication in the marketplace.'}
          </p>
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

        {!dismissedReminder && profile && (
          <SetupReminder
            missingSteps={getMissingProfileSteps(profile)}
            onDismiss={() => setDismissedReminder(true)}
          />
        )}

        {loadingExisting && editMode ? <div className="listings-note">Loading existing listing...</div> : null}
        {editMode && loadedItem ? (
          <section className="list-form section-card" style={{ marginBottom: '1rem' }}>
            <h3>Listing stewardship</h3>
            <p className="hint">
              {canManageLoadedItem
                ? 'You already steward this item. Update it below and keep the record perennial.'
                : 'If this listing belongs to you or was transferred to you, enter the claim code from the prior holder and continue the record.'}
            </p>
            <div className="list-form-grid">
              <div>
                <label className="list-labelRow">Claim code</label>
                  <input
                    value={claimCode}
                    onChange={(e) => setClaimCode(e.target.value)}
                    placeholder="Enter stewardship or transfer code"
                    disabled={canManageLoadedItem || claimBusy || submitting}
                  />
              </div>
              <div>
                <label className="list-labelRow">Steward role</label>
                <select value={claimRole} onChange={(e) => setClaimRole(e.target.value)} disabled={canManageLoadedItem || claimBusy || submitting}>
                  <option value="owner">owner</option>
                  <option value="seller">seller</option>
                  <option value="consignee">consignee</option>
                  <option value="marketer">marketer</option>
                  <option value="referrer">referrer</option>
                  <option value="partner">partner</option>
                  <option value="custodian">custodian</option>
                  <option value="archivist">archivist</option>
                </select>
              </div>
            </div>
            <label className="list-labelRow">Claim note</label>
              <textarea
                rows={3}
                value={claimNote}
                onChange={(e) => setClaimNote(e.target.value)}
                placeholder="Why are you stewarding this listing?"
                disabled={canManageLoadedItem || claimBusy || submitting}
              />
            {loadedItem?.stewardship?.currentHolderName ? (
              <p className="hint">
                Current steward: <strong>{loadedItem.stewardship.currentHolderName}</strong>{' '}
                {loadedItem.stewardship.currentHolderRole ? `(${loadedItem.stewardship.currentHolderRole})` : ''}
              </p>
            ) : null}
          </section>
        ) : null}

        <PrePublishChecklist form={form} />

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
              <h3>Item story and educational dossier</h3>
              <p className="hint">
                Fill these in to make the listing useful for universities, museums, schools, labs, and serious buyers.
                Blank fields are fine when the information is not known yet.
              </p>

              <label className="list-labelRow">
                History
                <HelpTip
                  title="History"
                  body="Where the item comes from, how it was made or found, and anything meaningful about its background."
                  example="Collected in the Rift Valley from a family-held parcel"
                />
              </label>
              <textarea rows={3} value={form.knowledgeProfile.history} onChange={e => updateKnowledgeField('history', e.target.value)} />

              <label className="list-labelRow">
                Scientific classification
                <HelpTip
                  title="Scientific classification"
                  body="The scientific or technical category that best describes this item."
                  example="Beryl; silicate mineral"
                />
              </label>
              <input
                value={form.knowledgeProfile.scientificClassification}
                onChange={e => updateKnowledgeField('scientificClassification', e.target.value)}
              />

              <label className="list-labelRow">
                Traditional uses
              </label>
              <textarea
                rows={3}
                placeholder="One use per line"
                value={form.knowledgeProfile.traditionalUses}
                onChange={e => updateKnowledgeField('traditionalUses', e.target.value)}
              />

              <label className="list-labelRow">Modern uses</label>
              <textarea
                rows={3}
                placeholder="One use per line"
                value={form.knowledgeProfile.modernUses}
                onChange={e => updateKnowledgeField('modernUses', e.target.value)}
              />

              <label className="list-labelRow">Economic importance</label>
              <textarea
                rows={3}
                value={form.knowledgeProfile.economicImportance}
                onChange={e => updateKnowledgeField('economicImportance', e.target.value)}
              />

              <label className="list-labelRow">Educational value</label>
              <textarea
                rows={3}
                value={form.knowledgeProfile.educationalValue}
                onChange={e => updateKnowledgeField('educationalValue', e.target.value)}
              />

              <label className="list-labelRow">Related disciplines</label>
              <textarea
                rows={3}
                placeholder="Geology, chemistry, history..."
                value={form.knowledgeProfile.relatedDisciplines}
                onChange={e => updateKnowledgeField('relatedDisciplines', e.target.value)}
              />

              <label className="list-labelRow">Safety information</label>
              <textarea
                rows={3}
                value={form.knowledgeProfile.safetyInformation}
                onChange={e => updateKnowledgeField('safetyInformation', e.target.value)}
              />

              <label className="list-labelRow">Import/export notes</label>
              <textarea
                rows={3}
                value={form.knowledgeProfile.importExportNotes}
                onChange={e => updateKnowledgeField('importExportNotes', e.target.value)}
              />

              <label className="list-labelRow">Certifications</label>
              <textarea
                rows={3}
                placeholder="One certification per line"
                value={form.knowledgeProfile.certifications}
                onChange={e => updateKnowledgeField('certifications', e.target.value)}
              />

              <label className="list-labelRow">Articles and research papers</label>
              <textarea
                rows={3}
                placeholder="Paste URLs or citations"
                value={form.knowledgeProfile.articles}
                onChange={e => updateKnowledgeField('articles', e.target.value)}
              />
              <textarea
                rows={3}
                placeholder="Research papers, one per line"
                value={form.knowledgeProfile.researchPapers}
                onChange={e => updateKnowledgeField('researchPapers', e.target.value)}
              />

              <label className="list-labelRow">Videos</label>
              <textarea
                rows={3}
                placeholder="Video URLs, one per line"
                value={form.knowledgeProfile.videos}
                onChange={e => updateKnowledgeField('videos', e.target.value)}
              />

              <label className="list-labelRow">Suggested classroom activities</label>
              <textarea
                rows={3}
                placeholder="One activity per line"
                value={form.knowledgeProfile.classroomActivities}
                onChange={e => updateKnowledgeField('classroomActivities', e.target.value)}
              />

              <label className="list-labelRow">University applications</label>
              <textarea
                rows={3}
                placeholder="One application per line"
                value={form.knowledgeProfile.universityApplications}
                onChange={e => updateKnowledgeField('universityApplications', e.target.value)}
              />

              <label className="list-labelRow">Museum applications</label>
              <textarea
                rows={3}
                placeholder="One application per line"
                value={form.knowledgeProfile.museumApplications}
                onChange={e => updateKnowledgeField('museumApplications', e.target.value)}
              />

              <label className="list-labelRow">Laboratory applications</label>
              <textarea
                rows={3}
                placeholder="One application per line"
                value={form.knowledgeProfile.laboratoryApplications}
                onChange={e => updateKnowledgeField('laboratoryApplications', e.target.value)}
              />

              <label className="list-labelRow">Industrial applications</label>
              <textarea
                rows={3}
                placeholder="One application per line"
                value={form.knowledgeProfile.industrialApplications}
                onChange={e => updateKnowledgeField('industrialApplications', e.target.value)}
              />
            </section>
          )}

          {step === 4 && (
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

          {step === 5 && (
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

              <div className="provenance-preflight">
                <div className="provenance-preflight-header">
                  <h3>Provenance Preflight</h3>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => runProvenanceCheck(buildListingPayload())}
                    disabled={provenanceChecking}
                  >
                    {provenanceChecking ? 'Checking...' : 'Run Duplicate Check'}
                  </button>
                </div>

                {!provenanceResult ? (
                  <p className="hint">Run a preflight check to scan internal hashes and reverse-image duplicate signals.</p>
                ) : (
                  <div className={`provenance-result ${provenanceResult.isDuplicateLikely ? 'is-risk' : 'is-safe'}`}>
                    <div className="provenance-result-top">
                      <span className="provenance-badge">
                        {provenanceResult.isDuplicateLikely ? 'Risk detected' : 'No strong duplicate signal'}
                      </span>
                      <span className="provenance-hash">
                        {provenanceResult?.candidate?.combinedHash
                          ? `${provenanceResult.candidate.combinedHash.slice(0, 14)}...`
                          : 'no hash'}
                      </span>
                    </div>

                    {Array.isArray(provenanceResult.duplicates) && provenanceResult.duplicates.length > 0 ? (
                      <div className="provenance-list">
                        {provenanceResult.duplicates.map((row) => (
                          <div key={`${row.itemId}-${row.matchType}`} className="provenance-row">
                            <div className="provenance-row-main">
                              <strong>{row.title || 'Untitled'}</strong>
                              <span className="provenance-type">{row.matchType}</span>
                              <span className="provenance-score">score {row.score}</span>
                            </div>
                            <div className="provenance-row-actions">
                              <Link className="btn ghost" to={`/items/manage/${encodeURIComponent(row.itemId)}`}>
                                Claim / Edit listing
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {provenanceResult?.reverseImage?.enabled ? (
                      <p className="hint">
                        Reverse image: {provenanceResult.reverseImage.checked ? 'checked' : 'not checked'};
                        {' '}top score {Number(provenanceResult.reverseImage.score || 0).toFixed(2)}
                      </p>
                    ) : (
                      <p className="hint">Reverse image provider not configured; internal hash checks still ran.</p>
                    )}
                  </div>
                )}
              </div>
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
            {step < 5 ? (
              <button type="button" className="btn primary" onClick={goNext}>
                Next
              </button>
            ) : (
              <button type="submit" className="btn primary" disabled={submitting || claimBusy}>
                {submitting
                  ? (editMode ? 'Saving...' : 'Submitting...')
                  : (editMode ? (canManageLoadedItem ? 'Update Listing' : 'Claim & Update Listing') : 'Submit Listing')}
              </button>
            )}
          </div>
        </form>
    </main>
  );
}
