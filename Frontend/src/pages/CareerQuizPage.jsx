import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { apiGet, apiPost } from '../lib/api';
import { ENV } from '../config/env.ts';
import './CareerQuizPage.css';

function toApiUrl(path) {
  const base = ENV.API_URL.replace(/\/+$/, '');
  const normalized = base.endsWith('/api') && path.startsWith('/api/') ? path.slice(4) : path;
  return `${base}${normalized}`;
}

export default function CareerQuizPage() {
  const [quiz, setQuiz] = useState(null);
  const [taxonomy, setTaxonomy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [recommendedManuals, setRecommendedManuals] = useState([]);

  useEffect(() => {
    loadQuiz();
    loadTaxonomy();
  }, []);

  const loadQuiz = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiGet('/career-quiz/definition');
      if (!data.ok || !data.quiz) {
        throw new Error(data.error || 'Failed to load quiz');
      }
      setQuiz(data.quiz);
    } catch (err) {
      setError(err.message || 'Failed to load quiz');
    } finally {
      setLoading(false);
    }
  };

  const loadTaxonomy = async () => {
    try {
      const data = await apiGet('/library-taxonomy');
      if (data.ok && data.taxonomy) {
        setTaxonomy(data.taxonomy);
      }
    } catch (_err) {
      setTaxonomy(null);
    }
  };

  const questions = quiz?.questions || [];
  const currentQuestion = questions[step] || null;
  const completion = questions.length
    ? Math.round((Object.keys(answers).length / questions.length) * 100)
    : 0;

  const selectAnswer = (questionId, optionKey) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionKey }));
  };

  const goNext = () => {
    if (step < questions.length - 1) setStep((s) => s + 1);
  };

  const goBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const submitQuiz = async () => {
    const payload = {
      answers: Object.entries(answers).map(([questionId, optionKey]) => ({ questionId, optionKey })),
    };
    setSubmitting(true);
    setError('');
    setResult(null);
    try {
      const data = await apiPost('/career-quiz/submit', payload);
      if (!data.ok || !data.result) {
        throw new Error(data.error || 'Failed to score quiz');
      }
      setResult(data.result);
      await loadRecommendedManuals(data.result.topDomains || []);
    } catch (err) {
      setError(err.message || 'Failed to score quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const loadRecommendedManuals = async (domains) => {
    try {
      const uniqueDomains = Array.from(new Set((domains || []).filter(Boolean)));
      const responses = await Promise.all(
        uniqueDomains.slice(0, 3).map((domain) => apiGet(`/library?domain=${encodeURIComponent(domain)}&limit=4`)),
      );
      const merged = responses
        .filter((res) => res?.ok)
        .flatMap((res) => (Array.isArray(res.items) ? res.items : []));
      const deduped = [];
      const seen = new Set();
      for (const item of merged) {
        if (!item?._id || seen.has(item._id)) continue;
        seen.add(item._id);
        deduped.push(item);
      }
      setRecommendedManuals(deduped.slice(0, 6));
    } catch (_err) {
      setRecommendedManuals([]);
    }
  };

  if (loading) {
    return <div className="career-quiz-page">Loading quiz...</div>;
  }

  if (!quiz) {
    return <div className="career-quiz-page">Unable to load quiz.</div>;
  }

  return (
    <div className="career-quiz-page">
      <Helmet>
        <title>Career Compass Quiz | PVA Bazaar</title>
        <meta
          name="description"
          content="Take the Civilization Career Compass and discover practical occupation tracks aligned to your strengths."
        />
      </Helmet>

      <header className="career-quiz-hero">
        <h1>{quiz.title}</h1>
        <p>{quiz.intro}</p>
        <div className="career-quiz-links">
          <Link to="/civilization-library">Open Knowledge Library</Link>
        </div>
      </header>

      <section className="career-progress">
        <div className="career-progress-bar" style={{ width: `${completion}%` }} />
        <span>{completion}% complete</span>
      </section>

      {error ? <div className="career-alert">{error}</div> : null}

      {!result && currentQuestion ? (
        <section className="career-question-card">
          <div className="career-question-meta">
            Question {step + 1} of {questions.length}
          </div>
          <h2>{currentQuestion.prompt}</h2>
          <div className="career-options">
            {currentQuestion.options.map((option) => {
              const active = answers[currentQuestion.id] === option.key;
              return (
                <button
                  key={option.key}
                  className={`career-option ${active ? 'active' : ''}`}
                  onClick={() => selectAnswer(currentQuestion.id, option.key)}
                >
                  <strong>{option.key}</strong>
                  <span>{option.text}</span>
                </button>
              );
            })}
          </div>
          <div className="career-actions">
            <button onClick={goBack} disabled={step === 0}>
              Back
            </button>
            {step < questions.length - 1 ? (
              <button onClick={goNext} disabled={!answers[currentQuestion.id]}>
                Next
              </button>
            ) : (
              <button onClick={submitQuiz} disabled={submitting || Object.keys(answers).length < questions.length}>
                {submitting ? 'Scoring...' : 'Get My Career Compass'}
              </button>
            )}
          </div>
        </section>
      ) : null}

      {result ? (
        <section className="career-result-card">
          {result.archetypeName ? (
            <div className="career-archetype-hero">
              <h2>{result.archetypeName}</h2>
              <p className="career-archetype-subheader">
                Your unique career personality and growth path
              </p>
              <div className="career-archetype-intro">
                <p>
                  {result.archetypeDescription || 'You embody a distinctive professional archetype.'}
                </p>
              </div>
            </div>
          ) : (
            <h2>Your Profile: {result.personalityType}</h2>
          )}
          
          <p>Suggested domains for contribution and training:</p>
          <div className="career-pills">
            {(result.topDomains || []).map((domain) => (
              <span key={domain}>{domain}</span>
            ))}
          </div>
          {(result.topInterests || []).length > 0 ? (
            <>
              <p>Top interest profile (RIASEC):</p>
              <div className="career-pills">
                {(result.topInterests || []).map((code) => (
                  <span key={`interest-${code}`}>{code}</span>
                ))}
              </div>
            </>
          ) : null}
          {result.riasecScores ? (
            <>
              <p>Interest score detail:</p>
              <div className="career-pills">
                {Object.entries(result.riasecScores).map(([code, score]) => (
                  <span key={`riasec-${code}`}>{code}:{score}</span>
                ))}
              </div>
            </>
          ) : null}
          {result.confidence ? (
            <>
              <p>Match confidence:</p>
              <div className="career-pills">
                <span>score: {result.confidence.score}%</span>
                <span>band: {result.confidence.band}</span>
                <span>completion: {result.confidence.completion}%</span>
                <span>signal: {result.confidence.signalStrength}%</span>
                <span>clarity: {result.confidence.axisClarity}%</span>
              </div>
              {result.confidence.sectionBreakdown ? (
                <div className="career-section-confidence">
                  <p style={{ fontSize: '0.9em', marginTop: '1rem' }}>Per-section confidence:</p>
                  {Object.entries(result.confidence.sectionBreakdown).map(([section, data]) => (
                    <div key={`section-${section}`} style={{ fontSize: '0.85em', marginLeft: '1rem', marginTop: '0.5rem' }}>
                      <strong>{section}:</strong> score {data.score}% ({data.band}) - {data.answered}/{data.total} answered, signal {data.signalStrength}%
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}
          <p>Recommended occupation tracks:</p>
          <ul>
            {(result.topCareers || []).map((career) => (
              <li key={career}>{career}</li>
            ))}
          </ul>
          {(result.majorRoles || []).length > 0 ? (
            <>
              <p>Major civilization-fit roles:</p>
              <ul>
                {(result.majorRoles || []).map((role) => {
                  const rationale = (result.roleRationale || []).find(r => r.role === role && r.category === 'major');
                  return (
                    <li key={`major-${role}`}>
                      <strong>{role}</strong>
                      {rationale && rationale.explanation ? (
                        <div style={{ fontSize: '0.9em', marginTop: '0.25rem', opacity: 0.8 }}>
                          {rationale.explanation}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </>
          ) : null}
          {(result.supportingRoles || []).length > 0 ? (
            <>
              <p>Supporting and mission-critical roles:</p>
              <ul>
                {(result.supportingRoles || []).map((role) => {
                  const rationale = (result.roleRationale || []).find(r => r.role === role && r.category === 'supporting');
                  return (
                    <li key={`support-${role}`}>
                      <strong>{role}</strong>
                      {rationale && rationale.explanation ? (
                        <div style={{ fontSize: '0.9em', marginTop: '0.25rem', opacity: 0.8 }}>
                          {rationale.explanation}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </>
          ) : null}
          <div className="career-actions">
            <Link to="/civilization-library">Find Matching Manuals</Link>
            <button onClick={() => {
              setAnswers({});
              setStep(0);
              setResult(null);
              setRecommendedManuals([]);
            }}>
              Retake Quiz
            </button>
          </div>

          {recommendedManuals.length > 0 ? (
            <div className="career-manuals">
              <h3>Recommended Manuals</h3>
              <div className="career-manuals-grid">
                {recommendedManuals.map((manual) => (
                  <a
                    key={manual._id}
                    className="career-manual-card"
                    href={toApiUrl(`/api/library/${manual._id}/download`)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <strong>{manual.title}</strong>
                    <span>{manual.category} • {manual.domain}</span>
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          {taxonomy ? (
            <div className="career-manuals">
              <h3>Civilization Role Atlas</h3>
              <p>
                Your path can evolve across these shared role levels while contributing to core domains.
              </p>
              <div className="career-pills">
                {(taxonomy.roles || []).map((role) => (
                  <span key={role}>{role}</span>
                ))}
              </div>
              <div className="career-pills">
                {(taxonomy.domains || []).slice(0, 8).map((domain) => (
                  <span key={domain}>{domain}</span>
                ))}
              </div>
              {(result.topDomains || []).length > 0 ? (
                <div className="career-domain-roles">
                  {(result.topDomains || []).map((domain) => {
                    const mappedRoles = taxonomy?.domainRoles?.[domain] || taxonomy?.roles || [];
                    return (
                      <div key={domain} className="career-domain-role-card">
                        <strong>{domain}</strong>
                        <div className="career-pills">
                          {mappedRoles.map((role) => (
                            <span key={`${domain}-${role}`}>{role}</span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
