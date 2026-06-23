import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useReveal } from '../../hooks/useReveal';

const portals = [
  {
    icon: (
      <svg width="52" height="52" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="20" r="10" stroke="currentColor" strokeWidth="2.5" fill="none"/>
        <path d="M12 52c0-11.046 8.954-20 20-20s20 8.954 20 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      </svg>
    ),
    label: 'قسم المعلمين',
    desc: 'معلمون مجازون بالقراءات العشر لتعليم الرجال والأطفال',
    bg: '#1B4D3E',
    iconColor: '#CFA767',
    textColor: '#ffffff',
    descColor: 'rgba(255,255,255,0.75)',
    linkColor: '#CFA767',
    id: 'portal-teachers-male',
    to: '/quran/teachers/male',
  },
  {
    icon: (
      <svg width="52" height="52" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="18" r="10" stroke="currentColor" strokeWidth="2.5" fill="none"/>
        <path d="M14 52c0-9.941 8.059-18 18-18s18 8.059 18 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        <path d="M22 18 Q32 8 42 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
      </svg>
    ),
    label: 'قسم المعلمات',
    desc: 'معلمات متميزات لتعليم النساء والفتيات في خصوصية تامة',
    bg: '#CFA767',
    iconColor: '#1B4D3E',
    textColor: '#1B4D3E',
    descColor: 'rgba(27,77,62,0.75)',
    linkColor: '#1B4D3E',
    id: 'portal-teachers-female',
    to: '/quran/teachers/female',
  },
];

export default function TeacherPortals() {
  const ref = useReveal();

  return (
    <section ref={ref} id="portals" className="py-24 px-5 md:px-8" style={{ backgroundColor: 'var(--t-bg-surface-low)' }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14 reveal">
          <h2 className="text-4xl font-black mb-4" style={{ color: 'var(--t-primary)' }}>
            اختر قسمك
          </h2>
          <div className="w-16 h-1 mx-auto rounded-full" style={{ backgroundColor: 'var(--t-secondary)' }} />
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {portals.map((p, i) => (
            <Link
              key={p.id}
              to={p.to}
              className={`reveal-scale reveal-d${i + 1} relative group cursor-pointer overflow-hidden rounded-3xl h-[380px] flex items-center justify-center text-center transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 pattern-overlay-gold`}
              style={{ backgroundColor: p.bg, display: 'flex' }}
            >
              <div className="z-10 p-10 flex flex-col items-center">
                <div
                  className="mb-6 transition-transform duration-300 group-hover:scale-110"
                  style={{ color: p.iconColor }}
                >
                  {p.icon}
                </div>
                <h3 className="text-3xl font-black mb-4" style={{ color: p.textColor }}>
                  {p.label}
                </h3>
                <p className="text-base leading-relaxed mb-8 max-w-xs" style={{ color: p.descColor }}>
                  {p.desc}
                </p>
                <span
                  id={p.id}
                  className="inline-flex items-center gap-2 font-bold text-sm hover:underline transition-all"
                  style={{ color: p.linkColor }}
                >
                  اختر من هذا القسم
                  <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform duration-300" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
