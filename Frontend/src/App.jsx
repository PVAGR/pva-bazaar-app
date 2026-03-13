import AdminOrdersPage from './pages/AdminOrdersPage.jsx';
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import RouteErrorBoundary from './components/RouteErrorBoundary.jsx';

import AboutPage from './pages/AboutPage.jsx';
import ArchiveLibraryPage from './pages/ArchiveLibraryPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import MarketplacePage from './pages/MarketplacePage.jsx';
import MarketplaceItemPage from './pages/MarketplaceItemPage.jsx';
import CheckoutSuccessPage from './pages/CheckoutSuccessPage.jsx';
import CheckoutCancelPage from './pages/CheckoutCancelPage.jsx';
import VerificationPage from './pages/VerificationPage.jsx';
import ManifestoPage from './pages/ManifestoPage.jsx';
import CartPage from './pages/CartPage.jsx';
import ListItemPage from './pages/ListItemPage.jsx';
import OracleAssessmentPage from './pages/OracleAssessmentPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import AccountPage from './pages/AccountPage.jsx';
import OnboardingPage from './pages/OnboardingPage.jsx';
import ArtifactDetailPage from './pages/ArtifactDetailPage.jsx';
import SearchPage from './pages/SearchPage.jsx';
import DealsPage from './pages/DealsPage.jsx';
import DealJoinPage from './pages/DealJoinPage.jsx';
import StreamsPage from './pages/StreamsPage.jsx';
import EntryDetail from './pages/EntryDetail.jsx';
import SolanaRitualPage from './pages/SolanaRitualPage.jsx';
import './base.css';

export default function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<RouteErrorBoundary><ArchiveLibraryPage /></RouteErrorBoundary>} />
          <Route path="/library" element={<RouteErrorBoundary><ArchiveLibraryPage /></RouteErrorBoundary>} />
          <Route path="/about" element={<RouteErrorBoundary><AboutPage /></RouteErrorBoundary>} />
          <Route path="/admin" element={<RouteErrorBoundary><AdminPage /></RouteErrorBoundary>} />
          <Route path="/admin/orders" element={<RouteErrorBoundary><AdminOrdersPage /></RouteErrorBoundary>} />
          <Route path="/marketplace" element={<RouteErrorBoundary><MarketplacePage /></RouteErrorBoundary>} />
          <Route path="/marketplace/:slugOrId" element={<RouteErrorBoundary><MarketplaceItemPage /></RouteErrorBoundary>} />
          <Route path="/checkout/success" element={<RouteErrorBoundary><CheckoutSuccessPage /></RouteErrorBoundary>} />
          <Route path="/checkout/cancel" element={<RouteErrorBoundary><CheckoutCancelPage /></RouteErrorBoundary>} />
          <Route path="/verification" element={<RouteErrorBoundary><VerificationPage /></RouteErrorBoundary>} />
          <Route path="/manifesto" element={<RouteErrorBoundary><ManifestoPage /></RouteErrorBoundary>} />
          <Route path="/cart" element={<RouteErrorBoundary><CartPage /></RouteErrorBoundary>} />
          <Route path="/items/new" element={<RouteErrorBoundary><ListItemPage /></RouteErrorBoundary>} />
          <Route path="/oracle" element={<RouteErrorBoundary><OracleAssessmentPage /></RouteErrorBoundary>} />
          <Route path="/login" element={<RouteErrorBoundary><LoginPage /></RouteErrorBoundary>} />
          <Route path="/register" element={<RouteErrorBoundary><RegisterPage /></RouteErrorBoundary>} />
          <Route path="/account" element={<RouteErrorBoundary><AccountPage /></RouteErrorBoundary>} />
          <Route path="/onboarding" element={<RouteErrorBoundary><OnboardingPage /></RouteErrorBoundary>} />
          <Route path="/artifacts/:slugOrId" element={<RouteErrorBoundary><ArtifactDetailPage /></RouteErrorBoundary>} />
          <Route path="/search" element={<RouteErrorBoundary><SearchPage /></RouteErrorBoundary>} />
          <Route path="/deals" element={<RouteErrorBoundary><DealsPage /></RouteErrorBoundary>} />
          <Route path="/deals/join" element={<RouteErrorBoundary><DealJoinPage /></RouteErrorBoundary>} />
          <Route path="/streams" element={<RouteErrorBoundary><StreamsPage /></RouteErrorBoundary>} />
          <Route path="/entry/:id" element={<RouteErrorBoundary><EntryDetail /></RouteErrorBoundary>} />
          <Route path="/rituals/solana" element={<RouteErrorBoundary><SolanaRitualPage /></RouteErrorBoundary>} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}
