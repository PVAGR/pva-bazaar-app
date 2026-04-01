import AdminOrdersPage from './pages/AdminOrdersPage.jsx';
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';

import AboutPage from './pages/AboutPage.jsx';
import ArchiveLibraryPage from './pages/ArchiveLibraryPage.jsx';
import CivilizationLibraryPage from './pages/CivilizationLibraryPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import CareerQuizPage from './pages/CareerQuizPage.jsx';
import MarketplacePage from './pages/MarketplacePage.jsx';
import MarketplaceItemPage from './pages/MarketplaceItemPage.jsx';
import ShowroomPage from './pages/ShowroomPage.jsx';
import ShowroomItemPage from './pages/ShowroomItemPage.jsx';
import CheckoutSuccessPage from './pages/CheckoutSuccessPage.jsx';
import CheckoutCancelPage from './pages/CheckoutCancelPage.jsx';
import './base.css';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<ArchiveLibraryPage />} />
        <Route path="/library" element={<ArchiveLibraryPage />} />
        <Route path="/civilization-library" element={<CivilizationLibraryPage />} />
        <Route path="/career-quiz" element={<CareerQuizPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/orders" element={<AdminOrdersPage />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/marketplace/:slugOrId" element={<MarketplaceItemPage />} />
        <Route path="/showroom" element={<ShowroomPage />} />
        <Route path="/showroom/:slugOrId" element={<ShowroomItemPage />} />
        <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
        <Route path="/checkout/cancel" element={<CheckoutCancelPage />} />
      </Routes>
    </HashRouter>
  );
}
