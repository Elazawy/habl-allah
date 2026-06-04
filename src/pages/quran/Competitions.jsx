import { Trophy, BookOpen, Calendar, Award } from 'lucide-react';

const competitions = [
  {
    icon: <Trophy size={32} />,
    title: 'مسابقة الماهر بالقرآن',
    desc: 'مسابقة سنوية لإتقان التلاوة وضبط الأحكام.',
    date: '١٥ شوال — ١٥ ذو القعدة',
    prize: 'جائزة عمرة للثلاثة الأوائل',
    id: 'competition-mahir',
  },
  {
    icon: <BookOpen size={32} />,
    title: 'مسابقة القارئ المتقن',
    desc: 'أبرز مهاراتك في ضبط أحكام التجويد والترتيل.',
    date: '١ رمضان — ٣٠ رمضان',
    prize: 'جوائز قيمة لأفضل القراء',
    id: 'competition-qari',
  },
];

export default function Competitions() {
  return (
    <section id="competitions" className="py-24 px-5 md:px-8" style={{ backgroundColor: 'var(--t-bg-surface-low)' }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h2 className="text-4xl font-black mb-3" style={{ color: 'var(--t-primary)' }}>
            المسابقات الحالية
          </h2>
          <p className="text-base" style={{ color: 'var(--t-text-muted)' }}>
            شارك في مسابقتنا القرآنية واستمتع بالروح التنافسية
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {competitions.map((c) => (
            <div
              key={c.id}
              className="rounded-3xl p-8 border transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              style={{
                backgroundColor: 'var(--t-bg-card)',
                borderColor: 'var(--t-border-gold)',
              }}
            >
              {/* Icon */}
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white mb-6 shadow-md"
                style={{ backgroundColor: 'var(--t-primary)' }}
              >
                {c.icon}
              </div>

              <h3 className="text-2xl font-black mb-3" style={{ color: 'var(--t-primary)' }}>
                {c.title}
              </h3>
              <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--t-text-muted)' }}>
                {c.desc}
              </p>

              {/* Meta */}
              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-2 text-sm font-bold" style={{ color: 'var(--t-primary)' }}>
                  <Calendar size={15} />
                  <span>{c.date}</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-bold" style={{ color: 'var(--t-secondary)' }}>
                  <Award size={15} />
                  <span>{c.prize}</span>
                </div>
              </div>

              <button
                id={c.id}
                className="w-full py-3.5 rounded-2xl font-bold text-white text-base transition-all duration-300 hover:opacity-90 hover:-translate-y-0.5 shadow-md"
                style={{ backgroundColor: 'var(--t-secondary)' }}
              >
                انضم الآن
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
