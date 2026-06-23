import { useState, useEffect } from 'react';
import { useNavigate, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  BookOpen, Users, LogOut, LayoutDashboard,
  HelpCircle, FileText, Menu, X, ArrowLeftRight, Image, Phone,
} from 'lucide-react';
import logoGold from '../../assets/logo-gold.png';

/** Determine which platform we're on based on current path */
function detectPlatform(pathname) {
  return pathname.startsWith('/admin/quran') ? 'quran' : 'general';
}

/** Navigation links per platform */
const NAV_LINKS = {
  general: [
    { to: '/admin', end: true, icon: LayoutDashboard, label: 'الرئيسية', id: 'admin-nav-dashboard' },
    { to: '/admin/faq', icon: HelpCircle, label: 'الأسئلة الشائعة', id: 'admin-nav-faq' },
    { to: '/admin/pages', icon: FileText, label: 'الصفحات', id: 'admin-nav-pages' },
    { to: '/', icon: BookOpen, label: 'عرض الموقع', id: 'admin-nav-site', external: true },
  ],
  quran: [
    { to: '/admin/quran', end: true, icon: LayoutDashboard, label: 'الرئيسية', id: 'admin-nav-quran-dashboard' },
    { to: '/admin/quran/teachers', icon: Users, label: 'المعلمون', id: 'admin-nav-quran-teachers' },
    { to: '/admin/quran/reviews', icon: Image, label: 'مراجعات القرآن', id: 'admin-nav-quran-reviews' },
    { to: '/admin/quran/newsletter', icon: Phone, label: 'الأرقام المسجلة', id: 'admin-nav-quran-newsletter' },
    { to: '/admin/quran/faq', icon: HelpCircle, label: 'الأسئلة الشائعة', id: 'admin-nav-quran-faq' },
    { to: '/quran', icon: BookOpen, label: 'عرض الموقع', id: 'admin-nav-quran-site', external: true },
  ],
};

const PLATFORM_LABELS = {
  general: 'المنصة الرئيسية',
  quran: 'منصة القرآن',
};

export default function AdminLayout({ children }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const platform = detectPlatform(location.pathname);
  const links = NAV_LINKS[platform];

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const switchPlatform = () => {
    if (platform === 'general') {
      navigate('/admin/quran');
    } else {
      navigate('/admin');
    }
  };

  const otherPlatform = platform === 'general' ? 'quran' : 'general';

  const sidebarContent = (
    <>
      {/* Brand */}
      <div className="admin-sidebar-brand">
        <img src={logoGold} alt="شعار حبل الله" className="admin-sidebar-logo-img" />
        <span className="admin-sidebar-name">حبل الله</span>
      </div>

      {/* Platform Switcher */}
      <button
        className="admin-platform-switch"
        onClick={switchPlatform}
        id="admin-platform-switch-btn"
        title={`التبديل إلى ${PLATFORM_LABELS[otherPlatform]}`}
      >
        <span className="admin-platform-switch-current">
          {PLATFORM_LABELS[platform]}
        </span>
        <ArrowLeftRight size={16} className="admin-platform-switch-icon" />
        <span className="admin-platform-switch-target">
          {PLATFORM_LABELS[otherPlatform]}
        </span>
      </button>

      {/* Navigation */}
      <nav className="admin-sidebar-nav">
        {links.map((link) =>
          link.external ? (
            <a
              key={link.id}
              href={link.to}
              target="_blank"
              rel="noopener noreferrer"
              id={link.id}
              className="admin-nav-link"
            >
              <link.icon size={18} />
              <span>{link.label}</span>
            </a>
          ) : (
            <NavLink
              key={link.id}
              to={link.to}
              end={link.end}
              id={link.id}
              className={({ isActive }) =>
                `admin-nav-link ${isActive ? 'admin-nav-link--active' : ''}`
              }
            >
              <link.icon size={18} />
              <span>{link.label}</span>
            </NavLink>
          )
        )}
      </nav>

      {/* Footer */}
      <div className="admin-sidebar-footer">
        <div className="admin-user-info">
          <div className="admin-user-avatar">
            {user?.email?.[0]?.toUpperCase() ?? 'A'}
          </div>
          <span className="admin-user-email">{user?.email}</span>
        </div>
        <button
          id="admin-signout-btn"
          className="admin-signout-btn"
          onClick={handleSignOut}
          title="تسجيل الخروج"
        >
          <LogOut size={18} />
        </button>
      </div>
    </>
  );

  return (
    <div className="admin-layout" dir="rtl">
      {/* Mobile hamburger button */}
      <button
        className="admin-hamburger"
        onClick={() => setMobileOpen(true)}
        aria-label="فتح القائمة"
        id="admin-hamburger-btn"
      >
        <Menu size={24} />
      </button>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="admin-drawer-overlay"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — desktop: static, mobile: drawer */}
      <aside className={`admin-sidebar ${mobileOpen ? 'admin-sidebar--open' : ''}`}>
        {/* Mobile close button */}
        <button
          className="admin-drawer-close"
          onClick={() => setMobileOpen(false)}
          aria-label="إغلاق القائمة"
        >
          <X size={20} />
        </button>
        {sidebarContent}
      </aside>

      {/* Main content */}
      <main className="admin-main">
        {children}
      </main>
    </div>
  );
}
