import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Menu, X, LogIn, LogOut, Layout } from 'lucide-react';
import DarkModeToggle from '../../components/DarkModeToggle';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import logoGold from '../../assets/logo-gold.png';
import { useAuth } from '../../context/AuthContext';
import {
  DirectionalIcon,
  LocalizedLink,
  useLocalizedNavigate,
} from '../../i18n';

const getDashboardPath = (isAdmin) => {
  return isAdmin ? '/admin/quran' : '/quran/student/dashboard';
};

export default function QuranNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isAdmin, studentProfile, signOut } = useAuth();
  const navigate = useLocalizedNavigate();
  const { t } = useTranslation('common');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/quran');
  };

  const getDisplayName = () => {
    if (isAdmin) return t('nav.admin');
    return studentProfile?.full_name ?? t('nav.student');
  };

  const isStudentLoggedIn = user && !isAdmin;
  const brandPath = isStudentLoggedIn ? '/quran/student/dashboard' : '/quran';

  const navLinks = isStudentLoggedIn
    ? [
        { label: t('nav.studentHome'), to: '/quran/student/dashboard' },
        { label: t('nav.lessons'), to: '/quran/student/lessons' },
        { label: t('nav.competitions'), to: '/quran/competitions' },
        { label: t('nav.courses'), to: '/quran/courses' },
      ]
    : [
        { label: t('nav.home'), to: '/quran' },
        { label: t('nav.chooseTeacher'), to: '/quran/teachers' },
        { label: t('nav.competitions'), to: '/quran/competitions' },
        { label: t('nav.courses'), to: '/quran/courses' },
      ];

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
        <LocalizedLink to={brandPath} className="flex items-center gap-2.5">
          <img src={logoGold} alt={t('brand.logoAlt')} className="w-10 h-10 object-contain" />
          <span className="text-xl font-black" style={{ color: 'var(--t-primary)' }}>
            {t('brand.shortName')}
          </span>
        </LocalizedLink>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((l) => (
            <LocalizedLink
              key={l.to}
              to={l.to}
              className="font-semibold text-sm transition-colors duration-200 pb-1 hover:opacity-100 opacity-60"
              style={{ color: 'var(--t-text)' }}
            >
              {l.label}
            </LocalizedLink>
          ))}
        </nav>

        {/* End actions: language switcher + dark mode toggle + auth status + mobile menu */}
        <div className="flex items-center gap-3">
          <div className="hidden md:block">
            <LanguageSwitcher />
          </div>
          <DarkModeToggle />

          {/* Desktop Auth Section */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                {!isStudentLoggedIn && (
                  <LocalizedLink
                    to={getDashboardPath(isAdmin)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600/10 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-600/20 transition-all"
                  >
                    <Layout className="w-3.5 h-3.5" />
                    <span>{t('nav.dashboardWithUser', { name: getDisplayName() })}</span>
                  </LocalizedLink>
                )}
                {isStudentLoggedIn && (
                  <span className="text-xs font-semibold px-2" style={{ color: 'var(--t-text)' }}>
                    {t('nav.welcomeUser', { name: getDisplayName() })}
                  </span>
                )}
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-500/10 transition-all cursor-pointer"
                  title={t('nav.signOut')}
                >
                  <DirectionalIcon icon={LogOut} className="w-3.5 h-3.5" />
                  <span>{t('nav.logoutShort')}</span>
                </button>
              </div>
            ) : (
              <LocalizedLink
                to="/quran/student/login"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm shadow-emerald-600/10"
              >
                <DirectionalIcon icon={LogIn} className="w-3.5 h-3.5" />
                <span>{t('nav.studentLogin')}</span>
              </LocalizedLink>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-2 rounded-xl transition-colors"
            style={{ color: 'var(--t-primary)' }}
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
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
          {navLinks.map((l) => (
            <LocalizedLink
              key={l.to}
              to={l.to}
              className="font-semibold text-base py-1"
              style={{ color: 'var(--t-primary)' }}
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </LocalizedLink>
          ))}

          {/* Mobile Auth Links */}
          <div className="border-t pt-4 flex flex-col gap-3" style={{ borderColor: 'var(--t-border)' }}>
            {user ? (
              <>
                {!isStudentLoggedIn && (
                  <LocalizedLink
                    to={getDashboardPath(isAdmin)}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Layout className="w-4 h-4" />
                    <span>{t('nav.dashboardWithUser', { name: getDisplayName() })}</span>
                  </LocalizedLink>
                )}
                {isStudentLoggedIn && (
                  <div className="text-center text-sm font-bold py-1.5" style={{ color: 'var(--t-text)' }}>
                    {t('nav.welcomeUser', { name: getDisplayName() })}
                  </div>
                )}
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleSignOut();
                  }}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-red-600 hover:bg-red-500/10 cursor-pointer"
                >
                  <DirectionalIcon icon={LogOut} className="w-4 h-4" />
                  <span>{t('nav.signOut')}</span>
                </button>
              </>
            ) : (
              <LocalizedLink
                to="/quran/student/login"
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white"
                onClick={() => setMenuOpen(false)}
              >
                <DirectionalIcon icon={LogIn} className="w-4 h-4" />
                <span>{t('nav.studentLogin')}</span>
              </LocalizedLink>
            )}

            <div className="flex justify-center pt-1">
              <LanguageSwitcher variant="compact" onSelect={() => setMenuOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
