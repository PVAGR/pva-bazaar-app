import AdminOrdersPage from './pages/AdminOrdersPage.jsx';
import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import RequireAdminAuth from './components/RequireAdminAuth.jsx';
import { getToken } from './lib/auth';
import { Telemetry } from './lib/telemetry';

import AboutPage from './pages/AboutPage.jsx';
import AgentPage from './pages/AgentPage.jsx';
import ArchiveLibraryPage from './pages/ArchiveLibraryPage.jsx';
import HomePage from './pages/HomePage.jsx';
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
import PassportPage from './pages/PassportPage.jsx';
import CitizenDirectoryPage from './pages/CitizenDirectoryPage.jsx';
import OnboardingPage from './pages/OnboardingPage.jsx';
import ListItemPage from './pages/ListItemPage.jsx';
import MyListingsPage from './pages/MyListingsPage.jsx';
import DealsPage from './pages/DealsPage.jsx';
import DealJoinPage from './pages/DealJoinPage.jsx';
import CheckoutSuccessPage from './pages/CheckoutSuccessPage.jsx';
import CheckoutCancelPage from './pages/CheckoutCancelPage.jsx';
import UserDashboard from './pages/UserDashboard.jsx';
import PopularConferencePage from './pages/PopularConferencePage.jsx';
import TreasuryPage from './pages/TreasuryPage.jsx';
import DeployPage from './pages/DeployPage.jsx';
import AdminGovernancePage from './pages/AdminGovernancePage.jsx';
import DownloadAppPage from './pages/DownloadAppPage.jsx';
import ForumPage from './pages/Forum.jsx';
import ProposalsPage from './pages/ProposalsPage.jsx';
import ProposalDetailPage from './pages/ProposalDetailPage.jsx';
import SubmitProposalPage from './pages/SubmitProposalPage.jsx';
import { GovernanceConferencePage, GovernanceTreasuryPage } from './pages/OtherPages.jsx';
import useArchiveTheme from './hooks/useArchiveTheme.js';
import './pages/HomePage.css';
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

  useEffect(() => {
    Telemetry.trackPageView(globalThis.location?.hash || '#/');
  }, []);

  return (
    <HashRouter>
      <Routes>
        {/* Admin entry route must remain reachable so login/bootstrap UI can render */}
        <Route path="/admin" element={<AdminPage />} />
        {/* Protected admin sub-routes */}
        <Route path="/admin/orders" element={<RequireAdminAuth><AdminOrdersPage /></RequireAdminAuth>} />
        <Route path="/admin/governance" element={<RequireAdminAuth><AdminGovernancePage /></RequireAdminAuth>} />

        {/* User Dashboard - Protected */}
        <Route path="/dashboard" element={<RequireUserAuth><UserDashboard /></RequireUserAuth>} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/onboarding" element={<RequireUserAuth><OnboardingPage /></RequireUserAuth>} />
        <Route path="/account" element={<RequireUserAuth><AccountPage /></RequireUserAuth>} />
        <Route path="/identity-center" element={<RequireUserAuth><Layout><PassportPage /></Layout></RequireUserAuth>} />
        <Route path="/passport" element={<RequireUserAuth><Layout><PassportPage /></Layout></RequireUserAuth>} />
        <Route path="/passport/me" element={<RequireUserAuth><Layout><PassportPage /></Layout></RequireUserAuth>} />
        <Route path="/items/new" element={<RequireUserAuth><ListItemPage /></RequireUserAuth>} />
        <Route path="/items/mine" element={<RequireUserAuth><MyListingsPage /></RequireUserAuth>} />
        <Route path="/deals" element={<RequireUserAuth><DealsPage /></RequireUserAuth>} />
        <Route path="/deals/join" element={<RequireUserAuth><DealJoinPage /></RequireUserAuth>} />
        <Route path="/conference" element={<Layout><PopularConferencePage /></Layout>} />
        <Route path="/proposals" element={<Layout><ProposalsPage /></Layout>} />
        <Route path="/proposals/submit" element={<RequireUserAuth><Layout><SubmitProposalPage /></Layout></RequireUserAuth>} />
        <Route path="/proposals/my" element={<RequireUserAuth><Layout><ProposalsPage mode="mine" /></Layout></RequireUserAuth>} />
        <Route path="/proposals/:proposalId" element={<Layout><ProposalDetailPage /></Layout>} />
        <Route path="/treasury" element={<Layout><TreasuryPage /></Layout>} />
        <Route path="/deploy" element={<Layout><DeployPage /></Layout>} />

        <Route path="/" element={<Layout><HomePage /></Layout>} />
        <Route path="/home" element={<Layout><HomePage /></Layout>} />
        <Route path="/library" element={<Layout><ArchiveLibraryPage /></Layout>} />
        <Route path="/archive" element={<Layout><ArchiveLibraryPage /></Layout>} />
        <Route path="/creator" element={<Layout><CreatorPortalPage /></Layout>} />
        <Route path="/civilization-library" element={<Layout><CivilizationLibraryPage /></Layout>} />
        <Route path="/career-quiz" element={<Layout><CareerQuizPage /></Layout>} />
        <Route path="/about" element={<Layout><AboutPage /></Layout>} />
        <Route path="/agent" element={<Layout><AgentPage /></Layout>} />
        <Route path="/citizens" element={<Layout><CitizenDirectoryPage /></Layout>} />
        <Route path="/forum" element={<Layout><ForumPage /></Layout>} />
        <Route path="/passport/:userId" element={<Layout><PassportPage /></Layout>} />
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
