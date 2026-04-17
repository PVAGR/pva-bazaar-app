import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchFederationIntroQuizDefinition,
  submitFederationIntroQuiz,
  fetchFederationLiveMap,
  checkInFederationPresence,
  fetchMyFederationPresence,
} from '../lib/api';
import './FederationMapPage.css';

function formatRelativeTime(value) {
  if (!value) return 'unknown';
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 'unknown';
  const diffMs = Date.now() - timestamp;
  const diffMin = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}

export default function FederationMapPage() {
  const [liveData, setLiveData] = useState(null);
  const [myPresence, setMyPresence] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [country, setCountry] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [careerTopDomains, setCareerTopDomains] = useState('');
  const [careerTopRoles, setCareerTopRoles] = useState('');
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const countries = useMemo(() => {
    const rows = Array.isArray(liveData?.byCountry) ? liveData.byCountry : [];
    const max = rows.reduce((best, row) => Math.max(best, Number(row.activeCount || 0)), 1);
    return rows.map((row) => ({
      ...row,
      ratio: Math.min(100, Math.round((Number(row.activeCount || 0) / max) * 100)),
    }));
  }, [liveData]);

  async function loadLiveData() {
    const response = await fetchFederationLiveMap(90);
    if (response?.ok) {
      setLiveData(response);
    }
  }

  async function loadBootstrap() {
    setLoading(true);
    setError('');
    try {
      const [liveResponse, meResponse, quizResponse] = await Promise.all([
        fetchFederationLiveMap(90),
        fetchMyFederationPresence().catch(() => ({ ok: false })),
        fetchFederationIntroQuizDefinition(),
      ]);

      if (liveResponse?.ok) {
        setLiveData(liveResponse);
      }

      if (meResponse?.ok && meResponse.item) {
        setMyPresence(meResponse.item);
        setCountry(meResponse.item.country || '');
        setCountryCode(meResponse.item.countryCode || '');
        setJobTitle(meResponse.item.jobTitle || '');
      }

      if (quizResponse?.ok && quizResponse.quiz) {
        setQuiz(quizResponse.quiz);
      }
    } catch (err) {
      setError(err?.message || 'Unable to load federation map data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBootstrap();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      loadLiveData().catch(() => {});
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const handleAutoDetectLocation = async () => {
    setDetecting(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('https://ipapi.co/json/', { method: 'GET' });
      const payload = await response.json();
      const nextCountry = String(payload?.country_name || '').trim();
      const nextCountryCode = String(payload?.country_code || '').trim().toUpperCase();

      if (!nextCountry) {
        throw new Error('Unable to determine country from public IP.');
      }

      setCountry(nextCountry);
      setCountryCode(nextCountryCode);
      setMessage(`Detected location: ${nextCountry}${nextCountryCode ? ` (${nextCountryCode})` : ''}`);
    } catch (err) {
      setError(err?.message || 'IP location detection failed.');
    } finally {
      setDetecting(false);
    }
  };

  const handleSelectAnswer = (questionId, optionKey) => {
    setQuizAnswers((prev) => ({ ...prev, [questionId]: optionKey }));
  };

  const handleSubmitIntroQuiz = async () => {
    if (!quiz?.questions?.length) return;
    const answers = quiz.questions
      .map((q) => ({ questionId: q.id, optionKey: quizAnswers[q.id] }))
      .filter((entry) => entry.optionKey);

    if (answers.length < quiz.questions.length) {
      setError('Please answer all orientation quiz questions.');
      return;
    }

    setError('');
    const response = await submitFederationIntroQuiz(answers);
    if (!response?.ok || !response.result) {
      setError(response?.message || 'Unable to submit intro quiz.');
      return;
    }
    setQuizResult(response.result);
    setMessage(`Recommended federation role: ${response.result.recommendedRole}`);
  };

  const handleCheckIn = async () => {
    if (!country.trim()) {
      setError('Country is required for map check-in.');
      return;
    }

    setCheckingIn(true);
    setError('');
    setMessage('');
    try {
      const response = await checkInFederationPresence({
        country: country.trim(),
        countryCode: countryCode.trim(),
        jobTitle: jobTitle.trim(),
        source: countryCode ? 'ip-lookup' : 'manual',
        introRecommendedRole: quizResult?.recommendedRole || '',
        introScore: quizResult?.score || 0,
        careerTopDomains: careerTopDomains
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 8),
        careerTopRoles: careerTopRoles
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 8),
      });

      if (!response?.ok || !response.item) {
        setError(response?.message || 'Check-in failed.');
        return;
      }

      setMyPresence(response.item);
      setMessage('Federation check-in complete. You are now visible on the world pulse map.');
      await loadLiveData();
    } catch (err) {
      setError(err?.message || 'Check-in failed.');
    } finally {
      setCheckingIn(false);
    }
  };

  return (
    <div className="federation-map-page">
      <header className="federation-map-hero">
        <p className="federation-map-kicker">Federation Node Network</p>
        <h1>Live World Citizen Pulse</h1>
        <p>
          Track active countries, passport holders, and contribution roles in near real time.
          Use auto-detect from your public IP or manually register your location.
        </p>
        <div className="federation-map-actions">
          <Link to="/passport">Open Passport</Link>
          <Link to="/career-quiz">Career Quiz</Link>
        </div>
      </header>

      <section className="federation-map-grid">
        <article className="federation-card federation-card--checkin">
          <h2>Check In</h2>
          <p>Register your current country and role so the federation map can track your node.</p>

          <div className="federation-form-row">
            <label htmlFor="country">Country</label>
            <input id="country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Kenya" />
          </div>

          <div className="federation-form-row">
            <label htmlFor="countryCode">Country Code</label>
            <input
              id="countryCode"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
              placeholder="KE"
              maxLength={2}
            />
          </div>

          <div className="federation-form-row">
            <label htmlFor="jobTitle">Current Role / Job</label>
            <input
              id="jobTitle"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Community Coordinator"
            />
          </div>

          <div className="federation-form-row">
            <label htmlFor="careerDomains">Career Domains (optional, comma-separated)</label>
            <input
              id="careerDomains"
              value={careerTopDomains}
              onChange={(e) => setCareerTopDomains(e.target.value)}
              placeholder="education, governance"
            />
          </div>

          <div className="federation-form-row">
            <label htmlFor="careerRoles">Career Roles (optional, comma-separated)</label>
            <input
              id="careerRoles"
              value={careerTopRoles}
              onChange={(e) => setCareerTopRoles(e.target.value)}
              placeholder="Community Mentor, Diplomatic Facilitator"
            />
          </div>

          <div className="federation-button-row">
            <button type="button" onClick={handleAutoDetectLocation} disabled={detecting}>
              {detecting ? 'Detecting...' : 'Auto-Detect Country'}
            </button>
            <button type="button" onClick={handleCheckIn} disabled={checkingIn}>
              {checkingIn ? 'Checking in...' : 'Check In to Map'}
            </button>
          </div>

          {myPresence ? (
            <p className="federation-inline-note">
              Last seen: {formatRelativeTime(myPresence.lastSeenAt)} in {myPresence.country || 'Unknown'}
            </p>
          ) : null}
        </article>

        <article className="federation-card federation-card--quiz">
          <h2>Federation Intro Quiz</h2>
          <p>Quickly estimate where your profile can contribute the most.</p>
          {quiz?.questions?.map((question) => (
            <div key={question.id} className="federation-quiz-question">
              <h3>{question.prompt}</h3>
              <div className="federation-option-row">
                {question.options.map((option) => {
                  const active = quizAnswers[question.id] === option.key;
                  return (
                    <button
                      type="button"
                      key={`${question.id}-${option.key}`}
                      className={active ? 'active' : ''}
                      onClick={() => handleSelectAnswer(question.id, option.key)}
                    >
                      <strong>{option.key}</strong>
                      <span>{option.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="federation-button-row">
            <button type="button" onClick={handleSubmitIntroQuiz}>
              Submit Orientation Quiz
            </button>
          </div>

          {quizResult ? (
            <div className="federation-result">
              <strong>Recommended Role:</strong> {quizResult.recommendedRole}
              <div>Score: {quizResult.score}</div>
            </div>
          ) : null}
        </article>
      </section>

      {error ? <div className="federation-alert federation-alert--error">{error}</div> : null}
      {message ? <div className="federation-alert federation-alert--ok">{message}</div> : null}

      <section className="federation-card federation-card--map">
        <div className="federation-live-header">
          <h2>World Pulse</h2>
          <button type="button" onClick={() => loadLiveData()} disabled={loading}>
            Refresh Live Data
          </button>
        </div>

        <div className="federation-stats-row">
          <div>
            <span>Active Citizens</span>
            <strong>{liveData?.totals?.activeCitizens || 0}</strong>
          </div>
          <div>
            <span>Countries Online</span>
            <strong>{liveData?.totals?.countries || 0}</strong>
          </div>
          <div>
            <span>Window</span>
            <strong>{liveData?.windowMinutes || 0}m</strong>
          </div>
        </div>

        <div className="federation-country-grid">
          {countries.map((row) => (
            <article key={`${row.countryCode}-${row.country}`} className="federation-country-card">
              <header>
                <h3>{row.country}</h3>
                <span>{row.countryCode || '??'}</span>
              </header>
              <div className="federation-country-bar">
                <div style={{ width: `${row.ratio}%` }} />
              </div>
              <p>{row.activeCount} active</p>
              <ul>
                {row.topRoles.map((roleItem) => (
                  <li key={`${row.countryCode}-${roleItem.role}`}>
                    {roleItem.role} ({roleItem.count})
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="federation-card federation-card--participants">
        <h2>Live Passport Nodes</h2>
        <p>Recent active citizens and where they are currently contributing.</p>
        <div className="federation-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Passport ID</th>
                <th>Country</th>
                <th>Job</th>
                <th>Suggested Federation Role</th>
                <th>Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {(liveData?.participants || []).map((person) => (
                <tr key={`${person.id}-${person.lastSeenAt}`}>
                  <td>{person.name}</td>
                  <td>{person.societalId || 'pending'}</td>
                  <td>{person.country || 'Unknown'}</td>
                  <td>{person.jobTitle || person.citizenRole || 'Citizen'}</td>
                  <td>{person.recommendedRole || '-'}</td>
                  <td>{formatRelativeTime(person.lastSeenAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
