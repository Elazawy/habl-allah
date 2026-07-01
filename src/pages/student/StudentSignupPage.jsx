import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signUpStudent } from '../../services/studentsService';
import { useAuth } from '../../context/AuthContext';
import logoGold from '../../assets/logo-gold.png';

export default function StudentSignupPage() {
  const navigate = useNavigate();
  const { refreshStudentProfile } = useAuth();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validations
    if (fullName.trim().length < 2) {
      setError('يرجى كتابة الاسم الكامل بشكل صحيح (ثنائي على الأقل).');
      return;
    }

    if (!/^\d{10,15}$/.test(phone.trim())) {
      setError('يرجى كتابة رقم هاتف صحيح يتكون من 10 إلى 15 رقماً.');
      return;
    }

    if (password.length < 6) {
      setError('يجب أن تتكون كلمة المرور من 6 خانات على الأقل.');
      return;
    }

    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين.');
      return;
    }

    setLoading(true);
    try {
      // Sign up student
      const authData = await signUpStudent({
        phone: phone.trim(),
        password,
        fullName: fullName.trim(),
      });

      // Refresh student states in AuthContext
      if (authData?.user) {
        await refreshStudentProfile(authData.user);
      }

      navigate('/student/dashboard', { replace: true });
    } catch (err) {
      console.error(err);
      if (err.message?.includes('unique') || err.message?.includes('already exists')) {
        setError('رقم الهاتف هذا مسجل بالفعل. يرجى تسجيل الدخول بدلاً من ذلك.');
      } else {
        setError(err.message ?? 'حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden py-12 px-6" style={{ backgroundColor: 'var(--t-bg-page)' }} dir="rtl">
      {/* Background Orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[350px] h-[350px] rounded-full blur-[80px] opacity-20" style={{ background: 'radial-gradient(circle, var(--t-primary), transparent)' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[350px] h-[350px] rounded-full blur-[80px] opacity-20" style={{ background: 'radial-gradient(circle, var(--t-secondary), transparent)' }} />
      </div>

      <div className="relative z-10 w-full max-w-md bg-white dark:bg-emerald-950/20 backdrop-blur-md border border-emerald-600/10 dark:border-emerald-400/10 rounded-3xl p-8 md:p-10 shadow-2xl shadow-emerald-900/5">
        
        {/* Brand Logo & Titles */}
        <div className="text-center mb-6">
          <Link to="/quran">
            <img
              src={logoGold}
              alt="شعار حبل الله"
              className="w-20 h-20 mx-auto object-contain mb-4 filter drop-shadow-md"
            />
          </Link>
          <h1 className="text-2xl font-black mb-1 text-emerald-900 dark:text-emerald-400">إنشاء حساب طالب</h1>
          <p className="text-sm font-semibold text-emerald-800/60 dark:text-emerald-200/60">انضم إلينا في حفظ ومدارسة كتاب الله</p>
        </div>

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name-input" className="text-xs font-bold text-emerald-900 dark:text-emerald-400">
              الاسم الكامل
            </label>
            <input
              id="name-input"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="مثال: أحمد محمد حمدي"
              required
              className="w-full py-2.5 px-4 rounded-xl border border-emerald-600/10 dark:border-emerald-400/10 bg-emerald-50/30 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 placeholder-emerald-800/40 dark:placeholder-emerald-200/40 text-sm font-semibold outline-none focus:border-emerald-600 dark:focus:border-emerald-400 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="phone-signup-input" className="text-xs font-bold text-emerald-900 dark:text-emerald-400">
              رقم الهاتف
            </label>
            <input
              id="phone-signup-input"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01xxxxxxxxx"
              required
              className="w-full py-2.5 px-4 rounded-xl border border-emerald-600/10 dark:border-emerald-400/10 bg-emerald-50/30 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 placeholder-emerald-800/40 dark:placeholder-emerald-200/40 text-sm font-semibold outline-none focus:border-emerald-600 dark:focus:border-emerald-400 transition-colors"
              dir="ltr"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password-signup-input" className="text-xs font-bold text-emerald-900 dark:text-emerald-400">
              كلمة المرور
            </label>
            <input
              id="password-signup-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full py-2.5 px-4 rounded-xl border border-emerald-600/10 dark:border-emerald-400/10 bg-emerald-50/30 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 placeholder-emerald-800/40 dark:placeholder-emerald-200/40 text-sm font-semibold outline-none focus:border-emerald-600 dark:focus:border-emerald-400 transition-colors"
              dir="ltr"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirm-password-input" className="text-xs font-bold text-emerald-900 dark:text-emerald-400">
              تأكيد كلمة المرور
            </label>
            <input
              id="confirm-password-input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full py-2.5 px-4 rounded-xl border border-emerald-600/10 dark:border-emerald-400/10 bg-emerald-50/30 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 placeholder-emerald-800/40 dark:placeholder-emerald-200/40 text-sm font-semibold outline-none focus:border-emerald-600 dark:focus:border-emerald-400 transition-colors"
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
            className="w-full py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold text-sm transition-all transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-50 disabled:transform-none flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              'إنشاء الحساب'
            )}
          </button>
        </form>

        {/* Switch to Login */}
        <div className="mt-6 text-center border-t border-emerald-600/10 dark:border-emerald-400/10 pt-4">
          <p className="text-xs font-bold text-emerald-900/60 dark:text-emerald-100/60">
            لديك حساب بالفعل؟{' '}
            <Link
              to="/student/login"
              className="text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              سجل دخولك هنا
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
