import { useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, Users, LogOut, LayoutDashboard } from 'lucide-react';

export default function AdminLayout({ children }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  return (
    <div className="admin-layout" dir="rtl">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <div className="admin-sidebar-logo">ح</div>
          <span className="admin-sidebar-name">حبل الله</span>
        </div>

        <nav className="admin-sidebar-nav">
          <NavLink
            to="/admin"
            end
            id="admin-nav-dashboard"
            className={({ isActive }) =>
              `admin-nav-link ${isActive ? 'admin-nav-link--active' : ''}`
            }
          >
            <LayoutDashboard size={18} />
            <span>الرئيسية</span>
          </NavLink>

          <NavLink
            to="/admin/teachers"
            id="admin-nav-teachers"
            className={({ isActive }) =>
              `admin-nav-link ${isActive ? 'admin-nav-link--active' : ''}`
            }
          >
            <Users size={18} />
            <span>المعلمون</span>
          </NavLink>

          <NavLink
            to="/quran"
            target="_blank"
            id="admin-nav-site"
            className="admin-nav-link"
          >
            <BookOpen size={18} />
            <span>عرض الموقع</span>
          </NavLink>
        </nav>

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
      </aside>

      {/* Main content */}
      <main className="admin-main">
        {children}
      </main>
    </div>
  );
}
