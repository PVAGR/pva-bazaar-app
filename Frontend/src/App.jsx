import React, { Suspense, lazy, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import RequireAdminAuth from './components/RequireAdminAuth.jsx';
import { getToken } from './lib/auth';
import { Telemetry } from './lib/telemetry';

import ArchiveLibraryPage from './pages/ArchiveLibraryPage.jsx';
import useArchiveTheme from './hooks/useArchiveTheme.js';
import './base.css';
import './styles/vision.css';

const AdminPage = lazy(() => import('./pages/AdminPage.jsx'));
const AdminOrdersPage = lazy(() => import('./pages/AdminOrdersPage.jsx'));
const AdminGovernancePage = lazy(() => import('./pages/AdminGovernancePage.jsx'));
const RegisterPage = lazy(() => import('./pages/RegisterPage.jsx'));
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const AccountPage = lazy(() => import('./pages/AccountPage.jsx'));
const PassportPage = lazy(() => import('./pages/PassportPage.jsx'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage.jsx'));
const ListItemPage = lazy(() => import('./pages/ListItemPage.jsx'));
const MyListingsPage = lazy(() => import('./pages/MyListingsPage.jsx'));
const DealsPage = lazy(() => import('./pages/DealsPage.jsx'));
const DealJoinPage = lazy(() => import('./pages/DealJoinPage.jsx'));
const DealPublicPage = lazy(() => import('./pages/DealPublicPage.jsx'));
const CheckoutSuccessPage = lazy(() => import('./pages/CheckoutSuccessPage.jsx'));
const CartPage = lazy(() => import('./pages/CartPage.jsx'));
const CheckoutCancelPage = lazy(() => import('./pages/CheckoutCancelPage.jsx'));
const UserDashboard = lazy(() => import('./pages/UserDashboard.jsx'));
const GovernanceConferencePage = lazy(() => import('./pages/OtherPages.jsx').then((m) => ({ default: m.GovernanceConferencePage })));
const GovernanceTreasuryPage = lazy(() => import('./pages/OtherPages.jsx').then((m) => ({ default: m.GovernanceTreasuryPage })));
const AboutPage = lazy(() => import('./pages/AboutPage.jsx'));
const ContactPage = lazy(() => import('./pages/ContactPage.jsx'));
const PartnershipsPage = lazy(() => import('./pages/PartnershipsPage.jsx'));
const ProvenancePage = lazy(() => import('./pages/ProvenancePage.jsx'));
const PortfolioPage = lazy(() => import('./pages/PortfolioPage.jsx'));
const AgentPage = lazy(() => import('./pages/AgentPage.jsx'));
const CivilizationLibraryPage = lazy(() => import('./pages/CivilizationLibraryPage.jsx'));
const CivilizationCategoryPage = lazy(() => import('./pages/CivilizationCategoryPage.jsx'));
const InstitutionsPage = lazy(() => import('./pages/InstitutionsPage.jsx'));
const InstitutionPage = lazy(() => import('./pages/InstitutionPage.jsx'));
const CollaborativeLibraryPage = lazy(() => import('./pages/CollaborativeLibraryPage.jsx'));
const CareerQuizPage = lazy(() => import('./pages/CareerQuizPage.jsx'));
const MarketplacePage = lazy(() => import('./pages/MarketplacePage.jsx'));
const MarketplaceItemPage = lazy(() => import('./pages/MarketplaceItemPage.jsx'));
const ShowroomPage = lazy(() => import('./pages/ShowroomPage.jsx'));
const ShowroomItemPage = lazy(() => import('./pages/ShowroomItemPage.jsx'));
const CreatorPortalPage = lazy(() => import('./pages/CreatorPortalPage.jsx'));
const CreatorDashboard = lazy(() => import('./pages/CreatorDashboard.jsx'));
const CitizenDirectoryPage = lazy(() => import('./pages/CitizenDirectoryPage.jsx'));
const PopularConferencePage = lazy(() => import('./pages/PopularConferencePage.jsx'));
const ProposalsPage = lazy(() => import('./pages/ProposalsPage.jsx'));
const ProposalDetailPage = lazy(() => import('./pages/ProposalDetailPage.jsx'));
const SubmitProposalPage = lazy(() => import('./pages/SubmitProposalPage.jsx'));
const TreasuryPage = lazy(() => import('./pages/TreasuryPage.jsx'));
const DeployPage = lazy(() => import('./pages/DeployPage.jsx'));
const DownloadAppPage = lazy(() => import('./pages/DownloadAppPage.jsx'));
const RecoveryPage = lazy(() => import('./pages/RecoveryPage.jsx'));
const HeelKawnPage = lazy(() => import('./pages/HeelKawnPage.jsx'));
const ForumPage = lazy(() => import('./pages/Forum.jsx'));
const StreamsPage = lazy(() => import('./pages/StreamsPage.jsx'));
const GetStartedPage = lazy(() => import('./pages/GetStartedPage.jsx'));
const OpeningHomePage = lazy(() => import('./pages/OpeningHomePage.jsx'));
const HomePage = lazy(() => import('./pages/HomePage.jsx'));
const BooksPage = lazy(() => import('./pages/BooksPage.jsx'));
const BookShelfPage = lazy(() => import('./pages/BookShelfPage.jsx'));
const BookPublishingPage = lazy(() => import('./pages/BookPublishingPage.jsx'));
const BookReaderPage = lazy(() => import('./pages/BookReaderPage.jsx'));
const BookHomePage = lazy(() => import('./pages/BookHomePage.jsx'));
const VerificationPage = lazy(() => import('./pages/VerificationPage.jsx'));
const WritingStudioPage = lazy(() => import('./pages/WritingStudioPage.jsx'));
const BlogPostPage = lazy(() => import('./pages/BlogPostPage.jsx'));
const BrokerHubPage = lazy(() => import('./pages/BrokerHubPage.jsx'));
const CommoditiesPage = lazy(() => import('./pages/CommoditiesPage.jsx'));
const ContactsPage = lazy(() => import('./pages/ContactsPage.jsx'));
const TemplatesPage = lazy(() => import('./pages/TemplatesPage.jsx'));
const ChatPage = lazy(() => import('./pages/ChatPage.jsx'));
const FederationMapPage = lazy(() => import('./pages/FederationMapPage.jsx'));
const ReferralPage = lazy(() => import('./pages/ReferralPage.jsx'));
const PartnersPage = lazy(() => import('./pages/PartnersPage.jsx'));

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
        <Route path="/studio" element={<RequireUserAuth><Layout><WritingStudioPage /></Layout></RequireUserAuth>} />

        <Route path="/login" element={<Layout><LoginPage /></Layout>} />
        <Route path="/register" element={<Layout><RegisterPage /></Layout>} />
        <Route path="/onboarding" element={<RequireUserAuth><Layout><OnboardingPage /></Layout></RequireUserAuth>} />
        <Route path="/account" element={<RequireUserAuth><Layout><AccountPage /></Layout></RequireUserAuth>} />
        <Route path="/identity-center" element={<RequireUserAuth><Layout><PassportPage /></Layout></RequireUserAuth>} />
        <Route path="/passport" element={<RequireUserAuth><Layout><PassportPage /></Layout></RequireUserAuth>} />
        <Route path="/passport/me" element={<RequireUserAuth><Layout><PassportPage /></Layout></RequireUserAuth>} />
        <Route path="/items/new" element={<RequireUserAuth><Layout><ListItemPage /></Layout></RequireUserAuth>} />
        <Route path="/items/manage/:itemId" element={<RequireUserAuth><Layout><ListItemPage /></Layout></RequireUserAuth>} />
        <Route path="/items/mine" element={<RequireUserAuth><Layout><MyListingsPage /></Layout></RequireUserAuth>} />
        <Route path="/deals" element={<RequireUserAuth><Layout><DealsPage /></Layout></RequireUserAuth>} />
        <Route path="/deals/join" element={<RequireUserAuth><Layout><DealJoinPage /></Layout></RequireUserAuth>} />
        <Route path="/deal/:publicId" element={<Layout><DealPublicPage /></Layout>} />
        <Route path="/broker-hub" element={<RequireUserAuth><Layout><BrokerHubPage /></Layout></RequireUserAuth>} />
        <Route path="/commodities" element={<RequireUserAuth><Layout><CommoditiesPage /></Layout></RequireUserAuth>} />
        <Route path="/contacts" element={<RequireUserAuth><Layout><ContactsPage /></Layout></RequireUserAuth>} />
        <Route path="/templates" element={<RequireUserAuth><Layout><TemplatesPage /></Layout></RequireUserAuth>} />
        <Route path="/chat" element={<RequireUserAuth><Layout><ChatPage /></Layout></RequireUserAuth>} />
        <Route path="/conference" element={<Layout><PopularConferencePage /></Layout>} />
        <Route path="/proposals" element={<Layout><ProposalsPage /></Layout>} />
        <Route path="/proposals/submit" element={<RequireUserAuth><Layout><SubmitProposalPage /></Layout></RequireUserAuth>} />
        <Route path="/proposals/my" element={<RequireUserAuth><Layout><ProposalsPage mode="mine" /></Layout></RequireUserAuth>} />
        <Route path="/proposals/:proposalId" element={<Layout><ProposalDetailPage /></Layout>} />
        <Route path="/treasury" element={<Layout><TreasuryPage /></Layout>} />
        <Route path="/deploy" element={<Layout><DeployPage /></Layout>} />

        <Route path="/" element={<Layout><HomePage /></Layout>} />
        <Route path="/welcome" element={<Layout><OpeningHomePage /></Layout>} />
        <Route path="/books" element={<Layout><BooksPage /></Layout>} />
        <Route path="/books/published" element={<Layout><BookShelfPage /></Layout>} />
        <Route path="/books/publish" element={<RequireUserAuth><Layout><BookPublishingPage /></Layout></RequireUserAuth>} />
        <Route path="/books/read/:slug" element={<Layout><BookReaderPage /></Layout>} />
        <Route path="/books/this-or-that" element={<Layout><BookHomePage /></Layout>} />
        <Route path="/get-started" element={<Layout><GetStartedPage /></Layout>} />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="/writings" element={<Layout><ArchiveLibraryPage /></Layout>} />
        <Route path="/library" element={<Layout><ArchiveLibraryPage /></Layout>} />
        <Route path="/archive" element={<Layout><ArchiveLibraryPage /></Layout>} />
        <Route path="/blog/:slug" element={<Layout><BlogPostPage /></Layout>} />
        <Route path="/creator" element={<Layout><CreatorPortalPage /></Layout>} />
        <Route path="/creator/dashboard" element={<RequireUserAuth><Layout><CreatorDashboard /></Layout></RequireUserAuth>} />
        <Route path="/civilization-library" element={<Layout><CivilizationLibraryPage /></Layout>} />
        <Route path="/institutions" element={<Layout><InstitutionsPage /></Layout>} />
        <Route path="/institutions/:institutionSlug" element={<Layout><InstitutionPage /></Layout>} />
        <Route path="/civilization-library/editor" element={<RequireUserAuth><Layout><CollaborativeLibraryPage mode="editor" /></Layout></RequireUserAuth>} />
        <Route path="/civilization-library/moderation" element={<RequireUserAuth><Layout><CollaborativeLibraryPage mode="moderation" /></Layout></RequireUserAuth>} />
        <Route path="/civilization-library/article/:id" element={<Layout><CollaborativeLibraryPage mode="viewer" /></Layout>} />
        <Route path="/career-quiz" element={<Layout><CareerQuizPage /></Layout>} />
        <Route path="/federation-map" element={<Layout><FederationMapPage /></Layout>} />
        <Route path="/about" element={<Layout><AboutPage /></Layout>} />
        <Route path="/contact" element={<Layout><ContactPage /></Layout>} />
        <Route path="/partnerships" element={<Layout><PartnershipsPage /></Layout>} />
        <Route path="/verification" element={<Layout><VerificationPage /></Layout>} />
        <Route path="/referral" element={<Layout><ReferralPage /></Layout>} />
        <Route path="/partners" element={<Layout><PartnersPage /></Layout>} />
        <Route path="/provenance" element={<Layout><ProvenancePage /></Layout>} />
        <Route path="/portfolio" element={<Layout><PortfolioPage /></Layout>} />
        <Route path="/agent" element={<Layout><AgentPage /></Layout>} />
        <Route path="/streams" element={<RequireUserAuth><Layout><StreamsPage /></Layout></RequireUserAuth>} />
        <Route path="/citizens" element={<Layout><CitizenDirectoryPage /></Layout>} />
        <Route path="/forum" element={<Layout><ForumPage /></Layout>} />
        <Route path="/passport/:userId" element={<Layout><PassportPage /></Layout>} />
        <Route path="/governance/conference" element={<Layout><GovernanceConferencePage /></Layout>} />
        <Route path="/governance/treasury" element={<Layout><GovernanceTreasuryPage /></Layout>} />
        <Route path="/marketplace" element={<Layout><MarketplacePage /></Layout>} />
        <Route path="/marketplace/civilization/:categorySlug" element={<Layout><CivilizationCategoryPage /></Layout>} />
        <Route path="/marketplace/:slugOrId" element={<Layout><MarketplaceItemPage /></Layout>} />
        <Route path="/showroom" element={<Layout><ShowroomPage /></Layout>} />
        <Route path="/showroom/:slugOrId" element={<Layout><ShowroomItemPage /></Layout>} />
        <Route path="/download-app" element={<Layout><DownloadAppPage /></Layout>} />
        <Route path="/recovery" element={<Layout><RecoveryPage /></Layout>} />
        <Route path="/heelkawn" element={<Layout><HeelKawnPage /></Layout>} />
        <Route path="/cart" element={<Layout><CartPage /></Layout>} />
        <Route path="/checkout/success" element={<Layout><CheckoutSuccessPage /></Layout>} />
        <Route path="/checkout/cancel" element={<Layout><CheckoutCancelPage /></Layout>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </HashRouter>
  );
}
