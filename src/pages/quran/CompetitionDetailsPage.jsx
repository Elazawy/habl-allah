import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Trophy, Calendar, Award, Clock, ShieldCheck, ChevronRight, XCircle, AlertTriangle, CheckCircle, BookOpen } from 'lucide-react';
import QuranNav from './QuranNav';
import QuranFooter from './QuranFooter';
import { fetchCompetitionBySlug, fetchCompetitionStages, fetchMyStageAssignment, fetchMyRejectedRequest } from '../../services/competitionsService';
import CompetitionRegistrationModal from './CompetitionRegistrationModal';
import { useCompetitionRegistrationStatus } from '../../hooks/useCompetitionRegistrationStatus';
import { useAuth } from '../../context/AuthContext';
import StudentCompetitionCelebration from '../../components/StudentCompetitionCelebration';

function getLoadErrorMessage(error) {
  if (error?.message?.includes('Supabase is not configured')) {
    return 'تعذر تحميل تفاصيل المسابقة حالياً لأن إعدادات قاعدة البيانات غير مكتملة.';
  }

  return 'تعذر تحميل تفاصيل المسابقة حالياً. يرجى المحاولة مرة أخرى لاحقاً.';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('ar-EG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function CompetitionDetailsPage() {
  const { slug } = useParams();
  const [resource, setResource] = useState({ slug: null, competition: null, error: '' });
  const [modalOpen, setModalOpen] = useState(false);
  
  // Student data states
  const { user, isStudent, studentProfile } = useAuth();

  const [stages, setStages] = useState([]);
  const [stageAssignment, setStageAssignment] = useState(null);
  const [rejectedRequest, setRejectedRequest] = useState(null);
  const [studentDataLoading, setStudentDataLoading] = useState(false);

  const loading = resource.slug !== slug;
  const competition = resource.slug === slug ? resource.competition : null;
  const error = resource.slug === slug ? resource.error : '';
  const { getCompetitionRegistrationState, markCompetitionRequestPending, loadingSubscriptions } = useCompetitionRegistrationStatus();

  useEffect(() => {
    let active = true;

    const loadCompetition = async () => {
      try {
        const data = await fetchCompetitionBySlug(slug);
        if (!active) return;

        setResource({ slug, competition: data, error: '' });
      } catch (err) {
        console.error(err);
        if (!active) return;

        setResource({ slug, competition: null, error: getLoadErrorMessage(err) });
      }
    };

    loadCompetition();

    return () => {
      active = false;
    };
  }, [slug]);

  // Fetch student personalized data if they are subscribed
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

      if (!isStudent || loadingSubscriptions) return;

      const regState = getCompetitionRegistrationState(competition);
      
      // If they are subscribed or pending, they might have an assignment or rejected request
      if (regState.reason === 'subscribed' || regState.reason === 'pending') {
        setStudentDataLoading(true);
        try {
          const [assignmentData, rejectedData] = await Promise.all([
            fetchMyStageAssignment(competition.id),
            fetchMyRejectedRequest(competition.id)
          ]);
          
          if (!active) return;
          setStageAssignment(assignmentData);
          setRejectedRequest(rejectedData);
        } catch (err) {
          console.error('Failed to load student competition data', err);
        } finally {
          if (active) setStudentDataLoading(false);
        }
      }
    }

    loadPersonalizedData();
    return () => { active = false; };
  }, [competition?.id, isStudent, loadingSubscriptions]);

  // Set Document Title
  useEffect(() => {
    if (loading) {
      document.title = 'تفاصيل المسابقة - حبل الله';
      return;
    }

    if (competition) {
      document.title = `${competition.name} - حبل الله`;
    } else if (error) {
      document.title = 'تعذر تحميل المسابقة - حبل الله';
    } else {
      document.title = 'تفاصيل المسابقة - حبل الله';
    }
  }, [competition, error, loading]);

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--t-bg-page)', color: 'var(--t-text)' }}>
        <QuranNav />
        <div className="flex-grow flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-sm font-semibold" style={{ color: 'var(--t-text-muted)' }}>جارٍ تحميل تفاصيل المسابقة...</p>
        </div>
        <QuranFooter />
      </div>
    );
  }

  if (!competition) {
    if (error) {
      return (
        <div dir="rtl" className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--t-bg-page)', color: 'var(--t-text)' }}>
          <QuranNav />
          <div className="flex-grow flex flex-col items-center justify-center py-20 px-4 text-center">
            <Trophy size={48} className="text-red-500 mb-4 opacity-40" />
            <h2 className="text-2xl font-black mb-2" style={{ color: 'var(--t-primary)' }}>تعذر تحميل المسابقة</h2>
            <p style={{ color: 'var(--t-text-muted)', marginBottom: '1.5rem' }}>{error}</p>
            <Link
              to="/quran/competitions"
              className="py-3 px-6 rounded-xl font-bold text-white text-sm"
              style={{ backgroundColor: 'var(--t-primary)' }}
            >
              العودة لصفحة المسابقات
            </Link>
          </div>
          <QuranFooter />
        </div>
      );
    }

    return (
      <div dir="rtl" className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--t-bg-page)', color: 'var(--t-text)' }}>
        <QuranNav />
        <div className="flex-grow flex flex-col items-center justify-center py-20 px-4 text-center">
          <Trophy size={48} className="text-red-500 mb-4 opacity-40" />
          <h2 className="text-2xl font-black mb-2" style={{ color: 'var(--t-primary)' }}>المسابقة غير موجودة</h2>
          <p style={{ color: 'var(--t-text-muted)', marginBottom: '1.5rem' }}>المعذرة، لم نتمكن من العثور على المسابقة المطلوبة.</p>
          <Link
            to="/quran/competitions"
            className="py-3 px-6 rounded-xl font-bold text-white text-sm"
            style={{ backgroundColor: 'var(--t-primary)' }}
          >
            العودة لصفحة المسابقات
          </Link>
        </div>
        <QuranFooter />
      </div>
    );
  }

  const registrationState = getCompetitionRegistrationState(competition);
  const registrationHint = registrationState.reason === 'subscribed'
    ? 'تم اعتماد اشتراكك في هذه المسابقة.'
    : registrationState.reason === 'pending'
      ? 'تم استلام طلبك وهو بانتظار مراجعة الإدارة.'
      : registrationState.reason === 'closed'
        ? 'انتهت فترة التسجيل لهذه المسابقة.'
        : registrationState.reason === 'loading'
          ? 'جارٍ التحقق من حالة اشتراكك...'
          : 'املأ النموذج لإرسال طلب الاشتراك في المسابقة';
  const renderStatusCard = () => {
    if (!isStudent || studentDataLoading) return null;

    const regState = getCompetitionRegistrationState(competition);
    if (regState.reason !== 'subscribed' && regState.reason !== 'pending') {
      return null;
    }

    if (rejectedRequest) {
      return (
        <div className="mb-8 p-6 rounded-2xl border flex items-start gap-4 shadow-sm" style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
          <AlertTriangle className="text-amber-500 mt-1 shrink-0" size={28} />
          <div>
            <h3 className="font-bold text-amber-800 text-lg mb-1">طلب مرفوض</h3>
            <p className="text-amber-700 text-sm leading-relaxed">
              لقد فحصنا طلبك ووجدنا ان مستواك غير مناسب للاشتراك في هذه المسابقة، ننصحك بفحص باقي المسابقات ومتابعة التحديثات
            </p>
          </div>
        </div>
      );
    }

    if (regState.reason === 'pending' && !stageAssignment) {
      return (
        <div className="mb-8 p-6 rounded-2xl border flex items-start gap-4 shadow-sm" style={{ backgroundColor: 'var(--t-bg-surface-low)', borderColor: 'var(--t-border-gold)' }}>
          <Clock className="text-amber-500 mt-1 shrink-0" size={28} />
          <div>
            <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--t-primary)' }}>طلب الاشتراك قيد المراجعة</h3>
            <p className="text-sm" style={{ color: 'var(--t-text-muted)' }}>
              تم إرسال طلب الاشتراك
            </p>
          </div>
        </div>
      );
    }

    if (stageAssignment) {
      if (stageAssignment.status === 'failed') {
        // The stage the student was in when they were marked failed is kept on the
        // assignment, so we can name it instead of showing a generic message.
        const failedStageName =
          stageAssignment.competition_stages?.name
          || stages.find((s) => s.id === stageAssignment.current_stage_id)?.name
          || '';

        return (
          <div className="mb-8 p-6 rounded-2xl border flex items-start gap-4 shadow-sm" style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca' }}>
            <XCircle className="text-red-500 mt-1 shrink-0" size={28} />
            <div>
              <h3 className="font-bold text-red-800 text-lg mb-1">
                {failedStageName ? `لم تجتاز ${failedStageName}` : 'لم يجتاز'}
              </h3>
              <p className="text-red-700 text-sm leading-relaxed">
                للأسف، لم تجتاز هذه المرحلة، استعد جيدا للمسابقات القادمة
              </p>
            </div>
          </div>
        );
      }

      if (stageAssignment.status === 'completed') {
        return (
          <div className="mb-8">
            <StudentCompetitionCelebration
              studentName={studentProfile?.full_name || 'طالب القرآن الكريم'}
              competitionName={competition?.name || 'المسابقة القرآنية'}
              level={stageAssignment.level || 'المستوى العام'}
              finalRank={stageAssignment.final_rank || 1}
              stagesCount={stages?.length || 3}
              completionDate={stageAssignment.updated_at || competition?.end_date || null}
              teacherName={studentProfile?.teachers?.name || ''}
            />
          </div>
        );
      }


      // Active
      if (stageAssignment.status === 'active') {
        const currentStageIndex = stages.findIndex(s => s.id === stageAssignment.current_stage_id);
        const stageNum = currentStageIndex >= 0 ? currentStageIndex + 1 : 1;
        const totalStages = stages.length > 0 ? stages.length : 1;
        
        return (
          <div className="mb-8 p-6 rounded-2xl border shadow-sm relative overflow-hidden" style={{ backgroundColor: 'var(--t-primary-light)', borderColor: 'var(--t-primary)' }}>
            <div className="absolute top-0 left-0 w-2 h-full" style={{ backgroundColor: 'var(--t-primary)' }}></div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <BookOpen className="mt-1 shrink-0" style={{ color: 'var(--t-primary)' }} size={28} />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg" style={{ color: 'var(--t-primary)' }}>أنت مشارك في المسابقة</h3>
                    {stageAssignment.level && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--t-primary)', color: 'white' }}>
                        مستوى: {stageAssignment.level}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--t-primary)' }}>
                    المرحلة الحالية: {stageAssignment.competition_stages?.name || '---'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 bg-white/50 px-4 py-2 rounded-xl">
                <div className="flex gap-1.5" dir="ltr">
                  {Array.from({ length: totalStages }).map((_, idx) => (
                    <div 
                      key={idx} 
                      className={`w-3 h-3 rounded-full ${idx < stageNum ? 'bg-[var(--t-primary)]' : 'bg-[var(--t-primary)]/20'}`}
                    ></div>
                  ))}
                </div>
                <span className="text-xs font-bold mr-2" style={{ color: 'var(--t-primary)' }}>
                  المرحلة {stageNum} من {totalStages}
                </span>
              </div>
            </div>
          </div>
        );
      }
    }
    
    return null;
  };

  return (
    <div dir="rtl" className="min-h-screen flex flex-col transition-colors duration-300" style={{ backgroundColor: 'var(--t-bg-page)', color: 'var(--t-text)' }}>
      <QuranNav />

      {/* Main Body */}
      <main className="flex-grow py-12 px-5 md:px-8 relative">
        <div className="geometric-bg opacity-15"></div>
        <div className="max-w-4xl mx-auto relative z-10">
          
          {/* Back button */}
          <Link
            to="/quran/competitions"
            className="inline-flex items-center gap-2 font-bold text-xs mb-8 transition-colors hover:text-amber-500"
            style={{ color: 'var(--t-text-muted)' }}
          >
            <ChevronRight size={16} />
            <span>العودة لكل المسابقات</span>
          </Link>

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
              <span className="text-xs font-black uppercase px-3.5 py-1.5 rounded-full inline-block mb-4"
                style={{ backgroundColor: 'var(--t-primary-light)', color: 'var(--t-primary)' }}>
                مسابقات حبل الله
              </span>
              <h1 className="text-3xl md:text-4xl font-black mb-4" style={{ color: 'var(--t-primary)' }}>
                {competition.name}
              </h1>
              
              {/* Dates Panel */}
              <div className="flex flex-wrap gap-6 text-sm font-semibold" style={{ color: 'var(--t-text-muted)' }}>
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-amber-500" />
                  <span>تاريخ الانطلاق: {formatDate(competition.start_date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-amber-500" />
                  <span>آخر موعد للتسجيل: {formatDate(competition.registration_deadline)}</span>
                </div>
              </div>
            </div>

            {/* Status Card */}
            {renderStatusCard()}

            {/* Descriptions & Details */}
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-black mb-3" style={{ color: 'var(--t-primary)' }}>نبذة عن المسابقة</h2>
                <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--t-text-muted)' }}>
                  {competition.complete_description}
                </p>
              </div>

              {/* Competition Levels */}
              {competition.available_levels && Array.isArray(competition.available_levels) && competition.available_levels.length > 0 && (
                <div className="p-6 rounded-2xl border" style={{ backgroundColor: 'var(--t-bg-surface-low)', borderColor: 'var(--t-border-gold)' }}>
                  <h2 className="text-xl font-black mb-3 flex items-center gap-2" style={{ color: 'var(--t-primary)' }}>
                    <Trophy size={20} className="text-amber-500" />
                    <span>المستويات المتاحة في المسابقة</span>
                  </h2>
                  <div className="flex flex-wrap gap-2.5 mt-2">
                    {competition.available_levels.map((level, idx) => (
                      <span
                        key={idx}
                        className="text-xs font-bold px-4.5 py-2.5 rounded-xl border transition-all duration-300 hover:scale-105"
                        style={{
                          backgroundColor: 'var(--t-bg-card)',
                          borderColor: 'var(--t-border)',
                          color: 'var(--t-primary)',
                          boxShadow: '0 4px 12px var(--t-shadow-card)',
                        }}
                      >
                        {level}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Conditional Awards rendering */}
              {competition.awards_complete_description && (
                <div className="p-6 rounded-2xl border" style={{ backgroundColor: 'var(--t-bg-surface-low)', borderColor: 'var(--t-border-gold)' }}>
                  <h2 className="text-xl font-black mb-3 flex items-center gap-2" style={{ color: 'var(--t-secondary)' }}>
                    <Award size={20} />
                    <span>الجوائز والتكريم</span>
                  </h2>
                  <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--t-text-muted)' }}>
                    {competition.awards_complete_description}
                  </p>
                </div>
              )}

              <div>
                <h2 className="text-xl font-black mb-3 flex items-center gap-2" style={{ color: 'var(--t-primary)' }}>
                  <ShieldCheck size={20} className="text-amber-500" />
                  <span>شروط وأحكام المشاركة</span>
                </h2>
                <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--t-text-muted)' }}>
                  {competition.participation_terms}
                </p>
              </div>
            </div>

            {/* CTA Panel */}
            <div className="mt-12 pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-6" style={{ borderColor: 'var(--t-border)' }}>
              <div>
                <h4 className="font-black text-sm mb-1">هل أنت مستعد للمشاركة؟</h4>
                <p className="text-xs" style={{ color: 'var(--t-text-muted)' }}>{registrationHint}</p>
              </div>
              <button
                onClick={() => {
                  if (!registrationState.disabled) {
                    setModalOpen(true);
                  }
                }}
                disabled={registrationState.disabled}
                className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl font-bold text-white text-center transition-all duration-300 disabled:cursor-not-allowed ${registrationState.reason === 'available' ? 'hover:opacity-95 hover:shadow-md' : ''} ${registrationState.reason === 'closed' || registrationState.reason === 'loading' ? 'disabled:opacity-50' : ''}`}
                style={{ backgroundColor: registrationState.reason === 'subscribed' ? 'var(--t-primary)' : 'var(--t-secondary)' }}
              >
                {registrationState.label}
              </button>
            </div>
          </div>

        </div>
      </main>

      {modalOpen && competition && (
        <CompetitionRegistrationModal
          competition={competition}
          onSubmitted={() => {
            markCompetitionRequestPending(competition.id);
          }}
          onClose={() => setModalOpen(false)}
        />
      )}

      <QuranFooter />
    </div>
  );
}
