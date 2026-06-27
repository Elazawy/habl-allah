import { Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import Hero from './components/Hero';
import Portals from './components/Portals';
import About from './components/About';
import Footer from './components/Footer';
import QuranPage from './pages/quran/QuranPage';
import QuranFaqPage from './pages/quran/QuranFaqPage';
import ChooseTeacherPage from './pages/quran/ChooseTeacherPage';
import TeacherListPage from './pages/quran/TeacherListPage';
import TeacherProfilePage from './pages/quran/TeacherProfilePage';
import FaqPage from './pages/FaqPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsPage from './pages/TermsPage';
import ScrollToTop from './components/ScrollToTop';
import FloatingWhatsApp from './components/FloatingWhatsApp';
import DarkModeToggle from './components/DarkModeToggle';
import { AuthProvider } from './context/AuthContext';
import RequireAuth from './components/RequireAuth';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import QuranAdminDashboard from './pages/admin/QuranAdminDashboard';
import TeachersManagementPage from './pages/admin/TeachersManagementPage';
import FaqManagementPage from './pages/admin/FaqManagementPage';
import QuranFaqManagementPage from './pages/admin/QuranFaqManagementPage';
import PagesManagementPage from './pages/admin/PagesManagementPage';
import TeacherReviewsManagementPage from './pages/admin/TeacherReviewsManagementPage';
import QuranReviewsManagementPage from './pages/admin/QuranReviewsManagementPage';
import NewsletterSubscribersPage from './pages/admin/NewsletterSubscribersPage';
import CompetitionsPage from './pages/quran/CompetitionsPage';
import CompetitionDetailsPage from './pages/quran/CompetitionDetailsPage';
import CompetitionsManagementPage from './pages/admin/CompetitionsManagementPage';
import CoursesManagementPage from './pages/admin/CoursesManagementPage';
import CoursesPage from './pages/quran/CoursesPage';

import CourseDetailPage from './pages/quran/CourseDetailPage';




function HomePage() {
  return (
    <div dir="rtl" className="min-h-screen" style={{ backgroundColor: 'var(--t-bg)' }}>
      {/* Floating dark mode toggle */}
      <div className="fixed top-5 left-5 z-50">
        <DarkModeToggle />
      </div>
      <Hero />
      <Portals />
      <About />
      <Footer />
    </div>
  );
}

function ProtectedAdmin({ children }) {
  return (
    <RequireAuth>
      <AdminLayout>
        {children}
      </AdminLayout>
    </RequireAuth>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ScrollToTop />
      <FloatingWhatsApp />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/quran" element={<QuranPage />} />
        <Route path="/quran/faq" element={<QuranFaqPage />} />
        <Route path="/quran/teachers" element={<ChooseTeacherPage />} />
        <Route path="/quran/teachers/:gender" element={<TeacherListPage />} />
        <Route path="/quran/teachers/:gender/:id" element={<TeacherProfilePage />} />
        <Route path="/quran/competitions" element={<CompetitionsPage />} />
        <Route path="/quran/competition/:slug" element={<CompetitionDetailsPage />} />
        <Route path="/quran/courses" element={<CoursesPage />} />
        <Route path="/quran/courses/:slug" element={<CourseDetailPage />} />




        {/* Admin auth */}
        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* Protected admin routes — Main Platform */}
        <Route path="/admin" element={<ProtectedAdmin><AdminDashboard /></ProtectedAdmin>} />
        <Route path="/admin/faq" element={<ProtectedAdmin><FaqManagementPage /></ProtectedAdmin>} />
        <Route path="/admin/pages" element={<ProtectedAdmin><PagesManagementPage /></ProtectedAdmin>} />

        {/* Protected admin routes — Quran Platform */}
        <Route path="/admin/quran" element={<ProtectedAdmin><QuranAdminDashboard /></ProtectedAdmin>} />
        <Route path="/admin/quran/teachers" element={<ProtectedAdmin><TeachersManagementPage /></ProtectedAdmin>} />
        <Route path="/admin/quran/teachers/:id/reviews" element={<ProtectedAdmin><TeacherReviewsManagementPage /></ProtectedAdmin>} />
        <Route path="/admin/quran/reviews" element={<ProtectedAdmin><QuranReviewsManagementPage /></ProtectedAdmin>} />
        <Route path="/admin/quran/newsletter" element={<ProtectedAdmin><NewsletterSubscribersPage /></ProtectedAdmin>} />
        <Route path="/admin/quran/faq" element={<ProtectedAdmin><QuranFaqManagementPage /></ProtectedAdmin>} />
        <Route path="/admin/quran/competitions" element={<ProtectedAdmin><CompetitionsManagementPage /></ProtectedAdmin>} />
        <Route path="/admin/quran/courses" element={<ProtectedAdmin><CoursesManagementPage /></ProtectedAdmin>} />



        {/* Redirect old /admin/teachers → /admin/quran/teachers */}
        <Route path="/admin/teachers" element={<Navigate to="/admin/quran/teachers" replace />} />
      </Routes>
    </AuthProvider>
  );
}
