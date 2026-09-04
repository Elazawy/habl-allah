import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { updateMyProfile } from '../../services/studentsService';
import { COUNTRY_OPTIONS, getCountryName } from '../../data/countries';
import QuranNav from '../quran/QuranNav';
import QuranFooter from '../quran/QuranFooter';
import { User, Calendar, MapPin, Phone, GraduationCap, Loader, Save, ArrowRight } from 'lucide-react';

export default function StudentProfilePage() {
  const { user, studentProfile, refreshStudentProfile, signOut } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState('');
  const [birthDate, setBirthDate] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setFullName(studentProfile?.full_name ?? '');
    setCountry(studentProfile?.country ?? '');
    setBirthDate(studentProfile?.birth_date ?? '');
  }, [studentProfile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (fullName.trim().length < 2) {
      setError('يرجى كتابة الاسم الكامل بشكل صحيح (ثنائي على الأقل).');
      return;
    }

    if (birthDate) {
      const parsed = new Date(`${birthDate}T00:00:00`);
      if (Number.isNaN(parsed.getTime())) {
        setError('يرجى كتابة تاريخ ميلاد صحيح.');
        return;
      }
    }

    setSaving(true);
    try {
      await updateMyProfile({
        full_name: fullName.trim(),
        country: country || null,
        birth_date: birthDate || null,
      });
      await refreshStudentProfile(user);
      setSuccess('تم حفظ البيانات بنجاح.');
    } catch (err) {
      console.error(err);
      setError(err.message ?? 'حدث خطأ أثناء حفظ البيانات. يرجى المحاولة مرة أخرى.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/quran');
  };

  return (
    <div dir="rtl" className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--t-bg-page)', color: 'var(--t-text)' }}>
      <QuranNav />

      <main className="flex-1 py-10 px-5 md:px-8 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-2xl mx-auto space-y-8 relative z-10">

          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border rounded-3xl p-6 md:p-8 shadow-sm" style={{ backgroundColor: 'var(--t-bg-card)', borderColor: 'var(--t-border)' }}>
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black shrink-0"
                style={{ backgroundColor: 'var(--t-primary)' }}
              >
                {(studentProfile?.full_name ?? '؟').trim().charAt(0)}
              </div>
              <div>
                <span className="text-xs font-bold block mb-1" style={{ color: 'var(--t-primary)' }}>ملفي الشخصي</span>
                <h1 className="text-2xl font-black" style={{ color: 'var(--t-text)' }}>
                  {studentProfile?.full_name}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 md:mt-0">
              <Link
                to="/quran/student/dashboard"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90"
                style={{ backgroundColor: 'var(--t-primary-light)', color: 'var(--t-primary)' }}
              >
                <ArrowRight size={14} />
                العودة للوحة التحكم
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
              >
                تسجيل الخروج
              </button>
            </div>
          </div>

          {/* Profile Form */}
          <form
            onSubmit={handleSubmit}
            className="border rounded-3xl p-6 md:p-8 shadow-sm space-y-6"
            style={{ backgroundColor: 'var(--t-bg-card)', borderColor: 'var(--t-border)' }}
          >
            <h2 className="text-lg font-black flex items-center gap-2" style={{ color: 'var(--t-text)' }}>
              <User className="w-5 h-5" style={{ color: 'var(--t-primary)' }} />
              البيانات الشخصية
            </h2>

            {/* Editable: full name */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="profile-fullname" className="text-xs font-bold" style={{ color: 'var(--t-primary)' }}>
                الاسم الكامل
              </label>
              <input
                id="profile-fullname"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full py-2.5 px-4 rounded-xl border text-sm font-semibold outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--t-bg-page)',
                  borderColor: 'var(--t-border)',
                  color: 'var(--t-text)',
                }}
              />
            </div>

            {/* Editable: country */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="profile-country" className="text-xs font-bold" style={{ color: 'var(--t-primary)' }}>
                الدولة
              </label>
              <select
                id="profile-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full py-2.5 px-4 rounded-xl border text-sm font-semibold outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--t-bg-page)',
                  borderColor: 'var(--t-border)',
                  color: 'var(--t-text)',
                }}
              >
                <option value="">--لم يتم تحديد الدولة--</option>
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.nameAr}
                  </option>
                ))}
              </select>
            </div>

            {/* Editable: birth date */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="profile-birthdate" className="text-xs font-bold" style={{ color: 'var(--t-primary)' }}>
                تاريخ الميلاد
              </label>
              <input
                id="profile-birthdate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full py-2.5 px-4 rounded-xl border text-sm font-semibold outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--t-bg-page)',
                  borderColor: 'var(--t-border)',
                  color: 'var(--t-text)',
                }}
              />
            </div>

            {/* Read-only: phone */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="profile-phone" className="text-xs font-bold" style={{ color: 'var(--t-primary)' }}>
                رقم الهاتف (لا يمكن تعديله)
              </label>
              <input
                id="profile-phone"
                type="text"
                disabled
                value={studentProfile?.phone ?? ''}
                dir="ltr"
                className="w-full py-2.5 px-4 rounded-xl border text-sm font-semibold outline-none"
                style={{
                  backgroundColor: 'var(--t-bg-page)',
                  borderColor: 'var(--t-border)',
                  color: 'var(--t-text-muted)',
                  opacity: 0.7,
                  cursor: 'not-allowed',
                }}
              />
            </div>

            {/* Read-only: gender + teacher */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold" style={{ color: 'var(--t-primary)' }}>
                  <span className="inline-flex items-center gap-1"><User size={12} /> الجنس (لا يمكن تعديله)</span>
                </span>
                <div
                  className="py-2.5 px-4 rounded-xl border text-sm font-bold"
                  style={{
                    backgroundColor: 'var(--t-bg-page)',
                    borderColor: 'var(--t-border)',
                    color: 'var(--t-text-muted)',
                  }}
                >
                  {studentProfile?.gender === 'male' ? 'ذكر' : studentProfile?.gender === 'female' ? 'أنثى' : 'غير محدد'}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold" style={{ color: 'var(--t-primary)' }}>
                  <span className="inline-flex items-center gap-1"><GraduationCap size={12} /> المعلم المتابع</span>
                </span>
                <div
                  className="py-2.5 px-4 rounded-xl border text-sm font-bold"
                  style={{
                    backgroundColor: 'var(--t-bg-page)',
                    borderColor: 'var(--t-border)',
                    color: 'var(--t-text-muted)',
                  }}
                >
                  {studentProfile?.teachers?.name ?? 'بدون معلم'}
                </div>
              </div>
            </div>

            {error && (
              <div className="flex gap-2 items-center bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold py-3 px-4 rounded-2xl" role="alert">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex gap-2 items-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold py-3 px-4 rounded-2xl" role="status">
                <span>✅</span>
                <span>{success}</span>
              </div>
            )}

            <div className="flex justify-end border-t pt-4" style={{ borderColor: 'var(--t-border)' }}>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 py-3 px-8 rounded-xl font-bold text-white text-xs transition-all hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                style={{ backgroundColor: 'var(--t-secondary)' }}
              >
                {saving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
                <span>{saving ? 'جاري الحفظ...' : 'حفظ البيانات'}</span>
              </button>
            </div>
          </form>

          {/* Info hints */}
          <p className="text-xs text-center leading-relaxed" style={{ color: 'var(--t-text-muted)' }}>
            <Phone size={12} className="inline-block ml-1" />
            رقم الهاتف والجنس والمعلم المتابع لا يمكن تعديلهما من هنا — يرجى التواصل مع الإدارة لأي تعديل عليها.
            {studentProfile?.country ? (
              <span>
                {' '}
                <MapPin size={12} className="inline-block ml-1" />
                دولتك الحالية: {getCountryName(studentProfile.country)}
              </span>
            ) : null}
            {studentProfile?.birth_date ? (
              <span>
                {' '}
                <Calendar size={12} className="inline-block ml-1" />
                تاريخ ميلادك المسجل: {new Date(studentProfile.birth_date).toLocaleDateString('ar-EG')}
              </span>
            ) : null}
          </p>
        </div>
      </main>

      <QuranFooter />
    </div>
  );
}
