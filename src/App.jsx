import { Routes, Route } from 'react-router-dom';
import './index.css';
import Hero from './components/Hero';
import Portals from './components/Portals';
import About from './components/About';
import Footer from './components/Footer';
import QuranPage from './pages/quran/QuranPage';
import ChooseTeacherPage from './pages/quran/ChooseTeacherPage';
import TeacherListPage from './pages/quran/TeacherListPage';
import TeacherProfilePage from './pages/quran/TeacherProfilePage';
import ScrollToTop from './components/ScrollToTop';
import DarkModeToggle from './components/DarkModeToggle';

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

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/quran" element={<QuranPage />} />
        <Route path="/quran/teachers" element={<ChooseTeacherPage />} />
        <Route path="/quran/teachers/:gender" element={<TeacherListPage />} />
        <Route path="/quran/teachers/:gender/:id" element={<TeacherProfilePage />} />
      </Routes>
    </>
  );
}