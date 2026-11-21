import { UserSearch, CalendarDays, PlayCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFormatters } from '../../i18n';
import { useReveal } from '../../hooks/useReveal';

const STEP_ITEMS = [
  {
    key: 'chooseTeacher',
    icon: <UserSearch size={28} />,
    number: 1,
  },
  {
    key: 'schedule',
    icon: <CalendarDays size={28} />,
    number: 2,
  },
  {
    key: 'startLearning',
    icon: <PlayCircle size={28} />,
    number: 3,
  },
];

export default function HowItWorks() {
  const { t } = useTranslation('quranHome');
  const { formatNumber } = useFormatters();
  const ref = useReveal();

  return (
    <section ref={ref} className="py-24 px-5 md:px-8" style={{ backgroundColor: 'var(--t-bg-page)' }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 reveal">
          <h2 className="text-4xl font-black mb-4" style={{ color: 'var(--t-primary)' }}>
            {t('howItWorks.heading')}
          </h2>
          <div className="w-16 h-1 mx-auto rounded-full" style={{ backgroundColor: 'var(--t-secondary)' }} />
        </div>

        {/* Steps */}
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Dashed connector line (desktop only) */}
          <div
            className="hidden md:block absolute top-10 inset-x-0 h-px border-t border-dashed"
            style={{ borderColor: 'rgba(207, 167, 103, 0.3)', zIndex: 0 }}
          />

          {STEP_ITEMS.map((s, i) => (
            <div
              key={s.key}
              className={`reveal reveal-d${i + 1} relative z-10 flex flex-col items-center text-center`}
            >
              {/* Step circle */}
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center shadow-md mb-6 border-2 relative"
                style={{
                  backgroundColor: 'var(--t-bg-card)',
                  borderColor: 'rgba(207, 167, 103, 0.35)',
                  color: 'var(--t-primary)',
                }}
              >
                {s.icon}
                {/* Step number badge */}
                <span
                  className="absolute -top-2 -start-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white"
                  style={{ backgroundColor: 'var(--t-secondary)' }}
                >
                  {formatNumber(s.number)}
                </span>
              </div>

              <h3 className="text-xl font-black mb-2" style={{ color: 'var(--t-primary)' }}>
                {t(`howItWorks.steps.${s.key}.title`)}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--t-text-muted)' }}>
                {t(`howItWorks.steps.${s.key}.desc`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
