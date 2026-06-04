import { Building2, UserRound, ArrowLeft } from 'lucide-react';

const portals = [
  {
    icon: <Building2 size={52} />,
    label: 'قسم المعلمين',
    desc: 'معلمون مجازون بالقراءات العشر لتعليم الرجال والأطفال',
    bg: '#1B4D3E',
    iconColor: '#CFA767',
    textColor: '#ffffff',
    descColor: 'rgba(255,255,255,0.75)',
    linkColor: '#CFA767',
    id: 'portal-teachers-male',
  },
  {
    icon: <UserRound size={52} />,
    label: 'قسم المعلمات',
    desc: 'معلمات متميزات لتعليم النساء والفتيات في خصوصية تامة',
    bg: '#CFA767',
    iconColor: '#1B4D3E',
    textColor: '#1B4D3E',
    descColor: 'rgba(27,77,62,0.75)',
    linkColor: '#1B4D3E',
    id: 'portal-teachers-female',
  },
];

export default function TeacherPortals() {
  return (
    <section id="portals" className="py-24 px-5 md:px-8" style={{ backgroundColor: 'var(--t-bg-surface-low)' }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <h2 className="text-4xl font-black mb-4" style={{ color: 'var(--t-primary)' }}>
            اختر قسمك
          </h2>
          <div className="w-16 h-1 mx-auto rounded-full" style={{ backgroundColor: 'var(--t-secondary)' }} />
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {portals.map((p) => (
            <div
              key={p.id}
              className="relative group cursor-pointer overflow-hidden rounded-3xl h-[380px] flex items-center justify-center text-center transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 pattern-overlay-gold"
              style={{ backgroundColor: p.bg }}
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
                <button
                  id={p.id}
                  className="inline-flex items-center gap-2 font-bold text-sm hover:underline transition-all"
                  style={{ color: p.linkColor }}
                >
                  عرض التفاصيل
                  <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform duration-300" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
