import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, LogIn, LogOut, Layout } from 'lucide-react';
import DarkModeToggle from '../../components/DarkModeToggle';
import logoGold from '../../assets/logo-gold.png';
import { useAuth } from '../../context/AuthContext';

const links = [
  { label: 'الرئيسية',    to: '/quran' },
  { label: 'اختر معلمك',  to: '/quran/teachers' },
  { label: 'المسابقات',   to: '/quran/competitions' },
  { label: 'الدورات',     to: '/quran/courses' },
];

export default function QuranNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isAdmin, studentProfile, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/quran');
  };

  const getDashboardPath = () => {
    return isAdmin ? '/admin/quran' : '/student/dashboard';
  };

  const getDisplayName = () => {
    if (isAdmin) return 'المدير';
    return studentProfile?.full_name ?? 'طالب';
  };

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
      <div className="max-w-6xl mx-auto px-5 md:px-6 h-16 md:h-20 flex items-center justify-between">
        {/* Brand */}
        <Link to="/quran" className="flex items-center gap-2.5">
          <img src={logoGold} alt="شعار حبل الله" className="w-10 h-10 object-contain" />
          <span className="text-xl font-black" style={{ color: 'var(--t-primary)' }}>
            حبل الله
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <Link
              key={l.label}
              to={l.to}
              className="font-semibold text-sm transition-colors duration-200 pb-1 hover:opacity-100 opacity-60"
              style={{ color: 'var(--t-text)' }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Right actions: toggle + auth status + mobile menu */}
        <div className="flex items-center gap-3">
          <DarkModeToggle />

          {/* Desktop Auth Section */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  to={getDashboardPath()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600/10 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-600/20 transition-all"
                >
                  <Layout className="w-3.5 h-3.5" />
                  <span>لوحة التحكم ({getDisplayName()})</span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-500/10 transition-all cursor-pointer"
                  title="تسجيل الخروج"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>خروج</span>
                </button>
              </div>
            ) : (
              <Link
                to="/student/login"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm shadow-emerald-600/10"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>دخول الطلاب</span>
              </Link>
            )}
          </div>

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
          {links.map((l) => (
            <Link
              key={l.label}
              to={l.to}
              className="font-semibold text-base py-1"
              style={{ color: 'var(--t-primary)' }}
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </Link>
          ))}

          {/* Mobile Auth Links */}
          <div className="border-t pt-4 flex flex-col gap-3" style={{ borderColor: 'var(--t-border)' }}>
            {user ? (
              <>
                <Link
                  to={getDashboardPath()}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white"
                  onClick={() => setMenuOpen(false)}
                >
                  <Layout className="w-4 h-4" />
                  <span>لوحة التحكم ({getDisplayName()})</span>
                </Link>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleSignOut();
                  }}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-red-600 hover:bg-red-500/10 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>تسجيل الخروج</span>
                </button>
              </>
            ) : (
              <Link
                to="/student/login"
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white"
                onClick={() => setMenuOpen(false)}
              >
                <LogIn className="w-4 h-4" />
                <span>دخول الطلاب</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
