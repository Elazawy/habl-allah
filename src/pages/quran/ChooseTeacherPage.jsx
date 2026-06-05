import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useReveal } from '../../hooks/useReveal';
import QuranNav from './QuranNav';
import QuranFooter from './QuranFooter';

const sections = [
  {
    id: 'portal-choose-male',
    gender: 'male',
    label: 'قسم المعلمين',
    desc: 'معلمون مجازون بالقراءات العشر لتعليم الرجال والأطفال',
    bg: '#1B4D3E',
    iconColor: '#CFA767',
    textColor: '#ffffff',
    descColor: 'rgba(255,255,255,0.75)',
    linkColor: '#CFA767',
    // SVG for male section — open book / mosque silhouette
    icon: (
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="20" r="10" stroke="currentColor" strokeWidth="2.5" fill="none"/>
        <path d="M12 52c0-11.046 8.954-20 20-20s20 8.954 20 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      </svg>
    ),
  },
  {
    id: 'portal-choose-female',
    gender: 'female',
    label: 'قسم المعلمات',
    desc: 'معلمات متميزات لتعليم النساء والفتيات في خصوصية تامة',
    bg: '#CFA767',
    iconColor: '#1B4D3E',
    textColor: '#1B4D3E',
    descColor: 'rgba(27,77,62,0.78)',
    linkColor: '#1B4D3E',
    icon: (
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="18" r="10" stroke="currentColor" strokeWidth="2.5" fill="none"/>
        <path d="M14 52c0-9.941 8.059-18 18-18s18 8.059 18 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        <path d="M22 18 Q32 8 42 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
      </svg>
    ),
  },
];

export default function ChooseTeacherPage() {
  const navigate = useNavigate();
  const ref = useReveal();

  return (
    <div dir="rtl" className="min-h-screen" style={{ backgroundColor: 'var(--t-bg-page)', color: 'var(--t-text)' }}>
      <QuranNav />

      <main ref={ref}>
        {/* ── Page Hero ── */}
        <section className="py-20 px-5 md:px-8 text-center">
          <div className="reveal">
            <span
              className="inline-block text-sm font-bold tracking-widest uppercase mb-4 px-4 py-1.5 rounded-full"
              style={{ backgroundColor: 'var(--t-primary-light)', color: 'var(--t-primary)' }}
            >
              ابدأ رحلتك
            </span>
            <h1
              className="text-4xl md:text-5xl font-black mb-5 leading-tight"
              style={{ color: 'var(--t-text)' }}
            >
              اختر <span style={{ color: 'var(--t-primary)' }}>معلمك</span>
            </h1>
            <p
              className="text-lg max-w-xl mx-auto leading-relaxed"
              style={{ color: 'var(--t-text-muted)' }}
            >
              اختر القسم المناسب لك، ثم تصفح المعلمين أو دعنا نرشّح لك المعلم المثالي
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center justify-center gap-4 mt-8 mb-2 reveal reveal-d1">
            <div className="h-px w-16 rounded-full" style={{ backgroundColor: 'var(--t-border)' }} />
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--t-secondary)' }} />
            <div className="h-px w-16 rounded-full" style={{ backgroundColor: 'var(--t-border)' }} />
          </div>
        </section>

        {/* ── Section Cards ── */}
        <section className="pb-28 px-5 md:px-8">
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-7">
            {sections.map((s, i) => (
              <button
                key={s.id}
                id={s.id}
                onClick={() => navigate(`/quran/teachers/${s.gender}`)}
                className={`reveal-scale reveal-d${i + 1} group relative overflow-hidden rounded-3xl h-[360px] flex flex-col items-center justify-center text-center transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 pattern-overlay-gold cursor-pointer w-full border-0`}
                style={{ backgroundColor: s.bg }}
                aria-label={`الانتقال إلى ${s.label}`}
              >
                {/* Subtle radial glow on hover */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"
                  style={{
                    background: `radial-gradient(circle at 50% 40%, ${s.iconColor}22 0%, transparent 70%)`,
                  }}
                />

                <div className="relative z-10 flex flex-col items-center px-10">
                  {/* Icon */}
                  <div
                    className="mb-6 transition-transform duration-500 group-hover:scale-110"
                    style={{ color: s.iconColor }}
                  >
                    {s.icon}
                  </div>

                  {/* Title */}
                  <h2 className="text-3xl font-black mb-3" style={{ color: s.textColor }}>
                    {s.label}
                  </h2>

                  {/* Description */}
                  <p className="text-base leading-relaxed mb-8 max-w-xs" style={{ color: s.descColor }}>
                    {s.desc}
                  </p>

                  {/* CTA */}
                  <span
                    className="inline-flex items-center gap-2 font-bold text-sm border rounded-full px-5 py-2 transition-all duration-300 group-hover:gap-3"
                    style={{
                      color: s.linkColor,
                      borderColor: `${s.linkColor}55`,
                      backgroundColor: `${s.linkColor}18`,
                    }}
                  >
                    تصفح المعلمين
                    <ArrowLeft size={15} className="transition-transform duration-300 group-hover:-translate-x-1" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>

      <QuranFooter />
    </div>
  );
}
