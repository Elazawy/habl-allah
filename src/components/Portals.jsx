import { BookOpen, CheckCircle2, ArrowLeft, Smile, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

function FeatureItem({ text, dark = false }) {
  return (
    <li className="flex items-center gap-3">
      <CheckCircle2
        size={18}
        className={`shrink-0 ${dark ? 'text-amber-400' : 'text-emerald-500'}`}
      />
      <span
        className="text-base"
        style={{ color: dark ? 'rgba(226,232,228,0.9)' : 'var(--t-text-muted)' }}
      >
        {text}
      </span>
    </li>
  );
}

export default function Portals() {
  return (
    <section
      id="portals"
      className="py-24 px-6"
      style={{ background: 'linear-gradient(to bottom, var(--t-bg), var(--t-bg-surface-low))' }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <span
            className="inline-block text-sm font-semibold px-4 py-1.5 rounded-full mb-4"
            style={{ backgroundColor: 'var(--t-primary-light)', color: 'var(--t-primary)' }}
          >
            منصاتنا التعليمية
          </span>
          <h2 className="text-4xl font-black mb-4" style={{ color: 'var(--t-primary)' }}>
            اختر منصتك المناسبة
          </h2>
          <p className="max-w-xl mx-auto text-lg" style={{ color: 'var(--t-text-muted)' }}>
            لدينا بيئة تعليمية مخصصة لكل فئة عمرية — سواء كنت بالغاً أو طفلاً
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid md:grid-cols-2 gap-8 items-stretch">

          {/* ── Card 1: Adults ── */}
          <div className="group relative bg-gradient-to-br from-emerald-900 to-emerald-800 rounded-3xl p-8 shadow-xl hover:-translate-y-2 hover:shadow-2xl hover:shadow-emerald-900/30 transition-all duration-300 flex flex-col overflow-hidden">
            {/* Decorative circle */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-700/30 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-emerald-950/40 rounded-full translate-x-1/4 translate-y-1/4 pointer-events-none" />

            {/* Icon badge */}
            <div className="relative z-10 w-14 h-14 bg-amber-400/20 border border-amber-400/30 rounded-2xl flex items-center justify-center mb-6">
              <BookOpen size={28} className="text-amber-400" />
            </div>

            <div className="relative z-10 flex-1">
              {/* Title */}
              <div className="mb-1">
                {/* <span className="text-amber-400 text-xs font-semibold tracking-widest uppercase">للبالغين</span> */}
              </div>
              <h3 className="text-3xl font-black text-white mb-3">منصة حبل الله</h3>
              <p className="text-emerald-200/80 text-sm leading-relaxed mb-8">
                رحلة علمية متكاملة في علوم القرآن الكريم، مُصمَّمة خصيصاً للراغبين في التميز والإتقان.
              </p>

              {/* Features */}
              <ul className="space-y-4 mb-10">
                <FeatureItem text="دورات قرآنية متخصصة" dark />
                <FeatureItem text="نخبة من المعلمين المجازين" dark />
                <FeatureItem text="مسابقات دورية وقيمة" dark />
                <FeatureItem text="شهادات معتمدة دولياً" dark />
              </ul>
            </div>

            <Link
              to="/quran"
              id="portal-adults-cta"
              className="relative z-10 group/btn inline-flex items-center justify-center gap-3 bg-amber-400 hover:bg-amber-300 text-emerald-900 font-bold text-base px-8 py-4 rounded-2xl shadow-lg shadow-amber-900/20 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
            >
              ابدأ رحلتك التعليمية
              <ArrowLeft size={18} className="group-hover/btn:-translate-x-1 transition-transform duration-300" />
            </Link>
          </div>

          {/* ── Card 2: Kids ── */}
          <div
            className="group relative rounded-3xl p-8 shadow-xl hover:-translate-y-2 hover:shadow-2xl hover:shadow-sky-200/40 transition-all duration-300 flex flex-col overflow-hidden border"
            style={{
              backgroundColor: 'var(--t-bg-card)',
              borderColor: 'var(--t-border)',
            }}
          >
            {/* Decorative blobs */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-orange-50/50 rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-sky-50/50 rounded-full -translate-x-1/3 translate-y-1/3 pointer-events-none" />

            {/* Playful star decorations */}
            <Star size={14} className="absolute top-8 left-10 text-orange-300 fill-orange-300 pointer-events-none" />
            <Star size={10} className="absolute top-20 left-24 text-sky-300 fill-sky-300 pointer-events-none" />
            <Star size={12} className="absolute bottom-24 right-8 text-amber-300 fill-amber-300 pointer-events-none" />

            {/* Icon badge */}
            <div className="relative z-10 w-14 h-14 bg-orange-100/70 border border-orange-200 rounded-2xl flex items-center justify-center mb-6">
              <Smile size={28} className="text-orange-500" />
            </div>

            <div className="relative z-10 flex-1">
              {/* Title */}
              <div className="mb-1">
                <span className="text-sky-500 text-xs font-semibold tracking-widest uppercase">للأطفال</span>
              </div>
              <h3 className="text-3xl font-black mb-3" style={{ color: 'var(--t-primary)' }}>
                منصة أسس حبل الله
              </h3>
              <p className="text-sm leading-relaxed mb-8" style={{ color: 'var(--t-text-muted)' }}>
                بيئة تعليمية تفاعلية مرحة وآمنة، تبني في الطفل الأسس الإيمانية بطريقة تشويقية ومحببة.
              </p>

              {/* Features */}
              <ul className="space-y-4 mb-10">
                <FeatureItem text="فقه ميسر للأطفال" />
                <FeatureItem text="عقيدة بأسلوب تفاعلي" />
                <FeatureItem text="سيرة نبوية عطرة" />
                <FeatureItem text="ألعاب وتحديات قرآنية" />
              </ul>
            </div>

            {/* CTA — vibrant orange */}
            <a
              href="#"
              id="portal-kids-cta"
              className="relative z-10 group/btn inline-flex items-center justify-center gap-3 bg-gradient-to-l from-orange-500 to-orange-400 hover:from-orange-400 hover:to-orange-300 text-white font-bold text-base px-8 py-4 rounded-2xl shadow-lg shadow-orange-300/30 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
            >
              دخول الأطفال
              <ArrowLeft size={18} className="group-hover/btn:-translate-x-1 transition-transform duration-300" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}