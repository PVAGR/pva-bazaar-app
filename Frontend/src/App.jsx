import AdminOrdersPage from './pages/AdminOrdersPage.jsx';
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import RouteErrorBoundary from './components/RouteErrorBoundary.jsx';
import LoadingSpinner from './components/LoadingSpinner.jsx';

import AboutPage from './pages/AboutPage.jsx';
import ArchiveLibraryPage from './pages/ArchiveLibraryPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import MarketplacePage from './pages/MarketplacePage.jsx';
import MarketplaceItemPage from './pages/MarketplaceItemPage.jsx';
import CheckoutSuccessPage from './pages/CheckoutSuccessPage.jsx';
import CheckoutCancelPage from './pages/CheckoutCancelPage.jsx';
import './base.css';

// Note: This simple App.jsx does not use code splitting.
// For lazy loading, see pva-bazaar-app/Frontend/src/App.jsx

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
        </Routes>
      </Layout>
    </HashRouter>
  );
}
