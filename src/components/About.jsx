import { Eye, Send, Award } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function InfoBlock({ icon: Icon, title, text }) {
  return (
    <div
      className="flex gap-4 p-5 rounded-2xl border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
      style={{
        backgroundColor: 'var(--t-bg-card)',
        borderColor: 'var(--t-border)',
      }}
    >
      <div
        className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center mt-0.5"
        style={{ backgroundColor: 'var(--t-primary-light)' }}
      >
        <Icon size={20} style={{ color: 'var(--t-primary)' }} />
      </div>
      <div>
        <h4 className="font-bold text-base mb-1" style={{ color: 'var(--t-primary)' }}>{title}</h4>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--t-text-muted)' }}>{text}</p>
      </div>
    </div>
  );
}

export default function About() {
  const { t } = useTranslation('home');

  return (
    <section id="about" className="py-24 px-6" style={{ backgroundColor: 'var(--t-bg-card)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span
            className="inline-block text-sm font-semibold px-4 py-1.5 rounded-full"
            style={{ backgroundColor: 'var(--t-primary-light)', color: 'var(--t-primary)' }}
          >
            {t('about.badge')}
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Start: Text */}
          <div className="space-y-8">
            <div>
              <h2 className="text-4xl font-black leading-tight mb-5" style={{ color: 'var(--t-primary)' }}>
                {t('about.heading')}
              </h2>
              <p className="text-lg leading-relaxed" style={{ color: 'var(--t-text-muted)' }}>
                {t('about.description')}
              </p>
            </div>
            <div className="space-y-4">
              <InfoBlock
                icon={Eye}
                title={t('about.visionTitle')}
                text={t('about.visionText')}
              />
              <InfoBlock
                icon={Send}
                title={t('about.missionTitle')}
                text={t('about.missionText')}
              />
            </div>
          </div>

          {/* End: Image + Badges */}
          <div className="relative flex items-center justify-center">
            <div
              className="absolute inset-0 m-auto w-[90%] h-[90%] rounded-3xl rotate-3 pointer-events-none"
              style={{ background: 'linear-gradient(to bottom right, var(--t-primary-light), var(--t-bg-surface-low))' }}
            />

            <div className="relative z-10 w-full aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950 flex flex-col items-center justify-center gap-4">
                <div className="text-center">
                  <div className="mb-4 flex justify-center">
                    <div className="relative">
                      <div className="w-24 h-32 bg-amber-400/20 border-2 border-amber-400/40 rounded-lg flex items-center justify-center">
                        <div className="text-center" dir="rtl" lang="ar">
                          <div className="text-amber-300 text-3xl mb-1">{t('about.mushafTitle_ar')}</div>
                          <div className="w-12 h-px bg-amber-400/60 mx-auto mb-1" />
                          <div className="text-amber-200/60 text-xs">{t('about.mushafSubtitle_ar')}</div>
                        </div>
                      </div>
                      <div className="absolute inset-y-0 right-0 w-3 bg-amber-500/30 rounded-r-lg border-r border-amber-400/30" />
                    </div>
                  </div>
                  <p className="text-emerald-200/60 text-sm font-light">{t('about.mushafCaption')}</p>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/60 via-transparent to-transparent" />
            </div>

            {/* Gold badge */}
            <div className="absolute -bottom-6 -start-6 z-20 bg-gradient-to-br from-amber-400 to-amber-500 rounded-2xl px-6 py-5 shadow-xl shadow-amber-400/30 text-center min-w-[130px]">
              <Award size={22} className="text-amber-900 mx-auto mb-1" />
              <div className="text-3xl font-black text-amber-900 leading-none">{t('about.yearsValue')}</div>
              <div className="text-amber-900/80 text-xs font-semibold mt-1">{t('about.yearsLabel')}</div>
            </div>

            {/* Secondary badge */}
            <div
              className="absolute -top-4 -end-4 z-20 rounded-xl px-4 py-3 shadow-lg text-center border"
              style={{
                backgroundColor: 'var(--t-bg-card)',
                borderColor: 'var(--t-border)',
              }}
            >
              <div className="font-black text-xl leading-none" style={{ color: 'var(--t-primary)' }}>
                {t('about.satisfactionValue')}
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--t-text-subtle)' }}>
                {t('about.satisfactionLabel')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
