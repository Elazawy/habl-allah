import { useState, useEffect } from 'react';
import { Trophy, Calendar, Award, ArrowRight, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DirectionalIcon, LocalizedLink, useFormatters } from '../../i18n';
import { useReveal } from '../../hooks/useReveal';
import { useCompetitionRegistrationStatus } from '../../hooks/useCompetitionRegistrationStatus';
import { fetchPublishedCompetitions } from '../../services/competitionsService';
import CompetitionRegistrationModal from './CompetitionRegistrationModal';

function getLoadErrorKey(error) {
  if (error?.message?.includes('Supabase is not configured')) {
    return 'configMissing';
  }

  return 'loadFailed';
}

export default function Competitions() {
  const { t } = useTranslation('competitionsShared');
  const { formatDate } = useFormatters();
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorKey, setErrorKey] = useState('');
  const [selectedComp, setSelectedComp] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const ref = useReveal({}, [loading, competitions.length, errorKey]);
  const { getCompetitionRegistrationState, markCompetitionRequestPending } = useCompetitionRegistrationStatus();

  const formatCompetitionDate = (dateStr) => {
    if (!dateStr) return '';
    const formatted = formatDate(`${dateStr}T00:00:00`, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return formatted || dateStr;
  };

  useEffect(() => {
    let active = true;

    const loadCompetitions = async () => {
      try {
        const data = await fetchPublishedCompetitions();
        if (!active) return;

        setCompetitions(data);
        setErrorKey('');
      } catch (err) {
        console.error('Error fetching competitions:', err);
        if (!active) return;

        setCompetitions([]);
        setErrorKey(getLoadErrorKey(err));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadCompetitions();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <section className="py-24 px-5 md:px-8 text-center" style={{ backgroundColor: 'var(--t-bg-surface-low)' }}>
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p style={{ color: 'var(--t-text-muted)' }}>{t('section.loading')}</p>
      </section>
    );
  }

  // Hide cleanly if no published competitions
  if (competitions.length === 0) {
    if (errorKey) {
      return (
        <section className="py-24 px-5 md:px-8 text-center" style={{ backgroundColor: 'var(--t-bg-surface-low)' }}>
          <div className="max-w-3xl mx-auto rounded-3xl border px-6 py-10" style={{ backgroundColor: 'var(--t-bg-card)', borderColor: 'var(--t-border)' }}>
            <Trophy size={40} className="mx-auto mb-4 text-amber-500 opacity-50" />
            <h2 className="text-2xl font-black mb-3" style={{ color: 'var(--t-primary)' }}>{t('section.heading')}</h2>
            <p style={{ color: 'var(--t-text-muted)' }}>{t(`errors.${errorKey}`)}</p>
          </div>
        </section>
      );
    }

    return null;
  }

  return (
    <section ref={ref} id="competitions" className="py-24 px-5 md:px-8" style={{ backgroundColor: 'var(--t-bg-surface-low)' }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4 reveal">
          <div>
            <h2 className="text-4xl font-black mb-3" style={{ color: 'var(--t-primary)' }}>
              {t('section.heading')}
            </h2>
            <p className="text-base" style={{ color: 'var(--t-text-muted)' }}>
              {t('section.subtitle')}
            </p>
          </div>
          <LocalizedLink
            to="/quran/competitions"
            className="inline-flex items-center gap-2 font-bold text-sm transition-all duration-300 hover:gap-3"
            style={{ color: 'var(--t-secondary)' }}
          >
            <span>{t('section.viewAll')}</span>
            <DirectionalIcon icon={ArrowRight} size={16} />
          </LocalizedLink>
        </div>

        {/* Competitions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {competitions.slice(0, 2).map((c, i) => {
            const registrationState = getCompetitionRegistrationState(c);

            return (
              <div
                key={c.id}
                className={`reveal reveal-d${i + 1} rounded-3xl p-8 border flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:-translate-y-1 relative overflow-hidden`}
                style={{
                  backgroundColor: 'var(--t-bg-card)',
                  borderColor: 'var(--t-border-gold)',
                  boxShadow: '0 10px 30px var(--t-shadow-card)',
                }}
              >
                <div className="pattern-overlay-gold absolute inset-0 opacity-[0.03] pointer-events-none" />

                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: 'var(--t-primary)' }}>
                      <Trophy size={24} />
                    </div>
                    <span className="text-xs font-bold px-3 py-1 rounded-full border border-emerald-800/10 text-emerald-800 dark:text-emerald-300 dark:border-emerald-300/15" style={{ backgroundColor: 'var(--t-primary-light)' }}>
                      {t('card.activeBadge')}
                    </span>
                  </div>

                  <LocalizedLink to={`/quran/competition/${c.slug}`} className="block group mb-3">
                    <h3 dir="auto" className="text-xl font-black tracking-tight transition-colors duration-200 group-hover:text-amber-500" style={{ color: 'var(--t-primary)' }}>
                      {c.name}
                    </h3>
                  </LocalizedLink>

                  <p dir="auto" className="text-sm leading-relaxed mb-6" style={{ color: 'var(--t-text-muted)' }}>
                    {c.short_description}
                  </p>

                  <div className="space-y-3 mb-8 border-t border-b py-4" style={{ borderColor: 'var(--t-border)' }}>
                    <div className="flex items-center gap-2.5 text-xs font-bold" style={{ color: 'var(--t-primary)' }}>
                      <Calendar size={14} className="text-amber-500" />
                      <span>{t('card.startDate', { date: formatCompetitionDate(c.start_date) })}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs font-bold" style={{ color: 'var(--t-primary)' }}>
                      <Clock size={14} className="text-amber-500" />
                      <span>{t('card.registrationDeadline', { date: formatCompetitionDate(c.registration_deadline) })}</span>
                    </div>
                    {c.awards_short_description && (
                      <div className="flex items-center gap-2.5 text-xs font-bold" style={{ color: 'var(--t-secondary)' }}>
                        <Award size={14} />
                        <span dir="auto">{c.awards_short_description}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      if (!registrationState.disabled) {
                        setSelectedComp(c);
                        setModalOpen(true);
                      }
                    }}
                    disabled={registrationState.disabled}
                    className={`flex-1 py-3 rounded-xl text-center font-bold text-white text-xs transition-all duration-300 disabled:cursor-not-allowed ${registrationState.reason === 'available' ? 'hover:opacity-95 hover:shadow-md' : ''} ${registrationState.reason === 'closed' || registrationState.reason === 'loading' ? 'disabled:opacity-50' : ''}`}
                    style={{ backgroundColor: registrationState.reason === 'subscribed' ? 'var(--t-primary)' : 'var(--t-secondary)' }}
                  >
                    {registrationState.label}
                  </button>
                  <LocalizedLink
                    to={`/quran/competition/${c.slug}${registrationState.reason === 'subscribed' ? '#progress' : ''}`}
                    className="px-4 py-3 rounded-xl text-center font-bold text-xs border transition-all duration-300 hover:bg-gray-50 dark:hover:bg-zinc-800"
                    style={{
                      color: 'var(--t-text)',
                      borderColor: 'var(--t-border)',
                    }}
                  >
                    {registrationState.reason === 'subscribed' ? t('card.trackProgress') : t('card.details')}
                  </LocalizedLink>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {modalOpen && selectedComp && (
        <CompetitionRegistrationModal
          competition={selectedComp}
          onSubmitted={() => {
            markCompetitionRequestPending(selectedComp.id);
          }}
          onClose={() => {
            setModalOpen(false);
            setSelectedComp(null);
          }}
        />
      )}
    </section>
  );
}
