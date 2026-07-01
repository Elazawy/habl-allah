import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RequireStudent({ children }) {
  const { user, loading, isStudent, isAdmin, adminLoading } = useAuth();
  const location = useLocation();

  if (loading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-950/5">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  // No user logged in at all
  if (!user) {
    return <Navigate to="/student/login" state={{ from: location }} replace />;
  }

  // User is an Admin, not a student, redirect to admin dashboard
  if (isAdmin && !isStudent) {
    return <Navigate to="/admin/quran" replace />;
  }

  // User is authenticated but somehow has no student profile
  if (!isStudent) {
    return <Navigate to="/student/login" state={{ from: location, error: 'لم يتم العثور على حساب طالب مرتبط.' }} replace />;
  }

  return children;
}
