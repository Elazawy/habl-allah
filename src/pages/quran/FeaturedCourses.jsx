import { ArrowLeft } from 'lucide-react';
import quranHero from '../../assets/quran-hero.png';
import studentTablet from '../../assets/student-tablet.png';
import { useReveal } from '../../hooks/useReveal';

const courses = [
  {
    image: quranHero,
    alt: 'دورة إتقان التجويد',
    badge: 'الأكثر طلباً',
    title: 'دبلوم إتقان التجويد',
    desc: 'دورة شاملة تمتد لثلاثة أشهر، تركز على القواعد النظرية والتطبيق العملي المكثف.',
    price: '٢٥٠ ريال',
    id: 'course-tajweed',
  },
  {
    image: studentTablet,
    alt: 'القاعدة النورانية',
    badge: null,
    title: 'القاعدة النورانية للصغار',
    desc: 'تأسيس لغوي وقرآني ممتع للأطفال بطرق تعليمية حديثة ومبتكرة.',
    price: '١٨٠ ريال',
    id: 'course-nooraniyya',
  },
  {
    image: quranHero,
    alt: 'مسار الحفظ المكثف',
    badge: null,
    title: 'مسار الحفظ المكثف',
    desc: 'برنامج مخصص لإتمام حفظ القرآن الكريم كاملاً خلال عام واحد فقط.',
    price: '٣٠٠ ريال',
    id: 'course-hifz',
  },
];

export default function FeaturedCourses() {
  const ref = useReveal();

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

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {courses.map((c, i) => (
            <div
              key={c.id}
              className={`reveal-scale reveal-d${i + 1} rounded-3xl overflow-hidden shadow-sm border flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1`}
              style={{
                backgroundColor: 'var(--t-bg-card)',
                borderColor: 'var(--t-border-gold)',
              }}
            >
              {/* Image */}
              <div className="relative h-52 overflow-hidden" style={{ backgroundColor: 'var(--t-bg-surface)' }}>
                <img
                  src={c.image}
                  alt={c.alt}
                  className="w-full h-full object-cover"
                />
                {c.badge && (
                  <span
                    className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: 'var(--t-secondary)' }}
                  >
                    {c.badge}
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-xl font-black mb-2 leading-snug" style={{ color: 'var(--t-primary)' }}>
                  {c.title}
                </h3>
                <p className="text-sm leading-relaxed flex-1 mb-6" style={{ color: 'var(--t-text-muted)' }}>
                  {c.desc}
                </p>

                {/* Footer row */}
                <div
                  className="flex items-center justify-between border-t pt-4"
                  style={{ borderColor: 'var(--t-border-gold)' }}
                >
                  <span className="font-black text-base" style={{ color: 'var(--t-secondary)' }}>
                    {c.price}
                  </span>
                  <button
                    id={c.id}
                    className="flex items-center gap-1 font-bold text-sm transition-colors duration-200 hover:opacity-70"
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
          <a
            href="#"
            className="inline-flex items-center gap-3 px-10 py-4 border-2 rounded-2xl font-bold text-lg transition-all duration-300 hover:text-white hover:-translate-y-0.5"
            id="view-all-courses"
            style={{ color: 'var(--t-secondary)', borderColor: 'var(--t-secondary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--t-secondary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            استعرض كافة الدورات
            <ArrowLeft size={18} />
          </a>
        </div>
      </div>
    </section>
  );
}
