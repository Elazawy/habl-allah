import { Routes, Route } from 'react-router-dom';
import './index.css';
import Hero from './components/Hero';
import Portals from './components/Portals';
import About from './components/About';
import Footer from './components/Footer';
import QuranPage from './pages/quran/QuranPage';

function HomePage() {
  return (
    <div dir="rtl" className="min-h-screen bg-white">
      <Hero />
      <Portals />
      <About />
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/quran" element={<QuranPage />} />
    </Routes>
  );
}
