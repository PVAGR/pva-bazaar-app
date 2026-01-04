import React, { useMemo, useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import HomePage from './pages/HomePage.jsx';
import JournalPage from './pages/JournalPage.jsx';
import EntryDetail from './pages/EntryDetail.jsx';
import AboutPage from './pages/AboutPage.jsx';
import SearchPage from './pages/SearchPage.jsx';
import ArchivePage from './pages/ArchivePage.jsx';
import ArchiveLibraryPage from './pages/ArchiveLibraryPage.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminNewEntry from './pages/AdminNewEntry.jsx';
import { filterEntries, getEntries } from './lib/entries.js';
import { fetchArchiveEntries } from './lib/archiveApi.js';

const CACHE_KEY = 'journal:cachedEntries';

export default function App() {
  const [entries, setEntries] = useState(() => getEntries());
  const [searchTerm, setSearchTerm] = useState('');
  const [isOffline, setIsOffline] = useState(false);
  const [loading, setLoading] = useState(true);

  const filtered = useMemo(
    () => filterEntries(entries, searchTerm),
    [entries, searchTerm],
  );

  // Load from backend on mount (API-first; cache fallback)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const backendEntries = await fetchArchiveEntries();
        if (!mounted) return;
        setEntries(backendEntries);
        setIsOffline(false);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(backendEntries));
        } catch (_) {}
      } catch (err) {
        console.warn('[App] Failed to load from backend; using cached/local entries', err);
        if (!mounted) return;
        try {
          const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
          setEntries(Array.isArray(cached) && cached.length ? cached : getEntries());
        } catch (_) {
          setEntries(getEntries());
        }
        setIsOffline(true);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const refreshEntries = async () => {
    try {
      const backendEntries = await fetchArchiveEntries();
      setEntries(backendEntries);
      setIsOffline(false);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(backendEntries));
      } catch (_) {}
    } catch (err) {
      console.warn('[App] Refresh failed', err);
      setIsOffline(true);
    }
  };

  return (
    <HashRouter>
      <Layout onSearch={setSearchTerm} searchTerm={searchTerm}>
        {isOffline && (
          <div
            style={{
              background: '#856404',
              color: '#fff',
              padding: '0.75rem',
              textAlign: 'center',
              fontSize: '0.875rem',
            }}
          >
            ⚠️ Offline mode — showing cached data
          </div>
        )}

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Loading entries...</div>
        ) : (
          <Routes>
            <Route path="/" element={<HomePage entries={entries} />} />
            <Route path="/journal" element={<JournalPage entries={filtered} searchTerm={searchTerm} />} />
            <Route path="/archive" element={<ArchivePage entries={filtered} searchTerm={searchTerm} />} />
            <Route path="/library" element={<ArchiveLibraryPage />} />
            <Route path="/entry/:id" element={<EntryDetail entries={entries} />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/new-journal" element={<AdminNewEntry onCreated={refreshEntries} />} />
          </Routes>
        )}
      </Layout>
    </HashRouter>
  );
}
