import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logoGold from '../../assets/logo-gold.png';

export default function StudentLoginPage() {
  const { signInAsStudent } = useAuth();
  const navigate = useNavigate();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInAsStudent(phone, password);
      navigate('/student/dashboard', { replace: true });
    } catch (err) {
      console.error(err);
      setError(
        err.message === 'Invalid login credentials'
          ? 'رقم الهاتف أو كلمة المرور غير صحيحة.'
          : 'حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden py-12 px-6" style={{ backgroundColor: 'var(--t-bg-page)' }} dir="rtl">
      {/* Background Orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[350px] h-[350px] rounded-full blur-[80px] opacity-20" style={{ background: 'radial-gradient(circle, var(--t-primary), transparent)' }} />
        <div className="absolute bottom-[-10%] left-[-10%] w-[350px] h-[350px] rounded-full blur-[80px] opacity-20" style={{ background: 'radial-gradient(circle, var(--t-secondary), transparent)' }} />
      </div>

      <div className="relative z-10 w-full max-w-md bg-white dark:bg-emerald-950/20 backdrop-blur-md border border-emerald-600/10 dark:border-emerald-400/10 rounded-3xl p-8 md:p-10 shadow-2xl shadow-emerald-900/5">
        
        {/* Brand Logo & Titles */}
        <div className="text-center mb-8">
          <Link to="/quran">
            <img
              src={logoGold}
              alt="شعار حبل الله"
              className="w-20 h-20 mx-auto object-contain mb-4 filter drop-shadow-md"
            />
          </Link>
          <h1 className="text-2xl font-black mb-1 text-emerald-900 dark:text-emerald-400">حبل الله</h1>
          <p className="text-sm font-semibold text-emerald-800/60 dark:text-emerald-200/60">بوابة حسابات الطلاب</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="flex flex-col gap-2">
            <label htmlFor="phone-input" className="text-xs font-bold text-emerald-900 dark:text-emerald-400">
              رقم الهاتف
            </label>
            <input
              id="phone-input"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01xxxxxxxxx"
              required
              className="w-full py-3 px-4 rounded-2xl border border-emerald-600/10 dark:border-emerald-400/10 bg-emerald-50/30 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 placeholder-emerald-800/40 dark:placeholder-emerald-200/40 text-sm font-semibold outline-none focus:border-emerald-600 dark:focus:border-emerald-400 transition-colors"
              dir="ltr"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password-input" className="text-xs font-bold text-emerald-900 dark:text-emerald-400">
              كلمة المرور
            </label>
            <input
              id="password-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full py-3 px-4 rounded-2xl border border-emerald-600/10 dark:border-emerald-400/10 bg-emerald-50/30 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 placeholder-emerald-800/40 dark:placeholder-emerald-200/40 text-sm font-semibold outline-none focus:border-emerald-600 dark:focus:border-emerald-400 transition-colors"
              dir="ltr"
            />
          </div>

          {error && (
            <div className="flex gap-2 items-center bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold py-3 px-4 rounded-2xl" role="alert">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-emerald-700 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold text-sm transition-all transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-50 disabled:transform-none flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              'تسجيل الدخول'
            )}
          </button>
        </form>

        {/* Admin creates accounts info */}
        <div className="mt-8 text-center border-t border-emerald-600/10 dark:border-emerald-400/10 pt-6">
          <p className="text-xs font-bold text-emerald-900/60 dark:text-emerald-100/60">
            لا تمتلك حساباً؟ تواصل مع الإدارة لإنشاء حسابك.
          </p>
        </div>

      </div>
    </div>
  );
}
