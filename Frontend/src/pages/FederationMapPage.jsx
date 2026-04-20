import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchFederationIntroQuizDefinition,
  submitFederationIntroQuiz,
  fetchFederationLiveMap,
  checkInFederationPresence,
  fetchMyFederationPresence,
  fetchFederationGameState,
  runFederationGameAction,
  fetchFederationGameWorld,
  fetchMyFederationFaction,
  createFederationFaction,
  joinFederationFaction,
  claimFederationSector,
  onboardFederationHkPlayer,
  fetchFederationHkProfile,
  verifyFederationHkPassportHash,
  recordFederationHkProgression,
  fetchFederationHkProgressionHistory,
} from '../lib/api';
import { PUBLIC_ROUTES } from '../config/publicRoutes';
import './FederationMapPage.css';

const COUNTRY_COORDS = {
  US: { lat: 39.8, lon: -98.6 },
  CA: { lat: 56.1, lon: -106.3 },
  MX: { lat: 23.6, lon: -102.5 },
  BR: { lat: -14.2, lon: -51.9 },
  AR: { lat: -38.4, lon: -63.6 },
  GB: { lat: 55.3, lon: -3.4 },
  FR: { lat: 46.2, lon: 2.2 },
  DE: { lat: 51.2, lon: 10.4 },
  IT: { lat: 41.9, lon: 12.6 },
  ES: { lat: 40.5, lon: -3.7 },
  KE: { lat: -0.02, lon: 37.9 },
  NG: { lat: 9.1, lon: 8.7 },
  ZA: { lat: -30.6, lon: 22.9 },
  EG: { lat: 26.8, lon: 30.8 },
  IN: { lat: 20.6, lon: 78.9 },
  CN: { lat: 35.8, lon: 104.1 },
  JP: { lat: 36.2, lon: 138.2 },
  KR: { lat: 36.5, lon: 127.8 },
  AU: { lat: -25.3, lon: 133.7 },
  NZ: { lat: -40.9, lon: 174.8 },
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function hashCode(input) {
  const text = String(input || 'XX');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function fallbackCoords(countryCode, country) {
  const seed = hashCode(`${countryCode || ''}${country || ''}`);
  const lat = ((seed % 1500) / 1500) * 130 - 65;
  const lon = (((Math.floor(seed / 17) % 3600) / 3600) * 360) - 180;
  return { lat, lon };
}

function resolveCoords(countryCode, country) {
  const code = String(countryCode || '').toUpperCase();
  if (COUNTRY_COORDS[code]) return COUNTRY_COORDS[code];
  return fallbackCoords(code, country);
}

function projectToPlanet(lat, lon, view) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const phi = toRad(lat);
  const lambda = toRad(lon);
  const phi0 = toRad(view.pitch);
  const lambda0 = toRad(view.yaw);

  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  const deltaLambda = lambda - lambda0;

  const x = cosPhi * Math.sin(deltaLambda);
  const y = Math.cos(phi0) * sinPhi - Math.sin(phi0) * cosPhi * Math.cos(deltaLambda);
  const z = Math.sin(phi0) * sinPhi + Math.cos(phi0) * cosPhi * Math.cos(deltaLambda);

  if (z <= 0) return null;

  return {
    x,
    y,
    z,
    left: 50 + x * 46 * view.zoom,
    top: 50 - y * 46 * view.zoom,
  };
}

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
  const [siteMapFilter, setSiteMapFilter] = useState('');
  const [myFaction, setMyFaction] = useState(null);
  const [newFactionName, setNewFactionName] = useState('');
  const [newFactionTag, setNewFactionTag] = useState('');
  const [joinInviteCode, setJoinInviteCode] = useState('');
  const [claimSectorCode, setClaimSectorCode] = useState('');
  const [claimSectorLabel, setClaimSectorLabel] = useState('');
  const [factionBusy, setFactionBusy] = useState(false);
  const [planetView, setPlanetView] = useState({ zoom: 1.05, yaw: 0, pitch: 10 });
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [gameNotice, setGameNotice] = useState('');
  const [gameBusy, setGameBusy] = useState(false);
  const [worldGameFeed, setWorldGameFeed] = useState({ leaderboard: [], events: [], sectors: [] });
  const [hkProfile, setHkProfile] = useState(null);
  const [hkHistory, setHkHistory] = useState([]);
  const [hkLoading, setHkLoading] = useState(false);
  const [hkBusy, setHkBusy] = useState(false);
  const [hkPassportId, setHkPassportId] = useState('');
  const [hkPassportCountryCode, setHkPassportCountryCode] = useState('');
  const [hkSourceType, setHkSourceType] = useState('knowledge_contribution');
  const [hkSourceRef, setHkSourceRef] = useState('');
  const [hkContributionValue, setHkContributionValue] = useState('10');
  const [hkEconomicValue, setHkEconomicValue] = useState('0');
  const [hkNotes, setHkNotes] = useState('');
  const [gameState, setGameState] = useState({
    cycle: 0,
    energy: 120,
    food: 95,
    materials: 80,
    population: 14,
    outposts: 1,
    keepers: 0,
    research: 0,
  });
  const dragRef = useRef(null);

  const countries = useMemo(() => {
    const rows = Array.isArray(liveData?.byCountry) ? liveData.byCountry : [];
    const max = rows.reduce((best, row) => Math.max(best, Number(row.activeCount || 0)), 1);
    return rows.map((row) => ({
      ...row,
      ratio: Math.min(100, Math.round((Number(row.activeCount || 0) / max) * 100)),
    }));
  }, [liveData]);

  const planetNodes = useMemo(() => {
    return countries.map((row) => {
      const coords = resolveCoords(row.countryCode, row.country);
      const projected = projectToPlanet(coords.lat, coords.lon, planetView);
      if (!projected) return null;
      const sizeBoost = Math.log2(Number(row.activeCount || 1) + 1);
      return {
        ...row,
        lat: coords.lat,
        lon: coords.lon,
        left: projected.left,
        top: projected.top,
        depth: projected.z,
        markerSize: clamp(6 + sizeBoost * 3.2 * projected.z, 6, 20),
      };
    }).filter(Boolean);
  }, [countries, planetView]);

  const visibleParticipants = useMemo(() => {
    if (!selectedCountry) return [];
    const rows = Array.isArray(liveData?.participants) ? liveData.participants : [];
    return rows
      .filter((person) => String(person.countryCode || '').toUpperCase() === String(selectedCountry.countryCode || '').toUpperCase())
      .slice(0, 10);
  }, [liveData, selectedCountry]);

  const dynamicSiteMap = useMemo(() => {
    const term = siteMapFilter.trim().toLowerCase();
    const publicRoutes = PUBLIC_ROUTES.filter((route) => route.access === 'public');
    const filtered = publicRoutes.filter((route) => {
      if (!term) return true;
      return [route.title, route.to, route.description, route.navLabel]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
    return filtered.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
  }, [siteMapFilter]);

  const siteMapByGroup = useMemo(() => {
    return dynamicSiteMap.reduce((acc, route) => {
      const key = route.group || 'other';
      if (!acc[key]) acc[key] = [];
      acc[key].push(route);
      return acc;
    }, {});
  }, [dynamicSiteMap]);

  async function loadLiveData() {
    const response = await fetchFederationLiveMap(90);
    if (response?.ok) {
      setLiveData(response);
    }
  }

  async function loadHkData() {
    setHkLoading(true);
    try {
      const [profileResponse, historyResponse] = await Promise.all([
        fetchFederationHkProfile().catch(() => ({ ok: false })),
        fetchFederationHkProgressionHistory(12).catch(() => ({ ok: false })),
      ]);

      if (profileResponse?.ok && profileResponse.profile) {
        setHkProfile(profileResponse.profile);
      }

      if (historyResponse?.ok && Array.isArray(historyResponse.items)) {
        setHkHistory(historyResponse.items);
      }
    } finally {
      setHkLoading(false);
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

      const [gameStateResponse, worldResponse] = await Promise.all([
        fetchFederationGameState().catch(() => ({ ok: false })),
        fetchFederationGameWorld().catch(() => ({ ok: false })),
      ]);

      const [hkProfileResponse, hkHistoryResponse] = await Promise.all([
        fetchFederationHkProfile().catch(() => ({ ok: false })),
        fetchFederationHkProgressionHistory(12).catch(() => ({ ok: false })),
      ]);

      const factionResponse = await fetchMyFederationFaction().catch(() => ({ ok: false }));

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

      if (gameStateResponse?.ok && gameStateResponse.state) {
        const state = gameStateResponse.state;
        setGameState((prev) => ({
          ...prev,
          cycle: Number(state.cycle || 0),
          energy: Number(state.energy || 0),
          food: Number(state.food || 0),
          materials: Number(state.materials || 0),
          population: Number(state.population || 1),
          outposts: Number(state.outposts || 0),
          keepers: Number(state.keepers || 0),
          research: Number(state.research || 0),
        }));
      }

      if (worldResponse?.ok && worldResponse.world) {
        setWorldGameFeed(worldResponse.world);
      }

      if (factionResponse?.ok) {
        setMyFaction(factionResponse.faction || null);
      }

      if (hkProfileResponse?.ok && hkProfileResponse.profile) {
        setHkProfile(hkProfileResponse.profile);
      } else {
        const onboardResponse = await onboardFederationHkPlayer().catch(() => ({ ok: false }));
        if (onboardResponse?.ok && onboardResponse.profile) {
          setHkProfile(onboardResponse.profile);
        }
      }

      if (hkHistoryResponse?.ok && Array.isArray(hkHistoryResponse.items)) {
        setHkHistory(hkHistoryResponse.items);
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

  const handlePlanetWheel = (event) => {
    event.preventDefault();
    setPlanetView((prev) => ({
      ...prev,
      zoom: clamp(prev.zoom + (event.deltaY < 0 ? 0.09 : -0.09), 0.75, 2.4),
    }));
  };

  const handlePlanetMouseDown = (event) => {
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      yaw: planetView.yaw,
      pitch: planetView.pitch,
    };
  };

  const handlePlanetMouseMove = (event) => {
    if (!dragRef.current) return;
    const dx = event.clientX - dragRef.current.x;
    const dy = event.clientY - dragRef.current.y;
    setPlanetView((prev) => ({
      ...prev,
      yaw: dragRef.current.yaw - dx * 0.28,
      pitch: clamp(dragRef.current.pitch + dy * 0.18, -55, 55),
    }));
  };

  const handlePlanetMouseUp = () => {
    dragRef.current = null;
  };

  const hkProgressPercent = useMemo(() => {
    const xp = Number(hkProfile?.xp || 0);
    const next = Number(hkProfile?.nextLevelXp || 0);
    if (next <= 0) return 0;
    return clamp(Math.round((xp / next) * 100), 0, 100);
  }, [hkProfile]);

  const actionToApiType = {
    outpost: 'build_outpost',
    keeper: 'train_keeper',
    research: 'run_research',
  };

  const triggerGameAction = async (type) => {
    const actionType = actionToApiType[type];
    if (!actionType) return;
    setGameNotice('');
    setGameBusy(true);
    try {
      const response = await runFederationGameAction(actionType);
      if (!response?.ok || !response.state) {
        setGameNotice(response?.message || 'Action failed.');
        return;
      }
      const state = response.state;
      setGameState((prev) => ({
        ...prev,
        cycle: Number(state.cycle || 0),
        energy: Number(state.energy || 0),
        food: Number(state.food || 0),
        materials: Number(state.materials || 0),
        population: Number(state.population || 1),
        outposts: Number(state.outposts || 0),
        keepers: Number(state.keepers || 0),
        research: Number(state.research || 0),
      }));
      setGameNotice(response.notice || 'Action completed.');
      const worldResponse = await fetchFederationGameWorld().catch(() => ({ ok: false }));
      if (worldResponse?.ok && worldResponse.world) {
        setWorldGameFeed(worldResponse.world);
      }
    } catch (err) {
      setGameNotice(err?.message || 'Action failed.');
    } finally {
      setGameBusy(false);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      loadLiveData().catch(() => {});
      fetchFederationGameWorld()
        .then((response) => {
          if (response?.ok && response.world) {
            setWorldGameFeed(response.world);
          }
        })
        .catch(() => {});
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

  const refreshFactionAndWorld = async () => {
    const [factionResponse, worldResponse, stateResponse] = await Promise.all([
      fetchMyFederationFaction().catch(() => ({ ok: false })),
      fetchFederationGameWorld().catch(() => ({ ok: false })),
      fetchFederationGameState().catch(() => ({ ok: false })),
    ]);
    if (factionResponse?.ok) {
      setMyFaction(factionResponse.faction || null);
    }
    if (worldResponse?.ok && worldResponse.world) {
      setWorldGameFeed(worldResponse.world);
    }
    if (stateResponse?.ok && stateResponse.state) {
      const state = stateResponse.state;
      setGameState((prev) => ({
        ...prev,
        cycle: Number(state.cycle || 0),
        energy: Number(state.energy || 0),
        food: Number(state.food || 0),
        materials: Number(state.materials || 0),
        population: Number(state.population || 1),
        outposts: Number(state.outposts || 0),
        keepers: Number(state.keepers || 0),
        research: Number(state.research || 0),
      }));
    }
  };

  const handleCreateFaction = async () => {
    setFactionBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await createFederationFaction({ name: newFactionName, tag: newFactionTag });
      if (!response?.ok) {
        setError(response?.message || 'Unable to create faction.');
        return;
      }
      setMessage(`Faction created: ${response.faction.name} (${response.faction.tag})`);
      setNewFactionName('');
      setNewFactionTag('');
      await refreshFactionAndWorld();
    } catch (err) {
      setError(err?.message || 'Unable to create faction.');
    } finally {
      setFactionBusy(false);
    }
  };

  const handleJoinFaction = async () => {
    setFactionBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await joinFederationFaction({ inviteCode: joinInviteCode });
      if (!response?.ok) {
        setError(response?.message || 'Unable to join faction.');
        return;
      }
      setMessage(`Joined faction: ${response.faction.name} (${response.faction.tag})`);
      setJoinInviteCode('');
      await refreshFactionAndWorld();
    } catch (err) {
      setError(err?.message || 'Unable to join faction.');
    } finally {
      setFactionBusy(false);
    }
  };

  const handleClaimSector = async () => {
    setFactionBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await claimFederationSector({ sector: claimSectorCode, label: claimSectorLabel });
      if (!response?.ok) {
        setError(response?.message || 'Unable to claim sector.');
        return;
      }
      setMessage(`Sector secured: ${response.sector.label} (${response.sector.sector})`);
      setClaimSectorCode('');
      setClaimSectorLabel('');
      await refreshFactionAndWorld();
    } catch (err) {
      setError(err?.message || 'Unable to claim sector.');
    } finally {
      setFactionBusy(false);
    }
  };

  const handleHkOnboard = async () => {
    setHkBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await onboardFederationHkPlayer();
      if (!response?.ok || !response.profile) {
        setError(response?.message || 'Unable to initialize HK profile.');
        return;
      }
      setHkProfile(response.profile);
      setMessage('HK profile initialized. Your sprite starts at level 1 and grows with verified contribution.');
      await loadHkData();
    } catch (err) {
      setError(err?.message || 'Unable to initialize HK profile.');
    } finally {
      setHkBusy(false);
    }
  };

  const handleHkVerifyPassportHash = async () => {
    if (!hkPassportId.trim()) {
      setError('Passport ID is required for hash verification.');
      return;
    }
    setHkBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await verifyFederationHkPassportHash({
        passportId: hkPassportId.trim(),
        passportCountryCode: hkPassportCountryCode.trim().toUpperCase(),
      });
      if (!response?.ok) {
        setError(response?.message || 'Passport hash verification failed.');
        return;
      }
      setHkPassportId('');
      setMessage('Passport identity hash verified. Raw ID was not stored.');
      await loadHkData();
    } catch (err) {
      setError(err?.message || 'Passport hash verification failed.');
    } finally {
      setHkBusy(false);
    }
  };

  const handleHkRecordProgression = async () => {
    setHkBusy(true);
    setError('');
    setMessage('');
    try {
      const payload = {
        sourceType: hkSourceType,
        sourceRef: hkSourceRef.trim(),
        contributionValue: Number(hkContributionValue || 0),
        economicValue: Number(hkEconomicValue || 0),
        notes: hkNotes.trim(),
      };
      const response = await recordFederationHkProgression(payload);
      if (!response?.ok) {
        setError(response?.message || 'Unable to record progression event.');
        return;
      }
      if (response?.skipped) {
        setMessage(response?.skipReason || 'Progression event accepted but no XP was awarded.');
      } else {
        setMessage(`Progression recorded: +${response?.progression?.awardedXp || 0} XP`);
      }
      await loadHkData();
    } catch (err) {
      setError(err?.message || 'Unable to record progression event.');
    } finally {
      setHkBusy(false);
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

      <section className="federation-card federation-card--hk">
        <div className="federation-live-header">
          <h2>Heel-Kawn HK Profile</h2>
          <div className="federation-button-row">
            <button type="button" onClick={handleHkOnboard} disabled={hkBusy}>
              {hkBusy ? 'Working...' : 'Initialize Level 1 Sprite'}
            </button>
            <button type="button" onClick={() => loadHkData()} disabled={hkLoading || hkBusy}>
              {hkLoading ? 'Refreshing...' : 'Refresh HK'}
            </button>
          </div>
        </div>

        <p className="federation-inline-note">
          HK is account-gated. Identity uses one-way passport hashing only, and location remains country-level by default.
        </p>

        <div className="hk-grid">
          <article className="planet-game-panel">
            <h3>Sprite Progression</h3>
            <div className="hk-stat-grid">
              <div><span>Level</span><strong>{hkProfile?.level || 1}</strong></div>
              <div><span>XP</span><strong>{hkProfile?.xp || 0}</strong></div>
              <div><span>Contribution</span><strong>{hkProfile?.contributionScore || 0}</strong></div>
              <div><span>Economic</span><strong>{hkProfile?.economicScore || 0}</strong></div>
            </div>
            <div className="hk-progress">
              <div style={{ width: `${hkProgressPercent}%` }} />
            </div>
            <p className="federation-inline-note">
              {hkProfile?.xp || 0}/{hkProfile?.nextLevelXp || 120} XP to next level.
            </p>
          </article>

          <article className="planet-game-panel">
            <h3>Passport Hash Verification</h3>
            <div className="federation-form-row">
              <label htmlFor="hkPassportId">Passport ID (never stored raw)</label>
              <input
                id="hkPassportId"
                value={hkPassportId}
                onChange={(e) => setHkPassportId(e.target.value)}
                placeholder="A12345678"
              />
            </div>
            <div className="federation-form-row">
              <label htmlFor="hkPassportCountryCode">Passport Country Code</label>
              <input
                id="hkPassportCountryCode"
                value={hkPassportCountryCode}
                onChange={(e) => setHkPassportCountryCode(e.target.value.toUpperCase())}
                placeholder="KE"
                maxLength={2}
              />
            </div>
            <button type="button" disabled={hkBusy || !hkPassportId.trim()} onClick={handleHkVerifyPassportHash}>
              {hkBusy ? 'Verifying...' : 'Verify Passport Hash'}
            </button>
            <p className="federation-inline-note">
              Status: {hkProfile?.identity?.passportHashVerified ? 'Verified' : 'Not verified'}
              {hkProfile?.identity?.passportHashLast4 ? ` (ending ${hkProfile.identity.passportHashLast4})` : ''}
            </p>
          </article>

          <article className="planet-game-panel">
            <h3>Record Contribution Event</h3>
            <div className="federation-form-row">
              <label htmlFor="hkSourceType">Source Type</label>
              <select id="hkSourceType" value={hkSourceType} onChange={(e) => setHkSourceType(e.target.value)}>
                <option value="knowledge_contribution">Knowledge Contribution</option>
                <option value="verified_transaction">Verified Transaction</option>
                <option value="governance_action">Governance Action</option>
                <option value="consistency_streak">Consistency Streak</option>
              </select>
            </div>
            <div className="federation-form-row">
              <label htmlFor="hkSourceRef">Source Reference (optional but recommended)</label>
              <input id="hkSourceRef" value={hkSourceRef} onChange={(e) => setHkSourceRef(e.target.value)} placeholder="order-123 / article-7" />
            </div>
            <div className="federation-form-row">
              <label htmlFor="hkContributionValue">Contribution Value</label>
              <input id="hkContributionValue" type="number" min="0" value={hkContributionValue} onChange={(e) => setHkContributionValue(e.target.value)} />
            </div>
            <div className="federation-form-row">
              <label htmlFor="hkEconomicValue">Economic Value</label>
              <input id="hkEconomicValue" type="number" min="0" value={hkEconomicValue} onChange={(e) => setHkEconomicValue(e.target.value)} />
            </div>
            <div className="federation-form-row">
              <label htmlFor="hkNotes">Notes</label>
              <input id="hkNotes" value={hkNotes} onChange={(e) => setHkNotes(e.target.value)} placeholder="Verified transaction from marketplace" />
            </div>
            <button type="button" disabled={hkBusy} onClick={handleHkRecordProgression}>
              {hkBusy ? 'Recording...' : 'Record Progression'}
            </button>
          </article>

          <article className="planet-game-panel">
            <h3>Recent Progression History</h3>
            <div className="planet-game-list">
              {hkHistory.length ? hkHistory.map((item) => (
                <div key={item.id}>
                  <strong>{item.sourceType}</strong>
                  <span>
                    +{item.totalXpAwarded} XP ({item.contributionPoints} contribution, {item.economicPoints} economic)
                  </span>
                  <span>{formatRelativeTime(item.createdAt)}</span>
                </div>
              )) : (
                <p className="federation-inline-note">No progression events yet.</p>
              )}
            </div>
          </article>
        </div>
      </section>

      <section className="federation-card federation-card--planetGame">
        <div className="federation-live-header">
          <h2>Federation Planet Engine (PVA Alpha)</h2>
          <div className="federation-button-row">
            <button type="button" onClick={() => setPlanetView((prev) => ({ ...prev, zoom: clamp(prev.zoom + 0.12, 0.75, 2.4) }))}>Zoom +</button>
            <button type="button" onClick={() => setPlanetView((prev) => ({ ...prev, zoom: clamp(prev.zoom - 0.12, 0.75, 2.4) }))}>Zoom -</button>
            <button type="button" onClick={() => setPlanetView({ zoom: 1.05, yaw: 0, pitch: 10 })}>Reset View</button>
          </div>
        </div>
        <p className="federation-inline-note">
          Drag to rotate the planet, scroll to zoom, then click a node to inspect active citizens. This is an original
          strategy sandbox inspired by community simulation concepts.
        </p>

        <div className="planet-game-layout">
          <div
            className="planet-shell"
            onWheel={handlePlanetWheel}
            onMouseDown={handlePlanetMouseDown}
            onMouseMove={handlePlanetMouseMove}
            onMouseUp={handlePlanetMouseUp}
            onMouseLeave={handlePlanetMouseUp}
            role="presentation"
          >
            <div className="planet-sphere" />
            <div className="planet-grid" />
            {planetNodes.map((node) => (
              <button
                key={`${node.countryCode}-${node.country}`}
                type="button"
                className={`planet-node ${selectedCountry?.countryCode === node.countryCode ? 'active' : ''}`}
                style={{
                  left: `${node.left}%`,
                  top: `${node.top}%`,
                  width: `${node.markerSize}px`,
                  height: `${node.markerSize}px`,
                  opacity: clamp(node.depth + 0.2, 0.4, 1),
                }}
                title={`${node.country}: ${node.activeCount} active`}
                onClick={() => setSelectedCountry(node)}
              />
            ))}
          </div>

          <aside className="planet-inspector">
            <h3>{selectedCountry ? `${selectedCountry.country} Node` : 'Select a Planet Node'}</h3>
            {selectedCountry ? (
              <>
                <p>
                  <strong>{selectedCountry.activeCount}</strong> active citizens · {selectedCountry.countryCode || '??'}
                </p>
                <ul>
                  {selectedCountry.topRoles.map((role) => (
                    <li key={`${selectedCountry.countryCode}-${role.role}`}>{role.role} ({role.count})</li>
                  ))}
                </ul>
                <div className="planet-people-list">
                  {visibleParticipants.length > 0 ? visibleParticipants.map((person) => (
                    <article key={`${person.id}-${person.lastSeenAt}`}>
                      <strong>{person.name}</strong>
                      <span>{person.jobTitle || person.citizenRole || 'Citizen'}</span>
                    </article>
                  )) : <p>No live participant detail for this node yet.</p>}
                </div>
              </>
            ) : (
              <p>Choose a glowing node to inspect citizens and contribution roles.</p>
            )}
          </aside>
        </div>

        <div className="planet-game-controls">
          <div className="planet-resource-grid">
            <div><span>Cycle</span><strong>{gameState.cycle}</strong></div>
            <div><span>Energy</span><strong>{gameState.energy}</strong></div>
            <div><span>Food</span><strong>{gameState.food}</strong></div>
            <div><span>Materials</span><strong>{gameState.materials}</strong></div>
            <div><span>Population</span><strong>{gameState.population}</strong></div>
            <div><span>Outposts</span><strong>{gameState.outposts}</strong></div>
            <div><span>Keepers</span><strong>{gameState.keepers}</strong></div>
            <div><span>Research</span><strong>{gameState.research}</strong></div>
          </div>
          <div className="federation-button-row">
            <button type="button" disabled={gameBusy} onClick={() => triggerGameAction('outpost')}>Build Outpost</button>
            <button type="button" disabled={gameBusy} onClick={() => triggerGameAction('keeper')}>Train Keeper</button>
            <button type="button" disabled={gameBusy} onClick={() => triggerGameAction('research')}>Run Research</button>
          </div>
          {gameNotice ? <p className="federation-inline-note">{gameNotice}</p> : null}
        </div>

        <div className="planet-faction-shell">
          <article className="planet-game-panel">
            <h3>Faction Command</h3>
            {myFaction ? (
              <div className="planet-game-list">
                <div>
                  <strong>{myFaction.name} ({myFaction.tag})</strong>
                  <span>Members: {myFaction.memberCount || (myFaction.members || []).length} · Invite: {myFaction.inviteCode}</span>
                </div>
              </div>
            ) : (
              <p className="federation-inline-note">No faction yet. Create one or join using an invite code.</p>
            )}
          </article>

          <article className="planet-game-panel">
            <h3>Create Faction</h3>
            <div className="federation-form-row">
              <label htmlFor="newFactionName">Faction Name</label>
              <input id="newFactionName" value={newFactionName} onChange={(e) => setNewFactionName(e.target.value)} placeholder="Aurora League" />
            </div>
            <div className="federation-form-row">
              <label htmlFor="newFactionTag">Faction Tag</label>
              <input id="newFactionTag" value={newFactionTag} onChange={(e) => setNewFactionTag(e.target.value.toUpperCase())} placeholder="AUR" />
            </div>
            <button type="button" disabled={factionBusy || !newFactionName || !newFactionTag} onClick={handleCreateFaction}>
              {factionBusy ? 'Processing...' : 'Create Faction'}
            </button>
          </article>

          <article className="planet-game-panel">
            <h3>Join Faction</h3>
            <div className="federation-form-row">
              <label htmlFor="joinInviteCode">Invite Code</label>
              <input id="joinInviteCode" value={joinInviteCode} onChange={(e) => setJoinInviteCode(e.target.value.toUpperCase())} placeholder="AB12CD34" />
            </div>
            <button type="button" disabled={factionBusy || !joinInviteCode} onClick={handleJoinFaction}>
              {factionBusy ? 'Processing...' : 'Join by Invite'}
            </button>
          </article>

          <article className="planet-game-panel">
            <h3>Claim Sector</h3>
            <div className="federation-form-row">
              <label htmlFor="claimSectorCode">Sector Code</label>
              <input id="claimSectorCode" value={claimSectorCode} onChange={(e) => setClaimSectorCode(e.target.value.toUpperCase())} placeholder="KE" maxLength={12} />
            </div>
            <div className="federation-form-row">
              <label htmlFor="claimSectorLabel">Sector Label</label>
              <input id="claimSectorLabel" value={claimSectorLabel} onChange={(e) => setClaimSectorLabel(e.target.value)} placeholder="Kenya Frontier" />
            </div>
            <button type="button" disabled={factionBusy || !claimSectorCode} onClick={handleClaimSector}>
              {factionBusy ? 'Processing...' : 'Claim Sector'}
            </button>
          </article>
        </div>

        <div className="planet-game-multiplayer">
          <article className="planet-game-panel">
            <h3>Commander Leaderboard</h3>
            <div className="planet-game-list">
              {(worldGameFeed.leaderboard || []).slice(0, 8).map((row, idx) => (
                <div key={`${row.commanderName}-${idx}`}>
                  <strong>#{idx + 1} {row.commanderName}</strong>
                  <span>{row.faction || 'PVA Collective'} · {row.outposts} outposts · {row.research} research</span>
                </div>
              ))}
            </div>
          </article>

          <article className="planet-game-panel">
            <h3>Faction Power Ladder</h3>
            <div className="planet-game-list">
              {(worldGameFeed.factions || []).slice(0, 8).map((faction, idx) => (
                <div key={`${faction.tag}-${idx}`}>
                  <strong>#{idx + 1} {faction.name} ({faction.tag})</strong>
                  <span>Members: {faction.memberCount} · Power: {faction.totalPower}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="planet-game-panel">
            <h3>Sector Control</h3>
            <div className="planet-game-list">
              {(worldGameFeed.sectors || []).slice(0, 8).map((sector) => (
                <div key={`${sector.sector}-${sector.label}`}>
                  <strong>{sector.label}</strong>
                  <span>
                    {sector.activeCitizens} active · role: {sector.controlRole}
                    {sector.controllerFactionTag ? ` · faction: ${sector.controllerFactionTag}` : ''}
                    {sector.influence ? ` · influence: ${sector.influence}` : ''}
                  </span>
                </div>
              ))}
            </div>
          </article>

          <article className="planet-game-panel">
            <h3>World Events</h3>
            <div className="planet-game-list">
              {(worldGameFeed.events || []).slice(0, 8).map((event) => (
                <div key={event.id}>
                  <strong>{event.commanderName}: {event.title}</strong>
                  <span>{formatRelativeTime(event.createdAt)} · {event.eventType}</span>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="federation-card federation-card--dynamicSitemap">
        <div className="federation-live-header">
          <h2>Dynamic Site Map</h2>
          <span className="federation-inline-note">{dynamicSiteMap.length} public routes indexed</span>
        </div>
        <p>Live route index generated from the current application route configuration.</p>
        <div className="federation-form-row">
          <label htmlFor="siteMapFilter">Filter routes</label>
          <input
            id="siteMapFilter"
            value={siteMapFilter}
            onChange={(e) => setSiteMapFilter(e.target.value)}
            placeholder="Search by title, path, or description"
          />
        </div>
        <div className="dynamic-sitemap-grid">
          {Object.entries(siteMapByGroup).map(([group, routes]) => (
            <article key={group} className="dynamic-sitemap-group">
              <h3>{group.toUpperCase()}</h3>
              <div className="dynamic-sitemap-links">
                {routes.map((route) => (
                  <Link key={route.key} to={route.to}>
                    <strong>{route.title}</strong>
                    <span>{route.to}</span>
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

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
