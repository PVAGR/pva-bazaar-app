import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { getToken } from './lib/auth.js';
import './base.css';

// Lazy-load page components for code splitting
const AboutPage = lazy(() => import('./pages/AboutPage.jsx'));
const ArchiveLibraryPage = lazy(() => import('./pages/ArchiveLibraryPage.jsx'));
const AdminPage = lazy(() => import('./pages/AdminPage.jsx'));
const AdminOrdersPage = lazy(() => import('./pages/AdminOrdersPage.jsx'));
const MarketplacePage = lazy(() => import('./pages/MarketplacePage.jsx'));
const MarketplaceItemPage = lazy(() => import('./pages/MarketplaceItemPage.jsx'));
const CheckoutSuccessPage = lazy(() => import('./pages/CheckoutSuccessPage.jsx'));
const CheckoutCancelPage = lazy(() => import('./pages/CheckoutCancelPage.jsx'));
const OracleAssessmentPage = lazy(() => import('./pages/OracleAssessmentPage.jsx'));
const ListItemPage = lazy(() => import('./pages/ListItemPage.jsx'));
const StreamsPage = lazy(() => import('./pages/StreamsPage.jsx'));
const DealsPage = lazy(() => import('./pages/DealsPage.jsx'));
const DealJoinPage = lazy(() => import('./pages/DealJoinPage.jsx'));
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const RegisterPage = lazy(() => import('./pages/RegisterPage.jsx'));
const AccountPage = lazy(() => import('./pages/AccountPage.jsx'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage.jsx'));
const VerificationPage = lazy(() => import('./pages/VerificationPage.jsx'));
const ManifestoPage = lazy(() => import('./pages/ManifestoPage.jsx'));
const CartPage = lazy(() => import('./pages/CartPage.jsx'));
const ArtifactDetailPage = lazy(() => import('./pages/ArtifactDetailPage.jsx'));

// Loading fallback component
function LoadingFallback() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '50vh',
      color: 'var(--site-text)',
    }}>
      <div>Loading...</div>
    </div>
  );
}

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
      <Layout>
        <Suspense fallback={<LoadingFallback />}>
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
            <Route path="/artifact/:slug" element={<ArtifactDetailPage />} />
            <Route
              path="/items/new"
              element={
                <ProtectedRoute>
                  <ListItemPage />
                </ProtectedRoute>
              }
            />
            <Route path="/oracle" element={<OracleAssessmentPage />} />
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
            <Route path="/verification" element={<VerificationPage />} />
            <Route path="/manifesto" element={<ManifestoPage />} />
            <Route path="/cart" element={<CartPage />} />
          </Routes>
        </Suspense>
      </Layout>
    </HashRouter>
  );
}
