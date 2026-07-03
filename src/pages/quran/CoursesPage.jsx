import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { fetchPublishedCourses } from '../../services/coursesService';
import QuranNav from './QuranNav';
import QuranFooter from './QuranFooter';
import quranHero from '../../assets/quran-hero.png';
import { useAuth } from '../../context/AuthContext';
import { fetchMySubscribedCourses } from '../../services/studentsService';

export default function CoursesPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myCourseIds, setMyCourseIds] = useState(new Set());

  useEffect(() => {
    let active = true;
    async function loadCourses() {
      try {
        setLoading(true);
        const data = await fetchPublishedCourses();
        if (!active) return;
        setCourses(data ?? []);

        if (user) {
          const subs = await fetchMySubscribedCourses();
          if (!active) return;
          const activeIds = new Set(subs.map((s) => s.course_id));
          setMyCourseIds(activeIds);
        } else if (active) {
          setMyCourseIds(new Set());
        }
      } catch (err) {
        console.warn('Supabase fetch failed:', err);
        if (active) setCourses([]);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadCourses();
    return () => { active = false; };
  }, [user]);

  return (
    <div dir="rtl" className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--t-bg-page)', color: 'var(--t-text)' }}>
      <QuranNav />

      <main className="flex-1 py-16 px-5 md:px-8 relative overflow-hidden">
        {/* Background Decorative patterns */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16 fade-in-up">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold mb-4" style={{ backgroundColor: 'var(--t-badge-bg)', color: 'var(--t-primary)' }}>
              <BookOpen className="w-3.5 h-3.5" />
              دوراتنا المتميزة
            </span>
            <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight" style={{ color: 'var(--t-primary)' }}>
              تعلّم القرآن الكريم وتجويده
            </h1>
            <p className="text-base md:text-lg max-w-2xl mx-auto" style={{ color: 'var(--t-text-muted)' }}>
              اختر مسارك التعليمي المناسب وابدأ رحلتك المباركة في فهم وحفظ كتاب الله مع أفضل الشيوخ والمعلمين.
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin" />
              <p className="text-sm font-semibold" style={{ color: 'var(--t-text-muted)' }}>جاري تحميل الدورات...</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
              <BookOpen className="w-16 h-16 opacity-20" style={{ color: 'var(--t-primary)' }} />
              <h2 className="text-2xl font-black" style={{ color: 'var(--t-primary)' }}>لا توجد دورات متاحة حالياً</h2>
              <p className="text-sm max-w-sm" style={{ color: 'var(--t-text-muted)' }}>
                نعمل على إعداد دوراتنا التعليمية. تابعونا قريباً لمزيد من التفاصيل.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="flex flex-col rounded-3xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.04)] border transition-all duration-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] hover:-translate-y-1.5"
                  style={{
                    backgroundColor: 'var(--t-bg-card)',
                    borderColor: 'var(--t-border-gold)',
                  }}
                >
                  {/* Card Image */}
                  <div className="relative h-56 overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img
                      src={course.image_url || quranHero}
                      alt={course.name}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                    {course.is_free && (
                      <span className="absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-black bg-emerald-600 text-white shadow-sm">
                        مبادرة مجانية
                      </span>
                    )}
                    {myCourseIds.has(course.id) && (
                      <span className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-xs font-black bg-amber-600 text-white shadow-sm">
                        مشترك ✅
                      </span>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xl font-bold mb-3 leading-snug" style={{ color: 'var(--t-primary)' }}>
                        {course.name}
                      </h3>
                      <p className="text-sm leading-relaxed mb-6 line-clamp-3" style={{ color: 'var(--t-text-muted)' }}>
                        {course.short_description}
                      </p>
                    </div>

                    {/* Price & Buttons */}
                    <div className="border-t pt-5 mt-auto" style={{ borderColor: 'var(--t-border)' }}>
                      <div className="flex items-center justify-between mb-5">
                        <span className="text-xs font-medium" style={{ color: 'var(--t-text-subtle)' }}>سعر الاشتراك</span>
                        <span className="text-lg font-black" style={{ color: 'var(--t-secondary)' }}>
                          {course.is_free ? 'مجاني بالكامل' : course.price}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {course.is_free ? (
                          <Link
                            to={`/quran/courses/${course.slug}/watch`}
                            className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white transition-colors duration-200 flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/10"
                          >
                            ابدأ الآن
                          </Link>
                        ) : myCourseIds.has(course.id) ? (
                          <Link
                            to={`/quran/courses/${course.slug}/watch`}
                            className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white transition-colors duration-200 flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/10"
                          >
                            صفحة المشاهدة
                          </Link>
                        ) : (
                          <Link
                            to={`/quran/courses/${course.slug}`}
                            className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white transition-colors duration-200 flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/10"
                          >
                            اشترك الآن
                          </Link>
                        )}
                        <Link
                          to={`/quran/courses/${course.slug}`}
                          className="w-full py-3 px-4 rounded-xl font-bold text-sm border hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-200 flex items-center justify-center gap-1.5"
                          style={{ borderColor: 'var(--t-border)', color: 'var(--t-primary)' }}
                        >
                          التفاصيل
                          <ArrowLeft className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <QuranFooter />
    </div>
  );
}
