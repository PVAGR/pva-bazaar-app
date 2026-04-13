import AdminOrdersPage from './pages/AdminOrdersPage.jsx';
import React, { Suspense, lazy, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import RequireAdminAuth from './components/RequireAdminAuth.jsx';
import { getToken } from './lib/auth';
import { Telemetry } from './lib/telemetry';

import ArchiveLibraryPage from './pages/ArchiveLibraryPage.jsx';
import HomePage from './pages/HomePage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import AccountPage from './pages/AccountPage.jsx';
import PassportPage from './pages/PassportPage.jsx';
import OnboardingPage from './pages/OnboardingPage.jsx';
import ListItemPage from './pages/ListItemPage.jsx';
import MyListingsPage from './pages/MyListingsPage.jsx';
import DealsPage from './pages/DealsPage.jsx';
import DealJoinPage from './pages/DealJoinPage.jsx';
import CheckoutSuccessPage from './pages/CheckoutSuccessPage.jsx';
import CheckoutCancelPage from './pages/CheckoutCancelPage.jsx';
import UserDashboard from './pages/UserDashboard.jsx';
import AdminGovernancePage from './pages/AdminGovernancePage.jsx';
import { GovernanceConferencePage, GovernanceTreasuryPage } from './pages/OtherPages.jsx';
import useArchiveTheme from './hooks/useArchiveTheme.js';
import './pages/HomePage.css';
import './base.css';

const AboutPage = lazy(() => import('./pages/AboutPage.jsx'));
const AgentPage = lazy(() => import('./pages/AgentPage.jsx'));
const CivilizationLibraryPage = lazy(() => import('./pages/CivilizationLibraryPage.jsx'));
const CareerQuizPage = lazy(() => import('./pages/CareerQuizPage.jsx'));
const MarketplacePage = lazy(() => import('./pages/MarketplacePage.jsx'));
const MarketplaceItemPage = lazy(() => import('./pages/MarketplaceItemPage.jsx'));
const ShowroomPage = lazy(() => import('./pages/ShowroomPage.jsx'));
const ShowroomItemPage = lazy(() => import('./pages/ShowroomItemPage.jsx'));
const CreatorPortalPage = lazy(() => import('./pages/CreatorPortalPage.jsx'));
const CitizenDirectoryPage = lazy(() => import('./pages/CitizenDirectoryPage.jsx'));
const PopularConferencePage = lazy(() => import('./pages/PopularConferencePage.jsx'));
const ProposalsPage = lazy(() => import('./pages/ProposalsPage.jsx'));
const ProposalDetailPage = lazy(() => import('./pages/ProposalDetailPage.jsx'));
const SubmitProposalPage = lazy(() => import('./pages/SubmitProposalPage.jsx'));
const TreasuryPage = lazy(() => import('./pages/TreasuryPage.jsx'));
const DeployPage = lazy(() => import('./pages/DeployPage.jsx'));
const DownloadAppPage = lazy(() => import('./pages/DownloadAppPage.jsx'));
const ForumPage = lazy(() => import('./pages/Forum.jsx'));

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
      <Suspense fallback={<div className="section-card">Loading federation module...</div>}>
      <Routes>
        {/* Admin entry route must remain reachable so login/bootstrap UI can render */}
        <Route path="/admin" element={<Layout><AdminPage /></Layout>} />
        {/* Protected admin sub-routes */}
        <Route path="/admin/orders" element={<RequireAdminAuth><Layout><AdminOrdersPage /></Layout></RequireAdminAuth>} />
        <Route path="/admin/governance" element={<RequireAdminAuth><Layout><AdminGovernancePage /></Layout></RequireAdminAuth>} />

        {/* User Dashboard - Protected */}
        <Route path="/dashboard" element={<RequireUserAuth><Layout><UserDashboard /></Layout></RequireUserAuth>} />

        <Route path="/login" element={<Layout><LoginPage /></Layout>} />
        <Route path="/register" element={<Layout><RegisterPage /></Layout>} />
        <Route path="/onboarding" element={<RequireUserAuth><Layout><OnboardingPage /></Layout></RequireUserAuth>} />
        <Route path="/account" element={<RequireUserAuth><Layout><AccountPage /></Layout></RequireUserAuth>} />
        <Route path="/identity-center" element={<RequireUserAuth><Layout><PassportPage /></Layout></RequireUserAuth>} />
        <Route path="/passport" element={<RequireUserAuth><Layout><PassportPage /></Layout></RequireUserAuth>} />
        <Route path="/passport/me" element={<RequireUserAuth><Layout><PassportPage /></Layout></RequireUserAuth>} />
        <Route path="/items/new" element={<RequireUserAuth><Layout><ListItemPage /></Layout></RequireUserAuth>} />
        <Route path="/items/mine" element={<RequireUserAuth><Layout><MyListingsPage /></Layout></RequireUserAuth>} />
        <Route path="/deals" element={<RequireUserAuth><Layout><DealsPage /></Layout></RequireUserAuth>} />
        <Route path="/deals/join" element={<RequireUserAuth><Layout><DealJoinPage /></Layout></RequireUserAuth>} />
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
      </Suspense>
    </HashRouter>
  );
}
