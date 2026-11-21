import { ShieldCheck, Clock, TrendingUp, BadgeCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import studentTablet from '../../assets/student-tablet.png';
import { useReveal } from '../../hooks/useReveal';

const FEATURE_ITEMS = [
  {
    key: 'eliteTeachers',
    icon: <BadgeCheck size={22} />,
  },
  {
    key: 'safeEnvironment',
    icon: <ShieldCheck size={22} />,
  },
  {
    key: 'flexibleTimes',
    icon: <Clock size={22} />,
  },
  {
    key: 'progressTracking',
    icon: <TrendingUp size={22} />,
  },
];

export default function WhyChooseUs() {
  const { t } = useTranslation('quranHome');
  const ref = useReveal();

  return (
    <section ref={ref} className="py-24 px-5 md:px-8 overflow-x-clip" style={{ backgroundColor: 'var(--t-bg-surface-low)' }}>
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-14">

        {/* Image */}
        <div className="reveal-right w-full md:w-5/12 order-2 md:order-1">
          <div className="rounded-[2.5rem] overflow-hidden shadow-2xl">
            <img
              src={studentTablet}
              alt={t('whyChooseUs.imageAlt')}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Features */}
        <div className="reveal-left w-full md:w-7/12 order-1 md:order-2">
          <h2 className="text-4xl font-black mb-12" style={{ color: 'var(--t-primary)' }}>
            {t('whyChooseUs.heading')}
          </h2>
          <div className="space-y-8">
            {FEATURE_ITEMS.map((f, i) => (
              <div
                key={f.key}
                className={`reveal reveal-d${i + 1} flex items-start gap-5 group`}
              >
                {/* Icon badge */}
                <div
                  className="p-3 rounded-2xl text-white shrink-0 transition-transform duration-300 group-hover:scale-110 shadow-md"
                  style={{ backgroundColor: 'var(--t-primary)' }}
                >
                  {f.icon}
                </div>
                <div>
                  <h4 className="text-xl font-black mb-1" style={{ color: 'var(--t-primary)' }}>
                    {t(`whyChooseUs.features.${f.key}.title`)}
                  </h4>
                  <p className="text-base leading-relaxed" style={{ color: 'var(--t-text-muted)' }}>
                    {t(`whyChooseUs.features.${f.key}.desc`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
