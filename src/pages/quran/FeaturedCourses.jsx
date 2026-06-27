import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchPublishedCourses } from '../../services/coursesService';
import { useReveal } from '../../hooks/useReveal';
import quranHero from '../../assets/quran-hero.png';

export default function FeaturedCourses() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loaded, setLoaded] = useState(false);

  // Pass `courses` as a dep so the observer re-scans after async data arrives
  const ref = useReveal({}, [courses]);

  useEffect(() => {
    let active = true;
    fetchPublishedCourses()
      .then((data) => {
        if (!active) return;
        setCourses(data ? data.slice(0, 3) : []);
      })
      .catch(() => {
        if (active) setCourses([]);
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => { active = false; };
  }, []);

  // Don't render the section at all if there are no courses
  if (loaded && courses.length === 0) return null;

  return (
    <section ref={ref} id="courses" className="py-24 px-5 md:px-8" style={{ backgroundColor: 'var(--t-bg-page)' }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-12 reveal">
          <h2 className="text-4xl font-black mb-3" style={{ color: 'var(--t-primary)' }}>
            أبرز الدورات والمبادرات
          </h2>
          <p className="text-base max-w-2xl" style={{ color: 'var(--t-text-muted)' }}>
            اختر من بين باقة متنوعة من الدورات المتخصصة التي صُممت بعناية لتناسب جميع المستويات
            والأعمار.
          </p>
        </div>

        {/* Grid — cards use inline animation so they're visible as soon as they mount,
            regardless of when the IntersectionObserver fired */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {courses.map((c, i) => (
            <div
              key={c.id}
              className="rounded-3xl overflow-hidden shadow-sm border flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              style={{
                backgroundColor: 'var(--t-bg-card)',
                borderColor: 'var(--t-border-gold)',
                animation: 'fadeInUp 0.45s ease both',
                animationDelay: `${i * 0.1}s`,
              }}
            >
              {/* Image */}
              <div className="relative h-52 overflow-hidden" style={{ backgroundColor: 'var(--t-bg-surface)' }}>
                <img
                  src={c.image_url || quranHero}
                  alt={c.name}
                  className="w-full h-full object-cover"
                />
                {c.is_free && (
                  <span className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold text-white bg-emerald-600">
                    مجاني
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-xl font-black mb-2 leading-snug" style={{ color: 'var(--t-primary)' }}>
                  {c.name}
                </h3>
                <p className="text-sm leading-relaxed flex-1 mb-6" style={{ color: 'var(--t-text-muted)' }}>
                  {c.short_description}
                </p>

                {/* Footer row */}
                <div
                  className="flex items-center justify-between border-t pt-4"
                  style={{ borderColor: 'var(--t-border-gold)' }}
                >
                  <span className="font-black text-base" style={{ color: 'var(--t-secondary)' }}>
                    {c.is_free ? 'مجاني بالكامل' : c.price}
                  </span>
                  <button
                    id={`featured-course-${c.id}`}
                    onClick={() => navigate(`/quran/courses/${c.slug}`)}
                    className="flex items-center gap-1 font-bold text-sm transition-colors duration-200 hover:opacity-70 cursor-pointer"
                    style={{ color: 'var(--t-primary)' }}
                  >
                    التفاصيل
                    <ArrowLeft size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12 reveal">
          <Link
            to="/quran/courses"
            className="inline-flex items-center gap-3 px-10 py-4 border-2 rounded-2xl font-bold text-lg transition-all duration-300 hover:text-white hover:-translate-y-0.5"
            id="view-all-courses"
            style={{ color: 'var(--t-secondary)', borderColor: 'var(--t-secondary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--t-secondary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            استعرض كافة الدورات
            <ArrowLeft size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}
