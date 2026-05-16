import './index.css';
import Hero from './components/Hero';
import Portals from './components/Portals';
import About from './components/About';
import Footer from './components/Footer';

export default function App() {
  return (
    <div dir="rtl" className="min-h-screen bg-white">
      <Hero />
      <Portals />
      <About />
      <Footer />
    </div>
  );
}
