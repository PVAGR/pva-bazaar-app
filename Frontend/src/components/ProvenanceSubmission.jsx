import React, { useState, useEffect } from 'react';
import styles from './ProvenanceSubmission.module.css';

/**
 * ProvenanceSubmission Component - 6-step guided submission flow
 */
const ProvenanceSubmission = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [submissionId, setSubmissionId] = useState(null);
  const [objectType, setObjectType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const objectTypes = [
    { id: 'gemstone', label: '💎 Gemstone', icon: '💎' },
    { id: 'jewelry', label: '👑 Jewelry', icon: '👑' },
    { id: 'art', label: '🎨 Art & Sculpture', icon: '🎨' },
    { id: 'craft', label: '🏺 Artisan Craft', icon: '🏺' },
    { id: 'collectible', label: '📦 Collectible', icon: '📦' },
    { id: 'food', label: '☕ Food & Beverage', icon: '☕' },
    { id: 'material', label: '🌾 Raw Material', icon: '🌾' },
    { id: 'other', label: '✨ Other', icon: '✨' },
  ];

  const startSubmission = async (type) => {
    setLoading(true);
    try {
      const response = await fetch('/api/provenance/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ objectType: type }),
      });

      const data = await response.json();
      setSubmissionId(data.submissionId);
      setObjectType(type);
      setStep(1);
      setProgress(12);
    } catch (err) {
      console.error('Error starting submission:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Progress Bar */}
      <div className={styles.progressSection}>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }}></div>
        </div>
        <div className={styles.stepIndicator}>
          Step {step} / 6
          {progress > 0 && <span className={styles.progressPercent}>{progress}%</span>}
        </div>
      </div>

      {/* Step 0: Object Type Selection */}
      {step === 0 && (
        <div className={styles.stepContainer}>
          <h2>🏛️ What Are You Tokenizing?</h2>
          <p>
            Every object has a story. Whether it's handcrafted with passion, sourced with ethics, or simply found beauty,
            PVA helps you preserve its history, prove its authenticity, and unlock its value on the blockchain.
          </p>

          <div className={styles.typeGrid}>
            {objectTypes.map((type) => (
              <button
                key={type.id}
                className={styles.typeCard}
                onClick={() => startSubmission(type.id)}
                disabled={loading}
              >
                <div className={styles.typeIcon}>{type.icon}</div>
                <div className={styles.typeLabel}>{type.label}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 1: Material Truth */}
      {step === 1 && <MaterialTruthForm submissionId={submissionId} objectType={objectType} onNext={() => setStep(2)} />}

      {/* Step 2: Human Narrative */}
      {step === 2 && <NarrativeForm submissionId={submissionId} onNext={() => setStep(3)} />}

      {/* Step 3: Proofs */}
      {step === 3 && <ProofsForm submissionId={submissionId} onNext={() => setStep(4)} />}

      {/* Step 4: Creator Info */}
      {step === 4 && <CreatorForm submissionId={submissionId} onNext={() => setStep(5)} />}

      {/* Step 5: Review & Submit */}
      {step === 5 && (
        <ReviewForm
          submissionId={submissionId}
          objectType={objectType}
          onNext={() => setStep(6)}
          onComplete={onComplete}
        />
      )}

      {/* Step 6: Confirmation */}
      {step === 6 && <ConfirmationScreen submissionId={submissionId} />}
    </div>
  );
};

/**
 * Step 1: Material Truth Form
 */
const MaterialTruthForm = ({ submissionId, objectType, onNext }) => {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/provenance/${submissionId}/material-truth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onNext();
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.stepContainer}>
      <h2>📏 Material Truth: The Physical Facts</h2>
      <p>Tell us about the object's physical properties and specifications.</p>

      <form className={styles.form}>
        {/* Common fields */}
        <div className={styles.formGroup}>
          <label>Object Name *</label>
          <input
            type="text"
            placeholder="e.g., 'The Crimson Star Ruby' or 'Omar's Olive Oil Batch #5'"
            value={formData.objectName || ''}
            onChange={(e) => setFormData({ ...formData, objectName: e.target.value })}
          />
        </div>

        <div className={styles.formGroup}>
          <label>Short Description *</label>
          <textarea
            placeholder="A single sentence for the NFT card"
            value={formData.shortDescription || ''}
            onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
          />
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>Creation Date *</label>
            <input type="date" onChange={(e) => setFormData({ ...formData, creationDate: e.target.value })} />
          </div>
          <div className={styles.formGroup}>
            <label>Weight</label>
            <input type="number" placeholder="0" onChange={(e) => setFormData({ ...formData, weight: e.target.value })} />
          </div>
          <div className={styles.formGroup}>
            <label>Unit</label>
            <select onChange={(e) => setFormData({ ...formData, weightUnit: e.target.value })}>
              <option>g</option>
              <option>kg</option>
              <option>ct</option>
              <option>oz</option>
              <option>lb</option>
            </select>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label>Materials/Composition</label>
          <input
            type="text"
            placeholder="e.g., '22k Gold, Ruby, Diamond' or 'Terracotta Clay'"
            onChange={(e) => setFormData({ ...formData, materials: e.target.value.split(',') })}
          />
        </div>

        <div className={styles.formGroup}>
          <label>Dimensions</label>
          <input type="text" placeholder="e.g., '10x5x5 cm' or 'Size 8 ring'" onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })} />
        </div>

        {/* Type-specific fields */}
        {objectType === 'gemstone' && (
          <>
            <div className={styles.formGroup}>
              <label>Species</label>
              <input placeholder="e.g., Ruby, Sapphire" onChange={(e) => setFormData({ ...formData, species: e.target.value })} />
            </div>
            <div className={styles.formGroup}>
              <label>Clarity Grade</label>
              <select onChange={(e) => setFormData({ ...formData, clarity: e.target.value })}>
                <option>FL</option>
                <option>IF</option>
                <option>VVS1</option>
                <option>VS1</option>
                <option>SI1</option>
              </select>
            </div>
          </>
        )}

        {objectType === 'craft' && (
          <>
            <div className={styles.formGroup}>
              <label>Technique Used</label>
              <input placeholder="e.g., Wheel-thrown, Forged" onChange={(e) => setFormData({ ...formData, technique: e.target.value })} />
            </div>
            <div className={styles.formGroup}>
              <label>Firing Temperature (°C)</label>
              <input type="number" onChange={(e) => setFormData({ ...formData, firingTemperature: e.target.value })} />
            </div>
          </>
        )}

        {objectType === 'food' && (
          <>
            <div className={styles.formGroup}>
              <label>Origin Farm/Region</label>
              <input placeholder="e.g., Arabica from Ethiopia" onChange={(e) => setFormData({ ...formData, originFarm: e.target.value })} />
            </div>
            <div className={styles.formGroup}>
              <label>Organic Certified</label>
              <input type="checkbox" onChange={(e) => setFormData({ ...formData, organic: e.target.checked })} /> Yes
            </div>
          </>
        )}

        <button type="button" className={styles.btn} onClick={handleSubmit} disabled={loading}>
          {loading ? 'Saving...' : 'Next: Tell Your Story →'}
        </button>
      </form>
    </div>
  );
};

