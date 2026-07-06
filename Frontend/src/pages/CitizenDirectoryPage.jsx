import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchCitizenDirectory } from '../lib/api';
import './PassportPage.css';

const ROLE_OPTIONS = ['all', 'citizen', 'committee', 'secretariat', 'admin'];

const roleLabel = (role = '') => {
  const next = String(role || '').toLowerCase();
  if (next === 'committee') return 'Committee Member';
  if (next === 'secretariat') return 'Secretariat';
  if (next === 'admin') return 'Admin';
  return 'Citizen';
};

export default function CitizenDirectoryPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [citizens, setCitizens] = useState([]);
  const [roleFilter, setRoleFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;

    async function loadDirectory() {
      setLoading(true);
      setError('');
      try {
        const response = await fetchCitizenDirectory();
        if (!active) return;
        if (!response?.ok || !Array.isArray(response.items)) {
          setError(response?.message || 'Unable to load citizens directory.');
          setCitizens([]);
          return;
        }
        setCitizens(response.items);
      } catch (err) {
        if (!active) return;
        setError(err?.message || 'Unable to load citizens directory.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDirectory();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return citizens.filter((item) => {
      const roleMatch =
        roleFilter === 'all' || String(item.citizenRole || '').toLowerCase() === roleFilter;
      const searchMatch =
        !query ||
        String(item.name || '')
          .toLowerCase()
          .includes(query) ||
        String(item.societalId || '')
          .toLowerCase()
          .includes(query);
      return roleMatch && searchMatch;
    });
  }, [citizens, roleFilter, search]);

  return (
    <section className="section-card directory-shell">
      <div className="passport-hero">
        <div>
          <div className="pill">Public Civilization Profile Layer</div>
          <h1>Citizen Directory</h1>
          <p>Verified citizens with societal IDs, roles, and public contribution signals.</p>
        </div>
      </div>

      <div className="directory-controls">
        <label>
          Search by name or societal ID
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search citizens"
          />
        </label>
        <label>
          Role filter
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {role === 'all' ? 'All roles' : roleLabel(role)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? <p className="directory-status">Loading verified citizens...</p> : null}
      {error ? <p className="directory-status directory-status--error">{error}</p> : null}

      {!loading && !error ? (
        filtered.length ? (
          <div className="directory-grid">
            {filtered.map((citizen) => (
              <Link key={citizen.id} to={`/passport/${citizen.id}`} className="directory-card">
                <div className="directory-avatar">
                  {citizen.avatarUrl ? (
                    <img
                      src={citizen.avatarUrl}
                      alt={`${citizen.name} avatar`}
                      className="passport-avatar"
                    />
                  ) : (
                    <div className="passport-avatar-placeholder">
                      {String(citizen.name || '?')
                        .slice(0, 1)
                        .toUpperCase()}
                    </div>
                  )}
                </div>
                <h3>{citizen.name || 'Unknown Citizen'}</h3>
                <p className="directory-id">{citizen.societalId || 'Societal ID pending'}</p>
                <p className="passport-role-badge">{roleLabel(citizen.citizenRole)}</p>
                <p>Reputation: {Number(citizen.pvaReputation || 0)}</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="directory-status">No citizens match your current filters.</p>
        )
      ) : null}
    </section>
  );
}
