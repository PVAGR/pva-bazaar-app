import React, { useMemo, useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import HomePage from './pages/HomePage.jsx';
import JournalPage from './pages/JournalPage.jsx';
import EntryDetail from './pages/EntryDetail.jsx';
import AboutPage from './pages/AboutPage.jsx';
import SearchPage from './pages/SearchPage.jsx';
import ArchivePage from './pages/ArchivePage.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminNewEntry from './pages/AdminNewEntry.jsx';
import { filterEntries, getEntries } from './lib/entries.js';

export default function App() {
  const [entries, setEntries] = useState(() => getEntries());
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(
    () => filterEntries(entries, searchTerm),
    [entries, searchTerm],
  );

  const handleNewEntry = () => {
    // Reload from storage to include any newly added entry
    setEntries(getEntries());
  };

  return (
    <HashRouter>
      <Layout onSearch={setSearchTerm} searchTerm={searchTerm}>
        <Routes>
          <Route path="/" element={<HomePage entries={entries} />} />
          <Route path="/journal" element={<JournalPage entries={filtered} searchTerm={searchTerm} />} />
          <Route path="/archive" element={<ArchivePage entries={filtered} searchTerm={searchTerm} />} />
          <Route path="/entry/:id" element={<EntryDetail entries={entries} />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/new-journal" element={<AdminNewEntry onCreated={handleNewEntry} />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}
