import { useTranslation } from 'react-i18next';
import quranHero from '../../assets/quran-hero.png';

export default function QuranHero() {
  const { t } = useTranslation('quranHome');

  return (
    <section
      className="relative min-h-[600px] flex flex-col md:flex-row items-center overflow-hidden"
      style={{ backgroundColor: 'var(--t-bg-page)' }}
    >
      {/* Text side — sits at inline-start in both RTL and LTR */}
      <div className="w-full md:w-1/2 px-6 md:px-12 z-10 py-16 md:py-0 flex flex-col justify-center">
        <span
          className="hero-text-in inline-block text-xs font-bold tracking-widest uppercase mb-6 px-4 py-1.5 rounded-full w-fit"
          style={{ backgroundColor: 'var(--t-primary-light)', color: 'var(--t-primary)', animationDelay: '0s' }}
        >
          {t('hero.badge')}
        </span>

        <h1
          className="hero-text-in text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-6"
          style={{ color: 'var(--t-primary)', animationDelay: '0.12s' }}
        >
          {t('hero.titleLine1')}
          <br />
          <span style={{ color: 'var(--t-secondary)' }}>{t('hero.titleHighlight')}</span>
          <br />
          {t('hero.titleLine3')}
        </h1>

        <p
          className="hero-text-in text-lg leading-relaxed mb-10 max-w-xl"
          style={{ color: 'var(--t-text-muted)', animationDelay: '0.22s' }}
        >
          {t('hero.description')}
        </p>

        <div className="hero-text-in flex flex-wrap gap-4" style={{ animationDelay: '0.32s' }}>
          <button
            onClick={() => document.getElementById('portals')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-10 py-4 rounded-2xl font-bold text-lg text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl active:translate-y-0"
            style={{ backgroundColor: 'var(--t-secondary)', boxShadow: '0 8px 24px color-mix(in srgb, var(--t-secondary) 35%, transparent)' }}
          >
            {t('hero.cta')}
          </button>
        </div>
      </div>

      {/* Image side — fades + scales in on mount */}
      <div className="hero-img-in w-full md:w-1/2 relative h-[380px] md:h-[640px]" style={{ animationDelay: '0.1s' }}>
        <img
          src={quranHero}
          alt={t('hero.imageAlt')}
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Fade gradient — inner edge toward text (mirrored in index.css for [dir="ltr"]) */}
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
