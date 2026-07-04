import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Trophy, Calendar, Award, Clock, ShieldCheck, ChevronRight } from 'lucide-react';
import QuranNav from './QuranNav';
import QuranFooter from './QuranFooter';
import { fetchCompetitionBySlug } from '../../services/competitionsService';
import CompetitionRegistrationModal from './CompetitionRegistrationModal';
import { useCompetitionRegistrationStatus } from '../../hooks/useCompetitionRegistrationStatus';

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
  const loading = resource.slug !== slug;
  const competition = resource.slug === slug ? resource.competition : null;
  const error = resource.slug === slug ? resource.error : '';
  const { getCompetitionRegistrationState, markCompetitionRequestPending } = useCompetitionRegistrationStatus();

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
