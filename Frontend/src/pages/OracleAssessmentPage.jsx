import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { apiPost, apiGet } from '../lib/api';
import HelpTip from '../components/HelpTip.jsx';
import { getToken } from '../lib/auth';
import './OracleAssessmentPage.css';

export default function OracleAssessmentPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [assessmentId, setAssessmentId] = useState(null);
  const [results, setResults] = useState(null);

  const [formData, setFormData] = useState({
    personalData: {
      fullName: '',
      birthDate: '',
      birthTime: '',
      birthPlace: '',
      physicalStats: {
        height: '',
        weight: '',
        eyeColor: '',
        hairColor: '',
      },
    },
    spiritualProfile: {
      meditation: false,
      spiritualPractices: [],
      significantNumbers: [],
      animalConnections: [],
      personalSymbols: [],
      lifeGoals: [],
    },
  });

  const handleInputChange = (path, value) => {
    const keys = path.split('.');
    setFormData((prev) => {
      const newData = { ...prev };
      let current = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  const handleArrayChange = (path, value, checked) => {
    const keys = path.split('.');
    setFormData((prev) => {
      const newData = { ...prev };
      let current = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      const arr = current[keys[keys.length - 1]] || [];
      if (checked) {
        current[keys[keys.length - 1]] = [...arr, value];
      } else {
        current[keys[keys.length - 1]] = arr.filter((item) => item !== value);
      }
      return newData;
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get auth token from localStorage (same keys used across the app)
      const token = getToken();
      if (!token) {
        throw new Error('Please log in to create an assessment');
      }

      const response = await apiPost('/oracle/assessment', formData);

      if (response.ok) {
        setAssessmentId(response.assessment.id);
        setStep(4); // Show processing step

        // Poll for results
        pollForResults(response.assessment.id);
      } else {
        throw new Error(response.error || 'Failed to create assessment');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  const pollForResults = async (id, attempts = 0) => {
    if (attempts > 20) {
      setError('Assessment is taking longer than expected. Please check back later.');
      setLoading(false);
      return;
    }

    try {
      const response = await apiGet(`/oracle/assessment/${id}`);

      if (response.ok && response.assessment.status === 'completed') {
        setResults(response.assessment.results);
        setStep(5); // Show results
        setLoading(false);
      } else if (response.ok && response.assessment.status === 'failed') {
        setError('Assessment generation failed. Please try again.');
        setLoading(false);
      } else {
        // Still processing, poll again
        setTimeout(() => pollForResults(id, attempts + 1), 2000);
      }
    } catch (err) {
      console.error('Error polling for results:', err);
      setTimeout(() => pollForResults(id, attempts + 1), 2000);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.personalData.fullName && formData.personalData.birthDate;
      case 2:
        return formData.personalData.birthTime && formData.personalData.birthPlace;
      case 3:
        return true; // Spiritual profile is optional
      default:
        return false;
    }
  };

  return (
    <div className="oracle-assessment">
      <header className="oracle-assessment__header">
        <h1>🔮 Your Personal Oracle Assessment</h1>
        <p>Discover your cosmic signature and spiritual path</p>
      </header>

      {error && <div className="oracle-assessment__error">{error}</div>}

      {/* Step 1: Basic Personal Data */}
      {step === 1 && (
        <div className="step">
          <h2>Step 1: Basic Information</h2>
          <div className="oracle-assessment__fields">
            <div>
              <label>
                Full Name *
                <HelpTip
                  title="Full name"
                  body="Used to personalize your oracle assessment."
                  example="Jane Doe"
                />
              </label>
              <input
                type="text"
                value={formData.personalData.fullName}
                onChange={(e) => handleInputChange('personalData.fullName', e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>
            <div>
              <label>
                Birth Date *
                <HelpTip
                  title="Birth date"
                  body="Used for astrology and timing-based interpretations."
                  example="1996-02-20"
                />
              </label>
              <input
                type="date"
                value={formData.personalData.birthDate}
                onChange={(e) => handleInputChange('personalData.birthDate', e.target.value)}
                required
              />
            </div>
          </div>
          <div className="oracle-assessment__actions oracle-assessment__actions--right">
            <button onClick={() => setStep(2)} disabled={!canProceed()}>
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Birth Details */}
      {step === 2 && (
        <div className="step">
          <h2>Step 2: Birth Details</h2>
          <div className="oracle-assessment__fields">
            <div>
              <label>
                Birth Time *
                <HelpTip
                  title="Birth time"
                  body="Helps refine the assessment. If unknown, use 12:00 PM."
                  example="12:00"
                />
              </label>
              <input
                type="time"
                value={formData.personalData.birthTime}
                onChange={(e) => handleInputChange('personalData.birthTime', e.target.value)}
                required
              />
              <small>If unknown, use 12:00 PM</small>
            </div>
            <div>
              <label>
                Birth Place *
                <HelpTip
                  title="Birth place"
                  body="City and country are enough. Used for geo/cosmic mapping."
                  example="Nairobi, Kenya"
                />
              </label>
              <input
                type="text"
                value={formData.personalData.birthPlace}
                onChange={(e) => handleInputChange('personalData.birthPlace', e.target.value)}
                placeholder="City, Country"
                required
              />
            </div>
            <div className="oracle-assessment__grid2">
              <div>
                <label>Height (cm)</label>
                <input
                  type="number"
                  value={formData.personalData.physicalStats.height}
                  onChange={(e) =>
                    handleInputChange('personalData.physicalStats.height', e.target.value)
                  }
                  placeholder="Optional"
                />
              </div>
              <div>
                <label>Weight (kg)</label>
                <input
                  type="number"
                  value={formData.personalData.physicalStats.weight}
                  onChange={(e) =>
                    handleInputChange('personalData.physicalStats.weight', e.target.value)
                  }
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="oracle-assessment__grid2">
              <div>
                <label>Eye Color</label>
                <input
                  type="text"
                  value={formData.personalData.physicalStats.eyeColor}
                  onChange={(e) =>
                    handleInputChange('personalData.physicalStats.eyeColor', e.target.value)
                  }
                  placeholder="Optional"
                />
              </div>
              <div>
                <label>Hair Color</label>
                <input
                  type="text"
                  value={formData.personalData.physicalStats.hairColor}
                  onChange={(e) =>
                    handleInputChange('personalData.physicalStats.hairColor', e.target.value)
                  }
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>
          <div className="oracle-assessment__actions">
            <button onClick={() => setStep(1)}>← Back</button>
            <button onClick={() => setStep(3)} disabled={!canProceed()}>
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Spiritual Profile */}
      {step === 3 && (
        <div className="step">
          <h2>Step 3: Spiritual Profile</h2>
          <div className="oracle-assessment__fields oracle-assessment__fields--wide">
            <div>
              <label>
                <input
                  type="checkbox"
                  checked={formData.spiritualProfile.meditation}
                  onChange={(e) =>
                    handleInputChange('spiritualProfile.meditation', e.target.checked)
                  }
                />
                I practice meditation
              </label>
            </div>

            <div>
              <label>Spiritual Practices (select all that apply)</label>
              {[
                'Yoga',
                'Prayer',
                'Ritual',
                'Nature Connection',
                'Energy Work',
                'Astrology',
                'Tarot',
                'Crystals',
              ].map((practice) => (
                <label key={practice} className="oracle-assessment__check-option">
                  <input
                    type="checkbox"
                    checked={formData.spiritualProfile.spiritualPractices.includes(practice)}
                    onChange={(e) =>
                      handleArrayChange(
                        'spiritualProfile.spiritualPractices',
                        practice,
                        e.target.checked,
                      )
                    }
                  />
                  {practice}
                </label>
              ))}
            </div>

            <div>
              <label>Significant Numbers (comma-separated)</label>
              <input
                type="text"
                placeholder="e.g., 7, 11, 22"
                onChange={(e) => {
                  const numbers = e.target.value
                    .split(',')
                    .map((n) => parseInt(n.trim()))
                    .filter((n) => !isNaN(n));
                  handleInputChange('spiritualProfile.significantNumbers', numbers);
                }}
              />
            </div>

            <div>
              <label>Animal Connections (comma-separated)</label>
              <input
                type="text"
                placeholder="e.g., Wolf, Eagle, Bear"
                onChange={(e) => {
                  const animals = e.target.value
                    .split(',')
                    .map((a) => a.trim())
                    .filter((a) => a);
                  handleInputChange('spiritualProfile.animalConnections', animals);
                }}
              />
            </div>

            <div>
              <label>Personal Symbols (comma-separated)</label>
              <input
                type="text"
                placeholder="e.g., Tree, Circle, Star"
                onChange={(e) => {
                  const symbols = e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter((s) => s);
                  handleInputChange('spiritualProfile.personalSymbols', symbols);
                }}
              />
            </div>

            <div>
              <label>Life Goals (one per line)</label>
              <textarea
                rows="4"
                placeholder="Enter your life goals, one per line"
                onChange={(e) => {
                  const goals = e.target.value
                    .split('\n')
                    .map((g) => g.trim())
                    .filter((g) => g);
                  handleInputChange('spiritualProfile.lifeGoals', goals);
                }}
              />
            </div>
          </div>
          <div className="oracle-assessment__actions">
            <button onClick={() => setStep(2)}>← Back</button>
            <button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Processing...' : 'Generate Assessment →'}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Processing */}
      {step === 4 && (
        <div className="step oracle-assessment__processing">
          <h2>🔮 Generating Your Oracle Assessment</h2>
          <p className="oracle-assessment__processing-note">
            Our AI oracle is analyzing your cosmic signature...
          </p>
          <div className="oracle-assessment__spinner" aria-hidden="true" />
        </div>
      )}

      {/* Step 5: Results */}
      {step === 5 && results && (
        <div className="step results">
          <h2>✨ Your Oracle Assessment</h2>

          <section className="oracle-assessment__result-card">
            <h3>🌟 Cosmic Signature</h3>
            <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
              {results.cosmicSignature.synthesis}
            </ReactMarkdown>
            {results.cosmicSignature.astrological && (
              <div className="oracle-assessment__subsection">
                <h4>Astrological Insights</h4>
                <p>
                  <strong>Sun Sign:</strong> {results.cosmicSignature.astrological.sunSign}
                </p>
                {results.cosmicSignature.astrological.strengths && (
                  <div>
                    <strong>Strengths:</strong>
                    <ul>
                      {results.cosmicSignature.astrological.strengths.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="oracle-assessment__result-card">
            <h3>💫 Body Blueprint</h3>
            {results.bodyBlueprint.dietRecommendations &&
              results.bodyBlueprint.dietRecommendations.length > 0 && (
                <div>
                  <h4>Diet Recommendations</h4>
                  <ul>
                    {results.bodyBlueprint.dietRecommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            {results.bodyBlueprint.wellnessRituals &&
              results.bodyBlueprint.wellnessRituals.length > 0 && (
                <div className="oracle-assessment__subsection">
                  <h4>Wellness Rituals</h4>
                  <ul>
                    {results.bodyBlueprint.wellnessRituals.map((ritual, i) => (
                      <li key={i}>{ritual}</li>
                    ))}
                  </ul>
                </div>
              )}
          </section>

          <section className="oracle-assessment__result-card">
            <h3>🔮 Unique Revelation</h3>
            {results.uniqueRevelation.lifePURPOSE && (
              <p className="oracle-assessment__purpose">{results.uniqueRevelation.lifePURPOSE}</p>
            )}
            {results.uniqueRevelation.hiddenTalents &&
              results.uniqueRevelation.hiddenTalents.length > 0 && (
                <div>
                  <h4>Hidden Talents</h4>
                  <ul>
                    {results.uniqueRevelation.hiddenTalents.map((talent, i) => (
                      <li key={i}>{talent}</li>
                    ))}
                  </ul>
                </div>
              )}
          </section>

          <section className="oracle-assessment__result-card">
            <h3>✨ Golden Path</h3>
            {results.goldenPath.immediateSteps && results.goldenPath.immediateSteps.length > 0 && (
              <div>
                <h4>Immediate Steps</h4>
                <ol>
                  {results.goldenPath.immediateSteps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>
            )}
            {results.goldenPath.yearlyVision && (
              <div className="oracle-assessment__subsection">
                <h4>Yearly Vision</h4>
                <p>{results.goldenPath.yearlyVision}</p>
              </div>
            )}
          </section>

          <div className="oracle-assessment__actions oracle-assessment__actions--center">
            <button
              onClick={() => {
                setStep(1);
                setResults(null);
                setAssessmentId(null);
              }}
            >
              Create New Assessment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
