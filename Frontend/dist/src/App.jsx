import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import JournalPage from './pages/JournalPage.jsx';
import EntryDetail from './pages/EntryDetail.jsx';
import AboutPage from './pages/AboutPage.jsx';
import SearchPage from './pages/SearchPage.jsx';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/journal" element={<JournalPage />} />
        <Route path="/entry/:id" element={<EntryDetail />} />
        <Route path="/archive" element={<JournalPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/search" element={<SearchPage />} />
      </Routes>
    </HashRouter>
  );
}
