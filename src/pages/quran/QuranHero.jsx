import quranHero from '../../assets/quran-hero.png';

export default function QuranHero() {
  return (
    <section
      className="relative min-h-[600px] flex flex-col md:flex-row-reverse items-center overflow-hidden"
      style={{ backgroundColor: 'var(--t-bg-page)' }}
    >
      {/* Text side */}
      <div className="w-full md:w-1/2 px-6 md:px-12 z-10 py-16 md:py-0 flex flex-col justify-center">
        <span
          className="inline-block text-xs font-bold tracking-widest uppercase mb-6 px-4 py-1.5 rounded-full w-fit"
          style={{ backgroundColor: 'var(--t-primary-light)', color: 'var(--t-primary)' }}
        >
          أكاديمية حبل الله القرآنية
        </span>

        <h1
          className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-6"
          style={{ color: 'var(--t-primary)' }}
        >
          رحلة نورانية لتعلم
          <br />
          <span style={{ color: 'var(--t-secondary)' }}>القرآن الكريم</span>
          <br />
          من منزلك
        </h1>

        <p className="text-lg leading-relaxed mb-10 max-w-xl" style={{ color: 'var(--t-text-muted)' }}>
          نقدم لك تجربة تعليمية فريدة مع نخبة من المجازين والقراء، بمسارات تعليمية
          مخصصة تناسب وقتك ومستواك.
        </p>

        <div className="flex flex-wrap gap-4">
          <button
            className="px-10 py-4 rounded-2xl font-bold text-lg text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl active:translate-y-0"
            style={{ backgroundColor: 'var(--t-secondary)', boxShadow: '0 8px 24px color-mix(in srgb, var(--t-secondary) 35%, transparent)' }}
          >
            ابدأ رحلتك الآن
          </button>
        </div>
      </div>

      {/* Image side */}
      <div className="w-full md:w-1/2 relative h-[380px] md:h-[640px]">
        <img
          src={quranHero}
          alt="القرآن الكريم على رحل خشبي في مسجد مضاء بضوء ذهبي"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Fade gradient — right edge toward text */}
        <div
          className="absolute inset-0 hidden md:block"
          style={{ background: 'var(--t-hero-gradient)' }}
        />
        {/* Fade gradient — bottom on mobile */}
        <div
          className="absolute inset-0 md:hidden"
          style={{ background: 'var(--t-hero-gradient-m)' }}
        />
      </div>
    </section>
  );
}
