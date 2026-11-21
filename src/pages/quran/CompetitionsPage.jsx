import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, Calendar, Award, Clock, Sparkles } from 'lucide-react';
import QuranNav from './QuranNav';
import QuranFooter from './QuranFooter';
import { fetchPublishedCompetitions } from '../../services/competitionsService';
import CompetitionRegistrationModal from './CompetitionRegistrationModal';
import { useCompetitionRegistrationStatus } from '../../hooks/useCompetitionRegistrationStatus';
import { LocalizedLink, useFormatters, useLocalizedContent } from '../../i18n';

function getLoadErrorKey(error) {
  if (error?.message?.includes('Supabase is not configured')) {
    return 'supabaseNotConfigured';
  }

  return 'generic';
}

export default function CompetitionsPage() {
  const { t } = useTranslation('competitions');
  const { formatDate } = useFormatters();
  const { field } = useLocalizedContent();
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorKey, setErrorKey] = useState('');
  const [selectedComp, setSelectedComp] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
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
        console.error(err);
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

  // Update HTML Page Title
  useEffect(() => {
    document.title = t('list.pageTitle');
  }, [t]);

  const error = errorKey ? t(`list.errors.${errorKey}`) : '';

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300" style={{ backgroundColor: 'var(--t-bg-page)', color: 'var(--t-text)' }}>
      <QuranNav />

      {/* Main Content Area */}
      <main className="flex-grow py-16 px-5 md:px-8 relative">
        <div className="geometric-bg opacity-25"></div>
        <div className="max-w-6xl mx-auto relative z-10">
          
          {/* Header */}
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <span className="px-4 py-1.5 rounded-full text-xs font-black tracking-wide uppercase inline-flex items-center gap-1.5 mb-4 border"
              style={{ 
                color: 'var(--t-secondary)', 
                borderColor: 'var(--t-border-gold)',
                backgroundColor: 'var(--t-primary-light)'
              }}>
              <Sparkles size={12} className="animate-spin-slow" />
              {t('list.badge')}
            </span>
            <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight" style={{ color: 'var(--t-primary)' }}>
              {t('list.title')}
            </h1>
            <p className="text-base leading-relaxed" style={{ color: 'var(--t-text-muted)' }}>
              {t('list.subtitle')}
            </p>
          </div>

          {/* States */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-sm font-semibold" style={{ color: 'var(--t-text-muted)' }}>{t('list.loading')}</p>
            </div>
          ) : error ? (
            <div className="text-center py-20 border rounded-3xl" style={{ backgroundColor: 'var(--t-bg-card)', borderColor: 'var(--t-border)' }}>
              <Trophy size={48} className="mx-auto mb-4 opacity-40 text-amber-500" />
              <h3 className="text-xl font-bold mb-2">{t('list.errorHeading')}</h3>
              <p style={{ color: 'var(--t-text-muted)' }}>{error}</p>
            </div>
          ) : competitions.length === 0 ? (
            <div className="text-center py-20 border rounded-3xl" style={{ backgroundColor: 'var(--t-bg-card)', borderColor: 'var(--t-border)' }}>
              <Trophy size={48} className="mx-auto mb-4 opacity-40 text-amber-500" />
              <h3 className="text-xl font-bold mb-2">{t('list.emptyHeading')}</h3>
              <p style={{ color: 'var(--t-text-muted)' }}>{t('list.emptyDescription')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {competitions.map((c) => {
                const registrationState = getCompetitionRegistrationState(c);
                const compName = field(c, 'name');
                const shortDescription = field(c, 'short_description');
                const awardsShortDescription = field(c, 'awards_short_description');

                return (
                  <div
                    key={c.id}
                    className="rounded-3xl p-8 border flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:-translate-y-1 relative overflow-hidden"
                    style={{
                      backgroundColor: 'var(--t-bg-card)',
                      borderColor: 'var(--t-border-gold)',
                      boxShadow: '0 10px 30px var(--t-shadow-card)',
                    }}
                  >
                    {/* Decorative elements */}
                    <div className="pattern-overlay-gold absolute inset-0 opacity-[0.03] pointer-events-none" />
                    
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: 'var(--t-primary)' }}>
                          <Trophy size={24} />
                        </div>
                        <span className="text-xs font-bold px-3 py-1 rounded-full border border-emerald-800/10 text-emerald-800 dark:text-emerald-300 dark:border-emerald-300/15" style={{ backgroundColor: 'var(--t-primary-light)' }}>
                          {t('list.statusActive')}
                        </span>
                      </div>

                      <LocalizedLink to={`/quran/competition/${c.slug}`} className="block group mb-3">
                        <h3 dir={compName.dir} className="text-xl font-black tracking-tight transition-colors duration-200 group-hover:text-amber-500" style={{ color: 'var(--t-primary)' }}>
                          {compName.text}
                        </h3>
                      </LocalizedLink>
                      
                      <p dir={shortDescription.dir} className="text-sm leading-relaxed mb-6" style={{ color: 'var(--t-text-muted)' }}>
                        {shortDescription.text}
                      </p>

                      <div className="space-y-3 mb-8 border-t border-b py-4" style={{ borderColor: 'var(--t-border)' }}>
                        <div className="flex items-center gap-2.5 text-xs font-bold" style={{ color: 'var(--t-primary)' }}>
                          <Calendar size={14} className="text-amber-500" />
                          <span>{t('list.startDate', { date: formatCompetitionDate(c.start_date) })}</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-xs font-bold" style={{ color: 'var(--t-primary)' }}>
                          <Clock size={14} className="text-amber-500" />
                          <span>{t('list.registrationEnds', { date: formatCompetitionDate(c.registration_deadline) })}</span>
                        </div>
                        {awardsShortDescription.text && (
                          <div className="flex items-center gap-2.5 text-xs font-bold" style={{ color: 'var(--t-secondary)' }}>
                            <Award size={14} />
                            <span dir={awardsShortDescription.dir}>{awardsShortDescription.text}</span>
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
                        {registrationState.reason === 'subscribed' ? t('list.actions.trackProgress') : t('list.actions.details')}
                      </LocalizedLink>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </main>

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

      <QuranFooter />
    </div>
  );
}
