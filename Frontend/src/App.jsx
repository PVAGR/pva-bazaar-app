import AdminOrdersPage from './pages/AdminOrdersPage.jsx';
import React from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout.jsx';

import AboutPage from './pages/AboutPage.jsx';
import ArchiveLibraryPage from './pages/ArchiveLibraryPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import MarketplacePage from './pages/MarketplacePage.jsx';
import MarketplaceItemPage from './pages/MarketplaceItemPage.jsx';
import CheckoutSuccessPage from './pages/CheckoutSuccessPage.jsx';
import CheckoutCancelPage from './pages/CheckoutCancelPage.jsx';
import OracleAssessmentPage from './pages/OracleAssessmentPage.jsx';
import ListItemPage from './pages/ListItemPage.jsx';
import StreamsPage from './pages/StreamsPage.jsx';
import DealsPage from './pages/DealsPage.jsx';
import DealJoinPage from './pages/DealJoinPage.jsx';
import BrokerHubPage from './pages/BrokerHubPage.jsx';
import CommoditiesPage from './pages/CommoditiesPage.jsx';
import ContactsPage from './pages/ContactsPage.jsx';
import TemplatesPage from './pages/TemplatesPage.jsx';
import ChatPage from './pages/ChatPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import AccountPage from './pages/AccountPage.jsx';
import OnboardingPage from './pages/OnboardingPage.jsx';
import { getToken } from './lib/auth.js';
import './base.css';

function ProtectedRoute({ children }) {
  const location = useLocation();
  const token = getToken();
  if (!token) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return children;
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<ArchiveLibraryPage />} />
        <Route path="/library" element={<ArchiveLibraryPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/orders" element={<AdminOrdersPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/marketplace/:slugOrId" element={<MarketplaceItemPage />} />
        <Route
          path="/items/new"
          element={
            <ProtectedRoute>
              <ListItemPage />
            </ProtectedRoute>
          }
        />
        <Route path="/oracle" element={<OracleAssessmentPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route
          path="/streams"
          element={
            <ProtectedRoute>
              <StreamsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/deals"
          element={
            <ProtectedRoute>
              <DealsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/deals/join" element={<DealJoinPage />} />
        <Route
          path="/broker"
          element={
            <ProtectedRoute>
              <BrokerHubPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/commodities"
          element={
            <ProtectedRoute>
              <CommoditiesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contacts"
          element={
            <ProtectedRoute>
              <ContactsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/templates"
          element={
            <ProtectedRoute>
              <TemplatesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <AccountPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          }
        />
        <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
        <Route path="/checkout/cancel" element={<CheckoutCancelPage />} />
      </Routes>
    </HashRouter>
  );
}
