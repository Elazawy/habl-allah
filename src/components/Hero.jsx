import { ChevronDown, BookOpen } from 'lucide-react';
import logoGold from '../assets/logo-gold.png';

export default function Hero() {
  const scrollDown = () => {
    document.getElementById('portals')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ backgroundColor: 'var(--t-bg)' }}
    >
      {/* Geometric pattern overlay */}
      <div className="geometric-bg" />

      {/* Soft gradient blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-200/30 blur-[120px] pointer-events-none dark-blob" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-300/20 blur-[100px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] rounded-full bg-amber-200/20 blur-[80px] pointer-events-none" />

      {/* ── Content ── */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 py-20 max-w-5xl mx-auto">
        {/* Brand Logo */}
        <div className="fade-in-up mb-6">
          <img
            src={logoGold}
            alt="شعار حبل الله"
            className="hero-logo-img"
          />
        </div>

        {/* Decorative top badge */}
        <div
          className="fade-in-up delay-100 mb-8 inline-flex items-center gap-2 text-sm font-semibold px-5 py-2 rounded-full shadow-sm border"
          style={{
            backgroundColor: 'var(--t-primary-light)',
            borderColor: 'var(--t-border)',
            color: 'var(--t-primary)',
          }}
        >
          <span>منصة تعليمية قرآنية متكاملة</span>
        </div>

        {/* Main title */}
        <h1
          className="fade-in-up delay-100 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-tight mb-6 tracking-tight text-center w-full"
          style={{ color: 'var(--t-primary)', textAlign: 'center' }}
        >
          مرحباً بكم في
          <span
            className="block mt-2 text-center"
            style={{ color: 'var(--t-secondary)', textAlign: 'center' }}
          >
            أكاديمية حبل الله القرآنية
          </span>
        </h1>

        {/* Decorative divider */}
        <div className="fade-in-up delay-200 flex items-center justify-center gap-3 my-6 mx-auto">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-amber-400" />
          <BookOpen size={22} className="text-amber-500" />
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-amber-400" />
        </div>

        {/* Subtitle */}
        <p
          className="fade-in-up delay-300 text-lg sm:text-xl max-w-2xl leading-relaxed mb-12 text-center mx-auto"
          style={{ color: 'var(--t-text-muted)', textAlign: 'center' }}
        >
          نور الهداية يبدأ من هنا، حيث نجمع بين الأصالة العلمية والتقنيات
          الحديثة لخدمة كتاب الله.
        </p>

        {/* CTA Button */}
        <button
          onClick={scrollDown}
          className="fade-in-up delay-400 group font-bold text-lg px-10 py-4 rounded-2xl shadow-lg transition-all duration-300 hover:-translate-y-1 active:translate-y-0 flex items-center gap-3 text-white"
          style={{
            backgroundColor: 'var(--t-primary)',
            boxShadow: '0 8px 32px color-mix(in srgb, var(--t-primary) 30%, transparent)',
          }}
        >
          اكتشف منصاتنا
          <ChevronDown size={20} className="group-hover:translate-y-1 transition-transform duration-300" />
        </button>

        {/* Stats row */}
        <div
          className="fade-in-up delay-400 grid grid-cols-3 gap-8 mt-20 pt-10 w-full max-w-lg border-t"
          style={{ borderColor: 'var(--t-border)' }}
        >
          {[
            { value: '+١٠', label: 'سنوات خبرة' },
            { value: '+٥٠٠', label: 'طالب مسجّل' },
            { value: '+٣٠', label: 'معلم مجاز' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-black" style={{ color: 'var(--t-primary)' }}>{s.value}</div>
              <div className="text-sm mt-1" style={{ color: 'var(--t-text-subtle)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Animated scroll arrow at bottom */}
      <button
        onClick={scrollDown}
        aria-label="التمرير للأسفل"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce-slow opacity-70 hover:opacity-100 transition-opacity"
        style={{ color: 'var(--t-primary)' }}
      >
        <ChevronDown size={36} strokeWidth={1.5} />
      </button>
    </section>
  );
}
