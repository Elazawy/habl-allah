import { UserSearch, CalendarDays, PlayCircle } from 'lucide-react';

const steps = [
  {
    icon: <UserSearch size={28} />,
    title: 'اختر معلمك المفضل',
    desc: 'تصفح ملفات المعلمين واختر من يناسب أسلوبك',
    num: '١',
  },
  {
    icon: <CalendarDays size={28} />,
    title: 'حدد موعدك المناسب',
    desc: 'جدولة مرنة تناسب أوقاتك، متاح على مدار الساعة',
    num: '٢',
  },
  {
    icon: <PlayCircle size={28} />,
    title: 'ابدأ التعلم',
    desc: 'انطلق في رحلتك القرآنية بجلسات مباشرة وتفاعلية',
    num: '٣',
  },
];

export default function HowItWorks() {
  return (
    <section className="py-24 px-5 md:px-8" style={{ backgroundColor: '#f9faf7' }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black mb-4" style={{ color: '#1B4D3E' }}>
            كيف تبدأ رحلتك
          </h2>
          <div className="w-16 h-1 mx-auto rounded-full" style={{ backgroundColor: '#CFA767' }} />
        </div>

        {/* Steps */}
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Dashed connector line (desktop only) */}
          <div
            className="hidden md:block absolute top-10 left-0 right-0 h-px border-t border-dashed"
            style={{ borderColor: 'rgba(207, 167, 103, 0.3)', zIndex: 0 }}
          />

          {steps.map((s) => (
            <div key={s.num} className="relative z-10 flex flex-col items-center text-center">
              {/* Step circle */}
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center shadow-md mb-6 border-2 relative"
                style={{
                  backgroundColor: '#ffffff',
                  borderColor: 'rgba(207, 167, 103, 0.35)',
                  color: '#1B4D3E',
                }}
              >
                {s.icon}
                {/* Step number badge */}
                <span
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white"
                  style={{ backgroundColor: '#CFA767' }}
                >
                  {s.num}
                </span>
              </div>

              <h3 className="text-xl font-black mb-2" style={{ color: '#1B4D3E' }}>
                {s.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: '#404945' }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
