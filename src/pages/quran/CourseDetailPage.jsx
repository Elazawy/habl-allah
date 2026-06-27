import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BookOpen, Award, CheckCircle, ChevronRight, MessageCircle } from 'lucide-react';
import QuranNav from './QuranNav';
import QuranFooter from './QuranFooter';
import { fetchCourseBySlug } from '../../services/coursesService';
import { WHATSAPP_NUMBER } from '../../lib/constants';
import quranHero from '../../assets/quran-hero.png';

export default function CourseDetailPage() {
  const { slug } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadCourse() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchCourseBySlug(slug);
        if (data) {
          setCourse(data);
        } else {
          setError('الدورة المطلوبة غير موجودة.');
        }
      } catch (err) {
        console.warn('Supabase fetch failed:', err);
        setError('تعذر تحميل تفاصيل الدورة حالياً.');
      } finally {
        setLoading(false);
      }
    }
    loadCourse();
  }, [slug]);

  // Document Title Manager
  useEffect(() => {
    if (course) {
      document.title = `${course.name} - منصة القرآن حبل الله`;
    } else {
      document.title = 'تفاصيل الدورة - حبل الله';
    }
  }, [course]);

  const handleSubscribe = () => {
    if (!course) return;
    const text = `السلام عليكم ورحمة الله وبركاته، أرغب في الاشتراك في دورة: (${course.name})، يرجى إفادتي بالتفاصيل وكيفية البدء.`;
    const url = `https://api.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--t-bg-page)', color: 'var(--t-text)' }}>
        <QuranNav />
        <div className="flex-grow flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-sm font-semibold" style={{ color: 'var(--t-text-muted)' }}>جاري تحميل تفاصيل الدورة...</p>
        </div>
        <QuranFooter />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div dir="rtl" className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--t-bg-page)', color: 'var(--t-text)' }}>
        <QuranNav />
        <div className="flex-grow flex flex-col items-center justify-center py-24 px-5 text-center">
          <BookOpen className="w-16 h-16 text-red-500/40 mb-4" />
          <h2 className="text-2xl font-black mb-2" style={{ color: 'var(--t-primary)' }}>تعذر العثور على الدورة</h2>
          <p className="text-sm max-w-md mx-auto mb-8" style={{ color: 'var(--t-text-muted)' }}>
            {error || 'المعذرة، لم نتمكن من العثور على الدورة التعليمية المطلوبة.'}
          </p>
          <Link
            to="/quran/courses"
            className="inline-flex items-center gap-2 py-3.5 px-6 rounded-xl font-bold text-white text-sm bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
          >
            العودة لصفحة الدورات
          </Link>
        </div>
        <QuranFooter />
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--t-bg-page)', color: 'var(--t-text)' }}>
      <QuranNav />

      <main className="flex-1 py-12 px-5 md:px-8 relative overflow-hidden">
        <div className="geometric-bg opacity-10" />
        
        <div className="max-w-4xl mx-auto relative z-10">
          {/* Breadcrumb / Back button */}
          <Link
            to="/quran/courses"
            className="inline-flex items-center gap-1.5 font-bold text-xs mb-8 transition-colors hover:opacity-75"
            style={{ color: 'var(--t-text-muted)' }}
          >
            <ChevronRight size={16} />
            <span>العودة لصفحة الدورات</span>
          </Link>

          {/* Main Card Content */}
          <div
            className="rounded-3xl border overflow-hidden shadow-sm"
            style={{
              backgroundColor: 'var(--t-bg-card)',
              borderColor: 'var(--t-border-gold)',
            }}
          >
            {/* Wide Hero Image */}
            <div className="relative h-64 md:h-80 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
              <img
                src={course.image_url || quranHero}
                alt={course.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              <div className="absolute bottom-6 right-6 left-6 text-white">
                <span className="inline-block px-3 py-1.5 rounded-full text-xs font-black bg-emerald-600 mb-3">
                  {course.is_free ? 'مبادرة مجانية' : 'دورة تعليمية'}
                </span>
                <h1 className="text-2xl md:text-4xl font-black tracking-tight">{course.name}</h1>
              </div>
            </div>

            {/* Course Information Details */}
            <div className="p-6 md:p-10 space-y-10">
              {/* Short / Long Description */}
              <div className="space-y-4">
                <p className="text-base md:text-lg font-semibold leading-relaxed" style={{ color: 'var(--t-primary)' }}>
                  {course.short_description}
                </p>
                {course.long_description && (
                  <p className="text-sm md:text-base leading-relaxed whitespace-pre-line" style={{ color: 'var(--t-text-muted)' }}>
                    {course.long_description}
                  </p>
                )}
              </div>

              {/* Learning Outcomes (مخرجات التعلم) */}
              {course.learning_outcomes && course.learning_outcomes.length > 0 && (
                <div className="p-6 md:p-8 rounded-2xl border" style={{ backgroundColor: 'var(--t-bg-surface-low)', borderColor: 'var(--t-border-gold)' }}>
                  <h2 className="text-lg md:text-xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--t-primary)' }}>
                    <Award className="w-5 h-5 text-amber-500" />
                    <span>مخرجات التعلم والمهارات المكتسبة</span>
                  </h2>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {course.learning_outcomes.map((outcome, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-sm leading-relaxed" style={{ color: 'var(--t-text-muted)' }}>
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{outcome}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Subscription CTA Panel */}
              <div className="border-t pt-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6" style={{ borderColor: 'var(--t-border)' }}>
                <div>
                  <h4 className="font-bold text-base mb-1" style={{ color: 'var(--t-text)' }}>
                    {course.is_free ? 'انضم للمبادرة مجاناً' : 'اشترك وابدأ التعلم الآن'}
                  </h4>
                  {!course.is_free && (
                    <p className="text-xs" style={{ color: 'var(--t-text-muted)' }}>
                      التسجيل سهل ومباشر عبر المحادثة المباشرة مع منسقي الأكاديمية
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-stretch md:items-end gap-3 w-full md:w-auto shrink-0">
                  {/* Price row — hidden for free courses */}
                  {!course.is_free && (
                    <div className="flex items-center justify-between md:justify-end gap-4">
                      <span className="text-sm font-bold" style={{ color: 'var(--t-text-muted)' }}>سعر الاشتراك:</span>
                      <span className="text-2xl font-black" style={{ color: 'var(--t-secondary)' }}>
                        {course.price}
                      </span>
                    </div>
                  )}

                  <button
                    onClick={handleSubscribe}
                    className="py-3.5 px-8 rounded-xl font-bold text-white text-sm bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-sm shadow-emerald-600/10 cursor-pointer justify-center"
                  >
                    <MessageCircle className="w-4 h-4" />
                    {course.is_free ? 'ابدأ الآن' : 'اضغط للاشتراك'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <QuranFooter />
    </div>
  );
}
