import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import AboutPage from './pages/AboutPage.jsx';
import ArchiveLibraryPage from './pages/ArchiveLibraryPage.jsx';
import './base.css';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<ArchiveLibraryPage />} />
        <Route path="/library" element={<ArchiveLibraryPage />} />
        <Route path="/about" element={<AboutPage />} />
      </Routes>
    </HashRouter>
  );
}
