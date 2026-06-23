import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logoGold from '../../assets/logo-gold.png';

export default function AdminLoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname ?? '/admin';
  const unauthorized = Boolean(location.state?.unauthorized);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
        : 'حدث خطأ، يرجى المحاولة مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-root" dir="rtl">
      {/* Animated background orbs */}
      <div className="admin-login-bg">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <div className="admin-login-card">
        {/* Logo / Brand */}
        <div className="admin-login-brand">
          <img
            src={logoGold}
            alt="شعار حبل الله"
            className="admin-login-logo-img"
          />
          <h1 className="admin-login-title">حبل الله</h1>
          <p className="admin-login-subtitle">لوحة تحكم المدير</p>
        </div>

        <form onSubmit={handleSubmit} className="admin-login-form" id="admin-login-form">
          {unauthorized && !error && (
            <div className="admin-error-banner" role="alert">
              <span>⚠️</span> هذا الحساب غير مخول للوصول إلى لوحة الإدارة.
            </div>
          )}

          <div className="admin-field-group">
            <label htmlFor="admin-email" className="admin-label">البريد الإلكتروني</label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="admin-input"
              placeholder="admin@hablallah.com"
              required
              autoComplete="email"
              dir="ltr"
            />
          </div>

          <div className="admin-field-group">
            <label htmlFor="admin-password" className="admin-label">كلمة المرور</label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="admin-input"
              placeholder="••••••••"
              required
              autoComplete="current-password"
              dir="ltr"
            />
          </div>

          {error && (
            <div className="admin-error-banner" role="alert">
              <span>⚠️</span> {error}
            </div>
          )}

          <button
            type="submit"
            id="admin-login-btn"
            className="admin-login-btn"
            disabled={loading}
          >
            {loading ? (
              <span className="admin-spinner" aria-label="جارٍ تسجيل الدخول…" />
            ) : (
              'تسجيل الدخول'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
