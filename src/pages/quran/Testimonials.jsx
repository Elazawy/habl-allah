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
    <section className="py-24 px-5 md:px-8 pattern-overlay-gold" style={{ backgroundColor: '#f9faf7' }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <h2 className="text-4xl font-black mb-4" style={{ color: '#1B4D3E' }}>
            ماذا يقول طلابنا؟
          </h2>
          <div className="w-16 h-1 mx-auto rounded-full" style={{ backgroundColor: '#CFA767' }} />
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="bg-white p-8 rounded-[2rem] shadow-sm border flex flex-col"
              style={{ borderColor: 'rgba(207, 167, 103, 0.15)' }}
            >
              {/* Stars */}
              <div className="flex gap-0.5 mb-4" style={{ color: '#CFA767' }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={18} fill="currentColor" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-sm leading-relaxed italic flex-1 mb-6" style={{ color: '#191c1b' }}>
                "{t.quote}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm"
                  style={{ backgroundColor: 'rgba(27,77,62,0.08)', color: '#1B4D3E' }}
                >
                  {t.initials}
                </div>
                <div>
                  <h5 className="font-bold text-sm" style={{ color: '#1B4D3E' }}>
                    {t.name}
                  </h5>
                  <span className="text-xs" style={{ color: '#404945' }}>
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
