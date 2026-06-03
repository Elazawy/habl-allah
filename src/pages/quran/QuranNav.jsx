import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const links = [
  { label: 'الرئيسية', href: '#' },
  { label: 'اختر معلمك', href: '#portals' },
  { label: 'المسابقات', href: '#competitions' },
  { label: 'الدورات', href: '#courses' },
];

export default function QuranNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'shadow-md backdrop-blur-xl bg-white/80 border-b'
          : 'bg-transparent'
      }`}
      style={{ borderColor: '#c0c9c3' }}
    >
      <div className="max-w-6xl mx-auto px-5 md:px-6 h-20 flex items-center justify-between">
        {/* Brand */}
        <Link
          to="/quran"
          className="text-2xl font-black"
          style={{ color: '#1B4D3E' }}
        >
          حبل الله
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {links.map((l, i) => (
            <a
              key={l.label}
              href={l.href}
              className={`font-semibold text-sm transition-colors duration-200 pb-1 ${
                i === 0
                  ? 'border-b-2'
                  : 'hover:opacity-100 opacity-60'
              }`}
              style={
                i === 0
                  ? { color: '#1B4D3E', borderColor: '#CFA767' }
                  : { color: '#191c1b' }
              }
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden p-2 rounded-xl transition-colors"
          style={{ color: '#1B4D3E' }}
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="فتح القائمة"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div
          className="md:hidden border-t px-5 py-4 flex flex-col gap-4 bg-white/95 backdrop-blur-xl"
          style={{ borderColor: '#c0c9c3' }}
        >
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="font-semibold text-base py-1"
              style={{ color: '#1B4D3E' }}
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}
