import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import DarkModeToggle from '../../components/DarkModeToggle';

const links = [
  { label: 'الرئيسية',    href: null,             to: '/quran' },
  { label: 'اختر معلمك', href: null,             to: '/quran/teachers' },
  { label: 'المسابقات',  href: '#competitions',  to: null },
  { label: 'الدورات',    href: '#courses',        to: null },
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
        scrolled ? 'shadow-md backdrop-blur-xl border-b' : 'bg-transparent'
      }`}
      style={{
        backgroundColor: scrolled ? 'var(--t-nav-scrolled)' : 'transparent',
        borderColor: 'var(--t-border)',
      }}
    >
      <div className="max-w-6xl mx-auto px-5 md:px-6 h-20 flex items-center justify-between">
        {/* Brand */}
        <Link
          to="/quran"
          className="text-2xl font-black"
          style={{ color: 'var(--t-primary)' }}
        >
          حبل الله
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {links.map((l, i) =>
            l.to ? (
              <Link
                key={l.label}
                to={l.to}
                className={`font-semibold text-sm transition-colors duration-200 pb-1 hover:opacity-100 opacity-60`}
                style={{ color: 'var(--t-text)' }}
              >
                {l.label}
              </Link>
            ) : (
              <a
                key={l.label}
                href={l.href}
                className={`font-semibold text-sm transition-colors duration-200 pb-1 ${
                  i === 0 ? 'border-b-2' : 'hover:opacity-100 opacity-60'
                }`}
                style={
                  i === 0
                    ? { color: 'var(--t-primary)', borderColor: 'var(--t-secondary)' }
                    : { color: 'var(--t-text)' }
                }
              >
                {l.label}
              </a>
            )
          )}
        </nav>

        {/* Right actions: toggle + mobile menu */}
        <div className="flex items-center gap-2">
          <DarkModeToggle />

          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-2 rounded-xl transition-colors"
            style={{ color: 'var(--t-primary)' }}
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="فتح القائمة"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div
          className="md:hidden border-t px-5 py-4 flex flex-col gap-4 backdrop-blur-xl"
          style={{
            backgroundColor: 'var(--t-nav-mobile)',
            borderColor: 'var(--t-border)',
          }}
        >
          {links.map((l) =>
            l.to ? (
              <Link
                key={l.label}
                to={l.to}
                className="font-semibold text-base py-1"
                style={{ color: 'var(--t-primary)' }}
                onClick={() => setMenuOpen(false)}
              >
                {l.label}
              </Link>
            ) : (
              <a
                key={l.label}
                href={l.href}
                className="font-semibold text-base py-1"
                style={{ color: 'var(--t-primary)' }}
                onClick={() => setMenuOpen(false)}
              >
                {l.label}
              </a>
            )
          )}
        </div>
      )}
    </header>
  );
}
