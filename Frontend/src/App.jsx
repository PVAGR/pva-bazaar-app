import AdminOrdersPage from './pages/AdminOrdersPage.jsx';
import React from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import RequireAdminAuth from './components/RequireAdminAuth.jsx';
import { getToken } from './lib/auth';

import AboutPage from './pages/AboutPage.jsx';
import ArchiveLibraryPage from './pages/ArchiveLibraryPage.jsx';
import CivilizationLibraryPage from './pages/CivilizationLibraryPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import CareerQuizPage from './pages/CareerQuizPage.jsx';
import MarketplacePage from './pages/MarketplacePage.jsx';
import MarketplaceItemPage from './pages/MarketplaceItemPage.jsx';
import ShowroomPage from './pages/ShowroomPage.jsx';
import ShowroomItemPage from './pages/ShowroomItemPage.jsx';
import CreatorPortalPage from './pages/CreatorPortalPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import AccountPage from './pages/AccountPage.jsx';
import OnboardingPage from './pages/OnboardingPage.jsx';
import ListItemPage from './pages/ListItemPage.jsx';
import MyListingsPage from './pages/MyListingsPage.jsx';
import DealsPage from './pages/DealsPage.jsx';
import DealJoinPage from './pages/DealJoinPage.jsx';
import CheckoutSuccessPage from './pages/CheckoutSuccessPage.jsx';
import CheckoutCancelPage from './pages/CheckoutCancelPage.jsx';
import UserDashboard from './pages/UserDashboard.jsx';
import PopularConferencePage from './pages/PopularConferencePage.jsx';
import DownloadAppPage from './pages/DownloadAppPage.jsx';
import ForumPage from './pages/Forum.jsx';
import { GovernanceConferencePage, GovernanceTreasuryPage } from './pages/OtherPages.jsx';
import useArchiveTheme from './hooks/useArchiveTheme.js';
import './base.css';

function RequireUserAuth({ children }) {
  const location = useLocation();
  const token = getToken();
  if (!token) {
    const next = `${location.pathname || '/account'}${location.search || ''}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }
  return children;
}

export default function App() {
  useArchiveTheme();

  return (
    <HashRouter>
      <Routes>
        {/* Admin entry route must remain reachable so login/bootstrap UI can render */}
        <Route path="/admin" element={<AdminPage />} />
        {/* Protected admin sub-routes */}
        <Route path="/admin/orders" element={<RequireAdminAuth><AdminOrdersPage /></RequireAdminAuth>} />

        {/* User Dashboard - Protected */}
        <Route path="/dashboard" element={<RequireUserAuth><UserDashboard /></RequireUserAuth>} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/onboarding" element={<RequireUserAuth><OnboardingPage /></RequireUserAuth>} />
        <Route path="/account" element={<RequireUserAuth><AccountPage /></RequireUserAuth>} />
        <Route path="/items/new" element={<RequireUserAuth><ListItemPage /></RequireUserAuth>} />
        <Route path="/items/mine" element={<RequireUserAuth><MyListingsPage /></RequireUserAuth>} />
        <Route path="/deals" element={<RequireUserAuth><DealsPage /></RequireUserAuth>} />
        <Route path="/deals/join" element={<RequireUserAuth><DealJoinPage /></RequireUserAuth>} />
        <Route path="/conference" element={<RequireUserAuth><Layout><PopularConferencePage /></Layout></RequireUserAuth>} />

        <Route path="/" element={<Layout><ArchiveLibraryPage /></Layout>} />
        <Route path="/library" element={<Layout><ArchiveLibraryPage /></Layout>} />
        <Route path="/archive" element={<Layout><ArchiveLibraryPage /></Layout>} />
        <Route path="/creator" element={<Layout><CreatorPortalPage /></Layout>} />
        <Route path="/civilization-library" element={<Layout><CivilizationLibraryPage /></Layout>} />
        <Route path="/career-quiz" element={<Layout><CareerQuizPage /></Layout>} />
        <Route path="/about" element={<Layout><AboutPage /></Layout>} />
        <Route path="/forum" element={<Layout><ForumPage /></Layout>} />
        <Route path="/governance/conference" element={<Layout><GovernanceConferencePage /></Layout>} />
        <Route path="/governance/treasury" element={<Layout><GovernanceTreasuryPage /></Layout>} />
        <Route path="/marketplace" element={<Layout><MarketplacePage /></Layout>} />
        <Route path="/marketplace/:slugOrId" element={<Layout><MarketplaceItemPage /></Layout>} />
        <Route path="/showroom" element={<Layout><ShowroomPage /></Layout>} />
        <Route path="/showroom/:slugOrId" element={<Layout><ShowroomItemPage /></Layout>} />
        <Route path="/download-app" element={<Layout><DownloadAppPage /></Layout>} />
        <Route path="/checkout/success" element={<Layout><CheckoutSuccessPage /></Layout>} />
        <Route path="/checkout/cancel" element={<Layout><CheckoutCancelPage /></Layout>} />
        <Route path="*" element={<Navigate to="/library" replace />} />
      </Routes>
    </HashRouter>
  );
}
