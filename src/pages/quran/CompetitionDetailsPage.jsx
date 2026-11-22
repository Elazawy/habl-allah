import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Trophy, Calendar, Award, Clock, ShieldCheck, ChevronRight, XCircle, AlertTriangle, BookOpen, KeyRound } from 'lucide-react';
import QuranNav from './QuranNav';
import QuranFooter from './QuranFooter';
import {
  fetchCompetitionBySlug,
  fetchCompetitionStages,
} from '../../services/competitionsService';
import CompetitionRegistrationModal from './CompetitionRegistrationModal';
import CompetitionProgressLine from './CompetitionProgressLine';
import { useCompetitionRegistrationStatus } from '../../hooks/useCompetitionRegistrationStatus';
import { useAuth } from '../../context/AuthContext';
import StudentCompetitionCelebration from '../../components/StudentCompetitionCelebration';
import {
  LocalizedLink,
  DirectionalIcon,
  truncateMetaDescription,
  useFormatters,
  useLocalizedContent,
  usePageMeta,
} from '../../i18n';

function getLoadErrorKey(error) {
  if (error?.message?.includes('Supabase is not configured')) {
    return 'supabaseNotConfigured';
  }

  return 'generic';
}

function hasCompetitionStarted(dateStr) {
  if (!dateStr) return false;
  try {
    const date = dateStr.includes('T') ? new Date(dateStr) : new Date(dateStr + 'T00:00:00');
    return date <= new Date();
  } catch {
    return false;
  }
}

