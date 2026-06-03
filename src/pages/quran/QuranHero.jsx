import quranHero from '../../assets/quran-hero.png';

export default function QuranHero() {
  return (
    <section className="relative min-h-[600px] flex flex-col md:flex-row-reverse items-center overflow-hidden" style={{ backgroundColor: '#f9faf7' }}>
      {/* Text side */}
      <div className="w-full md:w-1/2 px-6 md:px-12 z-10 py-16 md:py-0 flex flex-col justify-center">
        <span
          className="inline-block text-xs font-bold tracking-widest uppercase mb-6 px-4 py-1.5 rounded-full w-fit"
          style={{ backgroundColor: '#1B4D3E15', color: '#1B4D3E' }}
        >
          أكاديمية حبل الله القرآنية
        </span>

        <h1
          className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-6"
          style={{ color: '#1B4D3E' }}
        >
          رحلة نورانية لتعلم
          <br />
          <span style={{ color: '#CFA767' }}>القرآن الكريم</span>
          <br />
          من منزلك
        </h1>

        <p className="text-lg leading-relaxed mb-10 max-w-xl" style={{ color: '#404945' }}>
          نقدم لك تجربة تعليمية فريدة مع نخبة من المجازين والقراء، بمسارات تعليمية
          مخصصة تناسب وقتك ومستواك.
        </p>

        <div className="flex flex-wrap gap-4">
          <button
            className="px-10 py-4 rounded-2xl font-bold text-lg text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl active:translate-y-0"
            style={{ backgroundColor: '#CFA767', boxShadow: '0 8px 24px #CFA76740' }}
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
          style={{ background: 'linear-gradient(to left, #f9faf7 12%, transparent 55%)' }}
        />
        {/* Fade gradient — bottom on mobile */}
        <div
          className="absolute inset-0 md:hidden"
          style={{ background: 'linear-gradient(to top, #f9faf7 15%, transparent 55%)' }}
        />
      </div>
    </section>
  );
}
