import { ChevronDown, BookOpen, Star } from 'lucide-react';

export default function Hero() {
  const scrollDown = () => {
    document.getElementById('portals')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Geometric pattern overlay */}
      <div className="geometric-bg" />

      {/* Soft gradient blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-200/30 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-300/20 blur-[100px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] rounded-full bg-amber-200/20 blur-[80px] pointer-events-none" />

      {/* ── Content ── */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 py-20 max-w-5xl mx-auto">
        {/* Decorative top badge */}
        <div className="fade-in-up mb-8 inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold px-5 py-2 rounded-full shadow-sm">
          <Star size={14} className="fill-amber-400 text-amber-400" />
          <span>منصة تعليمية قرآنية متكاملة</span>
          <Star size={14} className="fill-amber-400 text-amber-400" />
        </div>

        {/* Main title */}
        <h1 className="fade-in-up delay-100 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-emerald-900 leading-tight mb-6 tracking-tight">
          مرحباً بكم في
          <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-l from-emerald-700 to-emerald-950">
            أكاديمية حبل الله القرآنية
          </span>
        </h1>

        {/* Decorative divider */}
        <div className="fade-in-up delay-200 flex items-center gap-3 my-6">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-amber-400" />
          <BookOpen size={22} className="text-amber-500" />
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-amber-400" />
        </div>

        {/* Subtitle */}
        <p className="fade-in-up delay-300 text-lg sm:text-xl text-gray-600 max-w-2xl leading-relaxed mb-12">
          نور الهداية يبدأ من هنا، حيث نجمع بين الأصالة العلمية والتقنيات
          الحديثة لخدمة كتاب الله.
        </p>

        {/* CTA Button */}
        <button
          onClick={scrollDown}
          className="fade-in-up delay-400 group bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-lg px-10 py-4 rounded-2xl shadow-lg hover:shadow-emerald-300/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 active:translate-y-0 flex items-center gap-3"
        >
          اكتشف منصاتنا
          <ChevronDown size={20} className="group-hover:translate-y-1 transition-transform duration-300" />
        </button>

        {/* Stats row */}
        <div className="fade-in-up delay-400 grid grid-cols-3 gap-8 mt-20 border-t border-emerald-100 pt-10 w-full max-w-lg">
          {[
            { value: '+١٠', label: 'سنوات خبرة' },
            { value: '+٥٠٠', label: 'طالب مسجّل' },
            { value: '+٣٠', label: 'معلم مجاز' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-black text-emerald-800">{s.value}</div>
              <div className="text-sm text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Animated scroll arrow at bottom */}
      <button
        onClick={scrollDown}
        aria-label="التمرير للأسفل"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 text-emerald-700 animate-bounce-slow opacity-70 hover:opacity-100 transition-opacity"
      >
        <ChevronDown size={36} strokeWidth={1.5} />
      </button>
    </section>
  );
}