export default function CompetitionDetailsPage() {
  const { slug } = useParams();
  const { t } = useTranslation(['competitions', 'seo']);
  const { formatDate } = useFormatters();
  const { field, text, latinName, options, optionLabel } = useLocalizedContent();
  const [resource, setResource] = useState({ slug: null, competition: null, errorKey: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('apply');
  
  // Student data states
  const { isStudent, studentProfile } = useAuth();

  const [stages, setStages] = useState([]);

  // Guest participant state (no account — identified by a local token or
  // phone recovery). Only shown on this page, never the student dashboard.

  const loading = resource.slug !== slug;
  const competition = resource.slug === slug ? resource.competition : null;
  const errorKey = resource.slug === slug ? resource.errorKey : '';
  const error = errorKey ? t(`details.errors.${errorKey}`) : '';
  const { getCompetitionRegistrationState, markCompetitionRequestPending, loadingSubscriptions, participants } = useCompetitionRegistrationStatus();
  const guestParticipant = participants.get(competition?.id) ?? null;

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
    if (!competition || loadingSubscriptions || window.location.hash !== '#progress') return;
    document.getElementById('progress')?.scrollIntoView({ block: 'start' });
  }, [competition, loadingSubscriptions]);

  useEffect(() => {
    let active = true;

    const loadCompetition = async () => {
      try {
        const data = await fetchCompetitionBySlug(slug);
        if (!active) return;

        setResource({ slug, competition: data, errorKey: '' });
      } catch (err) {
        console.error(err);
        if (!active) return;

        setResource({ slug, competition: null, errorKey: getLoadErrorKey(err) });
      }
    };

    loadCompetition();

    return () => {
      active = false;
    };
  }, [slug]);

  // Load personalized data: stages for everyone, signed-in student state,
  // and guest participant state from the locally saved token.
  useEffect(() => {
    let active = true;
    
    async function loadPersonalizedData() {
      if (!competition?.id) return;

      try {
        // Fetch stages unconditionally if competition is loaded
        const stagesData = await fetchCompetitionStages(competition.id);
        if (!active) return;
        setStages(stagesData || []);
      } catch (err) {
        console.error('Failed to load stages', err);
      }

    }

    loadPersonalizedData();
    return () => { active = false; };
  }, [competition?.id, isStudent, loadingSubscriptions]);

  const compNameText = competition ? text(competition, 'name') : '';
  const compDescriptionText = competition
    ? text(competition, 'short_description') || text(competition, 'complete_description')
    : '';

  usePageMeta({
    title: compNameText
      ? t('seo:templates.competitionDetailTitle', { name: compNameText })
      : errorKey
        ? t('details.pageTitleError')
        : undefined,
    description: compDescriptionText
      ? truncateMetaDescription(compDescriptionText)
      : undefined,
  });

  const refreshGuestParticipant = async () => {
    await markCompetitionRequestPending();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--t-bg-page)', color: 'var(--t-text)' }}>
        <QuranNav />
        <div className="flex-grow flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-sm font-semibold" style={{ color: 'var(--t-text-muted)' }}>{t('details.loading')}</p>
        </div>
        <QuranFooter />
      </div>
    );
  }

  if (!competition) {
    if (error) {
      return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--t-bg-page)', color: 'var(--t-text)' }}>
          <QuranNav />
          <div className="flex-grow flex flex-col items-center justify-center py-20 px-4 text-center">
            <Trophy size={48} className="text-red-500 mb-4 opacity-40" />
            <h2 className="text-2xl font-black mb-2" style={{ color: 'var(--t-primary)' }}>{t('details.errorHeading')}</h2>
            <p style={{ color: 'var(--t-text-muted)', marginBottom: '1.5rem' }}>{error}</p>
            <LocalizedLink
              to="/quran/competitions"
              className="py-3 px-6 rounded-xl font-bold text-white text-sm"
              style={{ backgroundColor: 'var(--t-primary)' }}
            >
              {t('details.backToCompetitions')}
            </LocalizedLink>
          </div>
          <QuranFooter />
        </div>
      );
    }

    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--t-bg-page)', color: 'var(--t-text)' }}>
        <QuranNav />
        <div className="flex-grow flex flex-col items-center justify-center py-20 px-4 text-center">
          <Trophy size={48} className="text-red-500 mb-4 opacity-40" />
          <h2 className="text-2xl font-black mb-2" style={{ color: 'var(--t-primary)' }}>{t('details.notFoundHeading')}</h2>
          <p style={{ color: 'var(--t-text-muted)', marginBottom: '1.5rem' }}>{t('details.notFoundDescription')}</p>
          <LocalizedLink
            to="/quran/competitions"
            className="py-3 px-6 rounded-xl font-bold text-white text-sm"
            style={{ backgroundColor: 'var(--t-primary)' }}
          >
            {t('details.backToCompetitions')}
          </LocalizedLink>
        </div>
        <QuranFooter />
      </div>
    );
  }

  const registrationState = getCompetitionRegistrationState(competition);
  const isStudentSubscribed = Boolean(
    isStudent && registrationState.reason === 'subscribed'
  );
  const isCompetitionStarted = hasCompetitionStarted(competition.start_date);
  const hideDates = isCompetitionStarted && isStudentSubscribed;

  // Shared lookup already prioritizes the current account over device tokens.
  const activeGuest = guestParticipant;

  // ── Guest status helpers (defined before first use in registrationHint) ──
  const guestStageName = (stageId) => {
    const stage = stages.find((s) => s.id === stageId);
    return stage ? text(stage, 'name') : '';
  };

  function guestStatusHint(guest) {
    if (guest.status === 'pending') return t('details.guestStatus.pendingHint');
    if (guest.status === 'rejected') return t('details.guestStatus.rejectedHint');
    if (guest.status === 'accepted' || guest.status === 'active') {
      const stageName = guestStageName(guest.current_stage_id);
      return stageName
        ? t('details.guestStatus.currentStage', { stageName })
        : t('details.guestStatus.acceptedHint');
    }
    if (guest.status === 'failed') {
      const stageName = guestStageName(guest.current_stage_id);
      return stageName
        ? t('details.guestStatus.failedStage', { stageName })
        : t('details.guestStatus.failedHint');
    }
    if (guest.status === 'completed') return t('details.guestStatus.completedHint');
    return '';
  }

  const hasRequestedOrAccepted = (
    registrationState.reason === 'pending' ||
    registrationState.reason === 'subscribed' ||
    Boolean(activeGuest)
  );

  const registrationHint = activeGuest
      ? guestStatusHint(activeGuest)
      : registrationState.reason === 'pending'
        ? t('details.guestStatus.pendingHint')
        : registrationState.reason === 'closed'
          ? t('details.registrationClosedHint')
          : registrationState.reason === 'loading'
            ? t('details.registrationLoadingHint')
            : t('details.registrationPromptHint');

  // Progress line status: personalized for guests with a real stage position,
  // dimmed/neutral for pending or accepted-without-stages, preview otherwise.
  const isPersonalizedStageStatus = (status) => status === 'active' || status === 'failed' || status === 'completed';

  let progressStatus = 'preview';
  let progressCurrentStageId = null;
  if (activeGuest) {
    progressStatus = activeGuest.status === 'accepted' ? 'preview' : activeGuest.status;
    if (isPersonalizedStageStatus(activeGuest.status)) {
      progressCurrentStageId = activeGuest.current_stage_id;
    }
  } else if (registrationState.reason === 'pending') {
    progressStatus = 'pending';
  }

  // CTA overrides for guest states (the shared hook only knows signed-in state).
  const guestButtonState = activeGuest
    ? {
        pending: { disabled: true, label: t('registrationState.pending') },
        rejected: { disabled: true, label: t('details.guestButton.rejected') },
        accepted: { disabled: true, label: t('registrationState.subscribed') },
        active: { disabled: true, label: t('registrationState.subscribed') },
        failed: { disabled: true, label: t('registrationState.subscribed') },
        completed: { disabled: true, label: t('registrationState.subscribed') },
      }[activeGuest.status] ?? null
    : null;

  const renderGuestStatusCard = () => {
    if (!activeGuest) return null;

    if (activeGuest.status === 'pending') {
      return (
        <div className="mb-8 p-6 rounded-2xl border flex items-start gap-4 shadow-sm" style={{ backgroundColor: 'var(--t-bg-surface-low)', borderColor: 'var(--t-border-gold)' }}>
          <Clock className="text-amber-500 mt-1 shrink-0" size={28} />
          <div>
            <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--t-primary)' }}>{t('details.guestStatus.pendingTitle')}</h3>
            <p className="text-sm" style={{ color: 'var(--t-text-muted)' }}>
              {t('details.guestStatus.pendingHint')}
            </p>
          </div>
        </div>
      );
    }

    if (activeGuest.status === 'rejected') {
      return (
        <div className="mb-8 p-6 rounded-2xl border flex items-start gap-4 shadow-sm" style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
          <AlertTriangle className="text-amber-500 mt-1 shrink-0" size={28} />
          <div>
            <h3 className="font-bold text-amber-800 text-lg mb-1">{t('details.guestStatus.rejectedTitle')}</h3>
            <p className="text-amber-700 text-sm leading-relaxed">
              {t('details.guestStatus.rejectedHint')}
            </p>
          </div>
        </div>
      );
    }

    if (activeGuest.status === 'accepted' || activeGuest.status === 'active') {
      const currentStageName = guestStageName(activeGuest.current_stage_id);
      return (
        <div className="mb-8 p-6 rounded-2xl border shadow-sm relative overflow-hidden" style={{ backgroundColor: 'var(--t-primary-light)', borderColor: 'var(--t-primary)' }}>
          <div className="absolute top-0 end-0 w-2 h-full" style={{ backgroundColor: 'var(--t-primary)' }}></div>
          <div className="flex items-start gap-3">
            <BookOpen className="mt-1 shrink-0" style={{ color: 'var(--t-primary)' }} size={28} />
            <div>
              <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--t-primary)' }}>{t('details.guestStatus.acceptedTitle')}</h3>
              <p className="text-sm font-semibold" style={{ color: 'var(--t-primary)' }}>
                {currentStageName
                  ? t('details.guestStatus.currentStage', { stageName: currentStageName })
                  : t('details.guestStatus.acceptedHint')}
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (activeGuest.status === 'failed') {
      const failedStageName = guestStageName(activeGuest.current_stage_id);
      return (
        <div className="mb-8 p-6 rounded-2xl border flex items-start gap-4 shadow-sm" style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca' }}>
          <XCircle className="text-red-500 mt-1 shrink-0" size={28} />
          <div>
            <h3 className="font-bold text-red-800 text-lg mb-1">
              {failedStageName
                ? t('details.guestStatus.failedStage', { stageName: failedStageName })
                : t('details.guestStatus.failedTitle')}
            </h3>
            <p className="text-red-700 text-sm leading-relaxed">
              {t('details.guestStatus.failedDescription')}
            </p>
          </div>
        </div>
      );
    }

    if (activeGuest.status === 'completed') {
      const compResolved = field(competition, 'name');
      const levelResolved = activeGuest.level
        ? optionLabel(competition, 'available_levels', activeGuest.level)
        : null;
      return (
        <div className="mb-8">
          <StudentCompetitionCelebration
            studentName={activeGuest.student_name || t('details.celebrationFallbacks.participant')}
            competitionName={compResolved.text || t('details.celebrationFallbacks.competition')}
            competitionNameDir={compResolved.text ? compResolved.dir : undefined}
            level={levelResolved?.text || t('details.celebrationFallbacks.level')}
            levelDir={levelResolved?.text ? levelResolved.dir : undefined}
            finalRank={activeGuest.final_rank || 1}
            teacherName={isStudent && studentProfile?.teachers ? latinName(studentProfile.teachers, 'name').text : ''}
          />
        </div>
      );
    }

    return null;
  };

  const openApplyModal = () => {
    setModalMode('apply');
    setModalOpen(true);
  };

  const openRecoverModal = () => {
    setModalMode('recover');
    setModalOpen(true);
  };

  const compName = field(competition, 'name');
  const completeDescription = field(competition, 'complete_description');
  const awardsCompleteDescription = field(competition, 'awards_complete_description');
  const participationTerms = field(competition, 'participation_terms');
  const levelOptions = options(competition, 'available_levels');

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300" style={{ backgroundColor: 'var(--t-bg-page)', color: 'var(--t-text)' }}>
      <QuranNav />

      {/* Main Body */}
      <main className="flex-grow py-12 px-5 md:px-8 relative">
        <div className="geometric-bg opacity-15"></div>
        <div className="max-w-4xl mx-auto relative z-10">
          
          {/* Back button */}
          <LocalizedLink
            to="/quran/competitions"
            className="inline-flex items-center gap-2 font-bold text-xs mb-8 transition-colors hover:text-amber-500"
            style={{ color: 'var(--t-text-muted)' }}
          >
            <DirectionalIcon icon={ChevronRight} flipIn="ltr" size={16} />
            <span>{t('details.backToAllCompetitions')}</span>
          </LocalizedLink>

          {/* Majlis Concept Details (First Design) */}
          <div className="rounded-3xl border p-8 md:p-12 relative overflow-hidden"
            style={{
              backgroundColor: 'var(--t-bg-card)',
              borderColor: 'var(--t-border-gold)',
              boxShadow: '0 15px 40px var(--t-shadow-card)',
            }}>
            <div className="pattern-overlay-gold absolute inset-0 opacity-[0.02] pointer-events-none" />
            
            {/* Header */}
            <div className="border-b pb-8 mb-8" style={{ borderColor: 'var(--t-border)' }}>
              <h1 dir={compName.dir} className={`text-2xl md:text-3xl leading-snug font-black ${hideDates ? 'mb-0' : 'mb-4'}`} style={{ color: 'var(--t-primary)' }}>
                {compName.text}
              </h1>
              
              {/* Dates Panel */}
              {!hideDates && (
                <div className="flex flex-wrap gap-6 text-sm font-semibold" style={{ color: 'var(--t-text-muted)' }}>
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-amber-500" />
                    <span>{t('details.startDate', { date: formatCompetitionDate(competition.start_date) })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-amber-500" />
                    <span>{t('details.registrationDeadline', { date: formatCompetitionDate(competition.registration_deadline) })}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Progress Line — generic preview for visitors, personalized
                for pending/active/failed/completed participants. */}
            <section id="progress" className="scroll-mt-6" aria-label={t('details.progressAriaLabel')}>
            {stages.length > 0 && (
              <CompetitionProgressLine
                stages={stages}
                currentStageId={progressCurrentStageId}
                status={progressStatus}
              />
            )}

            {/* Status Card */}
            {renderGuestStatusCard()}
            </section>

            {/* Descriptions & Details */}
            <div className="space-y-8">
              <div>
                <h2 className="text-lg md:text-xl font-black mb-3" style={{ color: 'var(--t-primary)' }}>{t('details.aboutTitle')}</h2>
                <p dir={completeDescription.dir} className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--t-text-muted)' }}>
                  {completeDescription.text}
                </p>
              </div>

              {/* Competition Levels */}
              {levelOptions.length > 0 && (
                <div className="p-6 rounded-2xl border" style={{ backgroundColor: 'var(--t-bg-surface-low)', borderColor: 'var(--t-border-gold)' }}>
                  <h2 className="text-lg md:text-xl font-black mb-3 flex items-center gap-2" style={{ color: 'var(--t-primary)' }}>
                    <Trophy size={20} className="text-amber-500" />
                    <span>{t('details.levelsTitle')}</span>
                  </h2>
                  <div className="flex flex-wrap gap-2.5 mt-2">
                    {levelOptions.map((opt) => (
                      <span
                        key={opt.value}
                        dir={opt.dir}
                        className="text-xs font-bold px-4.5 py-2.5 rounded-xl border transition-all duration-300 hover:scale-105"
                        style={{
                          backgroundColor: 'var(--t-bg-card)',
                          borderColor: 'var(--t-border)',
                          color: 'var(--t-primary)',
                          boxShadow: '0 4px 12px var(--t-shadow-card)',
                        }}
                      >
                        {opt.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Conditional Awards rendering */}
              {awardsCompleteDescription.text && (
                <div className="p-6 rounded-2xl border" style={{ backgroundColor: 'var(--t-bg-surface-low)', borderColor: 'var(--t-border-gold)' }}>
                  <h2 className="text-lg md:text-xl font-black mb-3 flex items-center gap-2" style={{ color: 'var(--t-secondary)' }}>
                    <Award size={20} />
                    <span>{t('details.awardsTitle')}</span>
                  </h2>
                  <p dir={awardsCompleteDescription.dir} className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--t-text-muted)' }}>
                    {awardsCompleteDescription.text}
                  </p>
                </div>
              )}

              <div>
                <h2 className="text-lg md:text-xl font-black mb-3 flex items-center gap-2" style={{ color: 'var(--t-primary)' }}>
                  <ShieldCheck size={20} className="text-amber-500" />
                  <span>{t('details.termsTitle')}</span>
                </h2>
                <p dir={participationTerms.dir} className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--t-text-muted)' }}>
                  {participationTerms.text}
                </p>
              </div>
            </div>

            {/* CTA Panel */}
            <div className="mt-12 pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-6" style={{ borderColor: 'var(--t-border)' }}>
              <div>
                {!hasRequestedOrAccepted && (
                  <h4 className="font-black text-sm mb-1">{t('details.readyToJoinTitle')}</h4>
                )}
                <p className={hasRequestedOrAccepted ? "text-sm font-semibold" : "text-xs"} style={{ color: hasRequestedOrAccepted ? 'var(--t-primary)' : 'var(--t-text-muted)' }}>
                  {registrationHint}
                </p>
              </div>
              <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {activeGuest?.status === 'pending' && (
                  <button
                    onClick={refreshGuestParticipant}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-2xl font-bold text-center transition-all duration-300 hover:opacity-95 border"
                    style={{ borderColor: 'var(--t-border-gold)', color: 'var(--t-primary)' }}
                  >
                    {t('details.refreshStatus')}
                  </button>
                )}
                {!activeGuest && !isStudentSubscribed && (
                  <button
                    onClick={openRecoverModal}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-2xl font-bold text-center transition-all duration-300 hover:opacity-95 border flex items-center justify-center gap-2"
                    style={{ borderColor: 'var(--t-border-gold)', color: 'var(--t-primary)' }}
                  >
                    <KeyRound size={16} />
                    <span>{t('registrationState.subscribed')}</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    if (!registrationState.disabled && !guestButtonState) {
                      openApplyModal();
                    }
                  }}
                  disabled={registrationState.disabled || Boolean(guestButtonState?.disabled)}
                  className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl font-bold text-white text-center transition-all duration-300 disabled:cursor-not-allowed ${registrationState.reason === 'available' && !guestButtonState ? 'hover:opacity-95 hover:shadow-md' : ''} ${registrationState.reason === 'closed' || registrationState.reason === 'loading' ? 'disabled:opacity-50' : ''}`}
                  style={{ backgroundColor: registrationState.reason === 'subscribed' ? 'var(--t-primary)' : 'var(--t-secondary)' }}
                >
                  {guestButtonState?.label ?? registrationState.label}
                </button>
              </div>
            </div>
          </div>

        </div>
      </main>

      {modalOpen && competition && (
        <CompetitionRegistrationModal
          competition={competition}
          initialMode={modalMode}
          onSubmitted={() => {
            refreshGuestParticipant();
          }}
          onClose={() => setModalOpen(false)}
        />
      )}

      <QuranFooter />
    </div>
  );
}
