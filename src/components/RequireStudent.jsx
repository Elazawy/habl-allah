import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useLocalizedPath } from '../i18n';

export default function RequireStudent({ children }) {
  const { user, loading, isStudent, isAdmin, adminLoading } = useAuth();
  const location = useLocation();
  const localizePath = useLocalizedPath();
  const { t } = useTranslation('student');

  if (loading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-950/5">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  // No user logged in at all
  if (!user) {
    return <Navigate to={localizePath('/quran/student/login')} state={{ from: location }} replace />;
  }

  // User is an Admin, not a student, redirect to admin dashboard
  if (isAdmin && !isStudent) {
    return <Navigate to="/admin/quran" replace />;
  }

  // User is authenticated but somehow has no student profile
  if (!isStudent) {
    return (
      <Navigate
        to={localizePath('/quran/student/login')}
        state={{ from: location, error: t('auth.noLinkedAccount') }}
        replace
      />
    );
  }

  return children;
}