/**
 * Step 2: Narrative Form
 */
const NarrativeForm = ({ submissionId, onNext }) => {
  const [story, setStory] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await fetch(`/api/provenance/${submissionId}/narrative`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ story }),
      });
      onNext();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.stepContainer}>
      <h2>📖 The Human Narrative: The Soul</h2>
      <p>Share the story behind this object. This is what makes it truly unique and valuable.</p>

      <textarea
        className={styles.largeTextarea}
        placeholder="How did this come to be? Who made it? What was their inspiration? Was there a struggle? A moment of brilliance? Why is it special? (500+ characters recommended)"
        value={story}
        onChange={(e) => setStory(e.target.value)}
      />

      <div className={styles.charCount}>{story.length} characters</div>

      <button className={styles.btn} onClick={handleSubmit} disabled={loading || story.length < 50}>
        {loading ? 'Saving...' : 'Next: Upload Proofs →'}
      </button>
    </div>
  );
};

/**
 * Step 3: Proofs Form
 */
const ProofsForm = ({ submissionId, onNext }) => {
  const [proofType, setProofType] = useState('photos');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await fetch(`/api/provenance/${submissionId}/proofs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          proofType,
          photos: [
            {
              url: 'https://example.com/photo1.jpg',
              caption: 'Object photo',
              type: 'object',
            },
          ],
        }),
      });
      onNext();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.stepContainer}>
      <h2>🔐 Verifiable Proof: Evidence of Authenticity</h2>
      <p>Upload photos, documents, or blockchain proof to establish authenticity.</p>

      <div className={styles.proofOptions}>
        <label className={styles.proofOption}>
          <input
            type="radio"
            value="photos"
            checked={proofType === 'photos'}
            onChange={(e) => setProofType(e.target.value)}
          />
          📷 Photos (object, creator, workshop, process)
        </label>
        <label className={styles.proofOption}>
          <input
            type="radio"
            value="documents"
            checked={proofType === 'documents'}
            onChange={(e) => setProofType(e.target.value)}
          />
          📄 Documents (certificate, receipt, appraisal)
        </label>
        <label className={styles.proofOption}>
          <input
            type="radio"
            value="qr"
            checked={proofType === 'qr'}
            onChange={(e) => setProofType(e.target.value)}
          />
          📱 QR Code (for re-registered items)
        </label>
      </div>

      <div className={styles.uploadArea}>
        <p>Drop files here or click to upload (images, PDFs)</p>
        <input type="file" multiple accept="image/*,.pdf" />
      </div>

      <button className={styles.btn} onClick={handleSubmit} disabled={loading}>
        {loading ? 'Saving...' : 'Next: Creator Information →'}
      </button>
    </div>
  );
};

/**
 * Step 4: Creator Info Form
 */
const CreatorForm = ({ submissionId, onNext }) => {
  const [info, setInfo] = useState({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await fetch(`/api/provenance/${submissionId}/creator-info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(info),
      });
      onNext();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.stepContainer}>
      <h2>👤 Creator / Owner Information</h2>

      <form className={styles.form}>
        <div className={styles.formGroup}>
          <label>Name *</label>
          <input
            type="text"
            value={info.name || ''}
            onChange={(e) => setInfo({ ...info, name: e.target.value })}
          />
        </div>

        <div className={styles.formGroup}>
          <label>Country *</label>
          <input
            type="text"
            value={info.country || ''}
            onChange={(e) => setInfo({ ...info, country: e.target.value })}
          />
        </div>

        <div className={styles.formGroup}>
          <label>Are you the creator/artisan?</label>
          <input
            type="checkbox"
            checked={info.isArtisan || false}
            onChange={(e) => setInfo({ ...info, isArtisan: e.target.checked })}
          />
        </div>

        <div className={styles.formGroup}>
          <label>Bio / About You</label>
          <textarea
            placeholder="Tell us about your work and vision"
            value={info.bio || ''}
            onChange={(e) => setInfo({ ...info, bio: e.target.value })}
          />
        </div>

        <button type="button" className={styles.btn} onClick={handleSubmit} disabled={loading}>
          {loading ? 'Saving...' : 'Next: Review & Submit →'}
        </button>
      </form>
    </div>
  );
};

