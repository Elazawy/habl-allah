import { Star } from 'lucide-react';

const testimonials = [
  {
    quote:
      'بفضل الله ثم معلمي في الأكاديمية، تمكنت من إتمام حفظ ثلاثة أجزاء في وقت قياسي وبإتقان تام.',
    name: 'أحمد علي',
    role: 'طالب منذ سنة',
    initials: 'أ.ع',
  },
  {
    quote:
      'الأكاديمية وفرت لابنتي بيئة مريحة ومعلمة صبورة جداً، أحببت اهتمامهم بالتفاصيل التربوية قبل التعليمية.',
    name: 'سارة محمود',
    role: 'ولية أمر',
    initials: 'س.م',
  },
  {
    quote:
      'المرونة في الأوقات كانت أهم شيء بالنسبة لي كموظف، المنصة سهلة الاستخدام والصوت واضح جداً.',
    name: 'محمد خالد',
    role: 'طالب تجويد',
    initials: 'م.خ',
  },
];

export default function Testimonials() {
  return (
    <section className="py-24 px-5 md:px-8 pattern-overlay-gold" style={{ backgroundColor: 'var(--t-bg-page)' }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <h2 className="text-4xl font-black mb-4" style={{ color: 'var(--t-primary)' }}>
            ماذا يقول طلابنا؟
          </h2>
          <div className="w-16 h-1 mx-auto rounded-full" style={{ backgroundColor: 'var(--t-secondary)' }} />
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="p-8 rounded-[2rem] shadow-sm border flex flex-col"
              style={{
                backgroundColor: 'var(--t-bg-card)',
                borderColor: 'var(--t-border-gold)',
              }}
            >
              {/* Stars */}
              <div className="flex gap-0.5 mb-4" style={{ color: 'var(--t-secondary)' }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={18} fill="currentColor" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-sm leading-relaxed italic flex-1 mb-6" style={{ color: 'var(--t-text)' }}>
                "{t.quote}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm"
                  style={{ backgroundColor: 'var(--t-primary-light)', color: 'var(--t-primary)' }}
                >
                  {t.initials}
                </div>
                <div>
                  <h5 className="font-bold text-sm" style={{ color: 'var(--t-primary)' }}>
                    {t.name}
                  </h5>
                  <span className="text-xs" style={{ color: 'var(--t-text-muted)' }}>
                    {t.role}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
