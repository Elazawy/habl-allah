import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchMyLessons } from '../../services/quranLessonsService';
import QuranNav from '../quran/QuranNav';
import QuranFooter from '../quran/QuranFooter';
import QuranLessonCard from './QuranLessonCard';
import { Calendar, ArrowRight } from 'lucide-react';
import { DirectionalIcon, LocalizedLink, useFormatters } from '../../i18n';

export default function StudentQuranLessons() {
  const { t } = useTranslation('student');
  const { formatNumber } = useFormatters();
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLessons() {
      setLoading(true);
      try {
        const data = await fetchMyLessons();
        setLessons(data);
      } catch (err) {
        console.error('Error fetching lessons:', err);
      } finally {
        setLoading(false);
      }
    }
    loadLessons();
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--t-bg-page)', color: 'var(--t-text)' }}>
      <QuranNav />

      <main className="flex-1 py-10 px-5 md:px-8 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 start-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 end-0 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Back Button */}
          <LocalizedLink
            to="/quran/student/dashboard"
            className="inline-flex items-center gap-1.5 font-bold text-xs border hover:shadow transition-all px-4 py-2.5 rounded-xl shadow-sm hover:border-[var(--t-primary)]"
            style={{ backgroundColor: 'var(--t-bg-card)', borderColor: 'var(--t-border)', color: 'var(--t-text)' }}
          >
            <DirectionalIcon icon={ArrowRight} flipIn="ltr" size={16} />
            {t('lessons.backToDashboard')}
          </LocalizedLink>

          {/* Header */}
          <div className="flex justify-between items-center pb-4 border-b gap-3 flex-wrap" style={{ borderColor: 'var(--t-border)' }}>
            <div>
              <h1 className="text-xl md:text-2xl font-black" style={{ color: 'var(--t-text)' }}>{t('lessons.pageTitle')}</h1>
              <p className="text-xs mt-0.5" style={{ color: 'var(--t-text-muted)' }}>
                {t('lessons.pageSubtitle')}
              </p>
            </div>
            <span className="px-3.5 py-1.5 rounded-full text-xs font-bold border" style={{ backgroundColor: 'var(--t-primary-light)', borderColor: 'var(--t-border)', color: 'var(--t-primary)' }}>
              {t('lessons.lessonsCount', { total: formatNumber(lessons.length) })}
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-12 h-12 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--t-primary-light)', borderTopColor: 'var(--t-primary)' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--t-text-muted)' }}>{t('lessons.loading')}</p>
            </div>
          ) : lessons.length === 0 ? (
            <div className="border rounded-3xl p-12 text-center text-xs" style={{ backgroundColor: 'var(--t-bg-card)', borderColor: 'var(--t-border)', color: 'var(--t-text-muted)' }}>
              <Calendar className="w-16 h-16 mx-auto mb-3 opacity-20" style={{ color: 'var(--t-primary)' }} />
              <h2 className="text-lg font-black" style={{ color: 'var(--t-text)' }}>{t('lessons.emptyTitle')}</h2>
              <p className="text-xs max-w-sm mx-auto mt-1">{t('lessons.emptyDescription')}</p>
            </div>
          ) : (
            <div className="space-y-8">
              {lessons.map((lesson, idx) => (
                <QuranLessonCard
                  key={lesson.id}
                  lesson={lesson}
                  lessonNumber={lessons.length - idx}
                  evalDateLabelKey="lessons.evalDate"
                  hoverable
                />
              ))}
            </div>
          )}

        </div>
      </main>

      <QuranFooter />
    </div>
  );
}