/**
 * Step 5: Review Form
 */
const ReviewForm = ({ submissionId, onNext, onComplete }) => {
  const [completeness, setCompleteness] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch submission details
    fetch(`/api/provenance/${submissionId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then((r) => r.json())
      .then((data) => setCompleteness(data.submission.completeness))
      .catch(console.error);
  }, [submissionId]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await fetch(`/api/provenance/${submissionId}/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      onNext();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.stepContainer}>
      <h2>✅ Review Your Submission</h2>

      <div className={styles.scoreCard}>
        <div className={styles.scoreSection}>
          <strong>Material Truth:</strong>
          <div className={styles.scoreBar}>
            <div className={styles.scoreProgress} style={{ width: `${completeness.materialTruthScore}%` }}></div>
          </div>
          <span>{completeness.materialTruthScore?.toFixed(0)}%</span>
        </div>

        <div className={styles.scoreSection}>
          <strong>Narrative Quality:</strong>
          <div className={styles.scoreBar}>
            <div className={styles.scoreProgress} style={{ width: `${completeness.narrativeScore}%` }}></div>
          </div>
          <span>{completeness.narrativeScore?.toFixed(0)}%</span>
        </div>

        <div className={styles.scoreSection}>
          <strong>Proof Quality:</strong>
          <div className={styles.scoreBar}>
            <div className={styles.scoreProgress} style={{ width: `${completeness.proofScore}%` }}></div>
          </div>
          <span>{completeness.proofScore?.toFixed(0)}%</span>
        </div>

        <div className={styles.totalScore}>
          <strong>Overall Authenticity Score:</strong>
          <div className={styles.bigScore}>{completeness.overallScore?.toFixed(0)}%</div>
        </div>
      </div>

      <button className={styles.btn} onClick={handleSubmit} disabled={loading}>
        {loading ? 'Submitting...' : '🚀 Submit for Review'}
      </button>
    </div>
  );
};

/**
 * Step 6: Confirmation
 */
const ConfirmationScreen = ({ submissionId }) => {
  return (
    <div className={styles.stepContainer}>
      <div className={styles.confirmation}>
        <div className={styles.checkmark}>✓</div>
        <h2>🎉 Submission Complete!</h2>
        <p>Your provenance has been submitted for review.</p>
        <p className={styles.submissionId}>Submission ID: {submissionId}</p>
        <p className={styles.nextSteps}>
          Next: Our team will verify your submission and mint your NFT. You'll receive an email when ready!
        </p>
        <button className={styles.btn} onClick={() => window.location.href = '/dashboard'}>
          Go to Dashboard
        </button>
      </div>
    </div>
  );
};

export default ProvenanceSubmission;
