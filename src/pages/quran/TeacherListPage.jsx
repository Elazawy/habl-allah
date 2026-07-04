import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Send, CheckCircle, Loader2, ChevronLeft } from 'lucide-react';
import { fetchTeachers, submitPreferenceForm } from '../../services/teachersService';
import { GENDER_LABELS } from '../../lib/constants';
import TeacherCard from './TeacherCard';
import QuranNav from './QuranNav';
import QuranFooter from './QuranFooter';

/** Inline animation helper — fires immediately regardless of scroll */
const anim = (delay = 0) => ({
  animation: `cardFadeIn 0.55s cubic-bezier(0.22,1,0.36,1) ${delay}s both`,
});

const TABS = [
  { id: 'browse', label: 'تصفح واختر معلمك بنفسك' },
  { id: 'form',   label: 'ساعدني أختار معلمي' },
];

/* ─── Preference Form (Tab 2) ─────────────────────────────── */
function PreferenceForm({ gender }) {
  const [values, setValues] = useState({
    student_name: '',
    age: '',
    whatsapp: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState('');

  function handleChange(e) {
    setValues((v) => ({ ...v, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await submitPreferenceForm({ ...values, gender_preference: gender });
      setSuccess(true);
    } catch {
      setError('حدث خطأ، يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center text-center py-16 px-6">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
          style={{ backgroundColor: 'var(--t-primary-light)' }}
        >
          <CheckCircle size={40} style={{ color: 'var(--t-primary)' }} />
        </div>
        <h3 className="text-2xl font-black mb-3" style={{ color: 'var(--t-text)' }}>
          تم إرسال طلبك بنجاح
        </h3>
        <p className="text-base leading-relaxed max-w-sm mb-2" style={{ color: 'var(--t-text-muted)' }}>
          سيتم التواصل معك واختيار المعلم المناسب لك
        </p>
        <p className="text-sm" style={{ color: 'var(--t-text-subtle)' }}>
          يمكنك استكمال البحث عن معلمك المناسب
        </p>
      </div>
    );
  }

  const inputStyle = {
    backgroundColor: 'var(--t-input-bg)',
    color: 'var(--t-text)',
    borderColor: 'var(--t-border)',
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto py-10 px-4">
      <div className="text-center mb-8">
        <h3 className="text-xl font-black mb-2" style={{ color: 'var(--t-text)' }}>
          أخبرنا عن احتياجك
        </h3>
        <p className="text-sm" style={{ color: 'var(--t-text-muted)' }}>
          جميع الحقول اختيارية — كلما أخبرتنا أكثر، كلما كان اختيارنا أدق
        </p>
      </div>

      <div className="flex flex-col gap-5">
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--t-text-muted)' }}>
            اسم الطالب
          </label>
          <input
            id="pref-student-name"
            name="student_name"
            type="text"
            placeholder="اكتب اسمك هنا…"
            value={values.student_name}
            onChange={handleChange}
            className="w-full rounded-xl px-4 py-3 text-sm border outline-none"
            style={inputStyle}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--t-text-muted)' }}>
            العمر
          </label>
          <input
            id="pref-age"
            name="age"
            type="number"
            min="5"
            max="99"
            placeholder="مثال: ٢٥"
            value={values.age}
            onChange={handleChange}
            className="w-full rounded-xl px-4 py-3 text-sm border outline-none"
            style={inputStyle}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--t-text-muted)' }}>
            رقم التواصل (واتساب)
          </label>
          <input
            id="pref-whatsapp"
            name="whatsapp"
            type="tel"
            placeholder="مثال: 01012345678"
            value={values.whatsapp}
            onChange={handleChange}
            className="w-full rounded-xl px-4 py-3 text-sm border outline-none"
            style={inputStyle}
            dir="ltr"
          />
          <p className="text-xs mt-1.5" style={{ color: 'var(--t-text-subtle)' }}>
            سيُستخدم فقط للتواصل معك من قِبَل فريقنا
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--t-text-muted)' }}>
            ما الذي تبحث عنه في المعلم؟
          </label>
          <textarea
            id="pref-description"
            name="description"
            rows={4}
            placeholder="مثال: أريد معلماً متخصصاً في تجويد المبتدئين، يناسب طفل عمره ١٠ سنوات…"
            value={values.description}
            onChange={handleChange}
            className="w-full rounded-xl px-4 py-3 text-sm border outline-none resize-none leading-relaxed"
            style={inputStyle}
          />
        </div>

        {error && (
          <p className="text-sm text-center font-semibold" style={{ color: '#ef4444' }}>
            {error}
          </p>
        )}

        <button
          id="pref-submit-btn"
          type="submit"
          disabled={loading}
          className="w-full rounded-xl py-3.5 font-bold text-base flex items-center justify-center gap-2 transition-all duration-300 hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
          style={{ backgroundColor: 'var(--t-primary)', color: '#ffffff' }}
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          {loading ? 'جارٍ الإرسال…' : 'إرسال الطلب'}
        </button>
      </div>
    </form>
  );
}

/* ─── Main Page ───────────────────────────────────────────── */
export default function TeacherListPage() {
  const { gender } = useParams();
  const [activeTab, setActiveTab] = useState('browse');
  const [teachers,  setTeachers]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  const genderLabel = GENDER_LABELS[gender] ?? 'المعلمون';
  const isMale      = gender === 'male';

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    fetchTeachers(gender)
      .then((data) => {
        if (active) setTeachers(data);
      })
      .catch((err) => {
        console.error('[teachers fetch failed]', err);
        if (active) {
          setTeachers([]);
          setError('تعذر تحميل قائمة المعلمين. يرجى تحديث الصفحة.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [gender]);

  return (
    <div dir="rtl" className="min-h-screen" style={{ backgroundColor: 'var(--t-bg-page)', color: 'var(--t-text)' }}>
      <QuranNav />

      <main>
        {/* ── Breadcrumb + Header ── */}
        <section className="pt-14 pb-8 px-5 md:px-8">
          <div className="max-w-5xl mx-auto">
            <nav className="flex items-center gap-2 text-xs mb-8" style={anim(0)} aria-label="مسار التنقل">
              <Link to="/quran" className="font-semibold hover:underline" style={{ color: 'var(--t-text-muted)' }}>
                حبل الله
              </Link>
              <ChevronLeft size={14} style={{ color: 'var(--t-text-subtle)' }} />
              <Link to="/quran/teachers" className="font-semibold hover:underline" style={{ color: 'var(--t-text-muted)' }}>
                اختر معلمك
              </Link>
              <ChevronLeft size={14} style={{ color: 'var(--t-text-subtle)' }} />
              <span className="font-bold" style={{ color: 'var(--t-primary)' }}>
                {genderLabel}
              </span>
            </nav>

            <div style={anim(0.07)}>
              <h1 className="text-3xl md:text-4xl font-black mb-2" style={{ color: 'var(--t-text)' }}>
                {genderLabel}
              </h1>
              <p className="text-base" style={{ color: 'var(--t-text-muted)' }}>
                {isMale
                  ? 'معلمون مجازون بالقراءات العشر لتعليم الرجال والأطفال'
                  : 'معلمات متميزات لتعليم النساء والفتيات في خصوصية تامة'}
              </p>
            </div>
          </div>
        </section>

        {/* ── Tabs ── */}
        <section className="px-5 md:px-8 pb-2">
          <div className="max-w-5xl mx-auto">
            <div
              className="inline-flex rounded-2xl p-1.5 gap-1"
              style={{ backgroundColor: 'var(--t-bg-surface)', ...anim(0.12) }}
            >
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className="rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-300"
                  style={
                    activeTab === tab.id
                      ? {
                          backgroundColor: 'var(--t-bg-card)',
                          color: 'var(--t-primary)',
                          boxShadow: '0 2px 8px var(--t-shadow-card)',
                        }
                      : { color: 'var(--t-text-muted)' }
                  }
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Tab Content ── */}
        <section className="px-5 md:px-8 pb-28">
          <div className="max-w-5xl mx-auto">

            {/* TAB 1: Browse grid */}
            {activeTab === 'browse' && (
              <div className="pt-8">
                {loading ? (
                  <div className="flex justify-center py-24">
                    <Loader2 size={36} className="animate-spin" style={{ color: 'var(--t-primary)' }} />
                  </div>
                ) : error ? (
                  <div className="text-center py-24">
                    <p className="text-sm font-semibold mb-4" style={{ color: 'var(--t-text-muted)' }}>{error}</p>
                    <button
                      onClick={() => { setLoading(true); setError(''); fetchTeachers(gender).then(setTeachers).catch(() => setError('تعذر تحميل قائمة المعلمين.')).finally(() => setLoading(false)); }}
                      className="px-6 py-2.5 rounded-xl font-bold text-sm text-white transition-colors"
                      style={{ backgroundColor: 'var(--t-primary)' }}
                    >
                      إعادة المحاولة
                    </button>
                  </div>
                ) : teachers.length === 0 ? (
                  <p className="text-center py-24" style={{ color: 'var(--t-text-subtle)' }}>
                    لا يوجد معلمون متاحون حالياً.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-5">
                    {teachers.map((teacher, i) => (
                      <TeacherCard key={teacher.id} teacher={teacher} index={i} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Preference form */}
            {activeTab === 'form' && (
              <div
                className="mt-8 rounded-3xl border"
                style={{
                  backgroundColor: 'var(--t-bg-card)',
                  borderColor: 'var(--t-border)',
                  boxShadow: '0 4px 24px var(--t-shadow-card)',
                  ...anim(0.1),
                }}
              >
                <PreferenceForm gender={gender} />
              </div>
            )}

          </div>
        </section>
      </main>

      <QuranFooter />
    </div>
  );
}
