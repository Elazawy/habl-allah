import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchMyLessons } from '../../services/quranLessonsService';
import QuranNav from '../quran/QuranNav';
import QuranFooter from '../quran/QuranFooter';
import { Calendar, ArrowRight } from 'lucide-react';
import { DirectionalIcon, LocalizedLink, useFormatters } from '../../i18n';

export default function StudentQuranLessons() {
  const { t } = useTranslation('student');
  const { formatDate, formatNumber } = useFormatters();
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
                <div
                  key={lesson.id}
                  className="border rounded-3xl p-6 md:p-8 shadow-sm space-y-6 relative transition-all duration-300 hover:shadow-md hover:border-[var(--t-primary)]"
                  style={{ backgroundColor: 'var(--t-bg-card)', borderColor: 'var(--t-border)' }}
                >
                  {/* Floating index indicator */}
                  <span className="absolute top-6 end-6 text-2xl font-black" style={{ color: 'var(--t-primary-light)' }}>
                    #{formatNumber(lessons.length - idx)}
                  </span>

                  {/* Hijri Date and Gregorian Date */}
                  <div className="flex justify-between items-start border-b pb-4 flex-wrap gap-2 pe-12" style={{ borderColor: 'var(--t-border)' }}>
                    <div>
                      <span className="text-[10px] font-bold block mb-0.5" style={{ color: 'var(--t-primary)' }}>{t('lessons.evalDate')}</span>
                      <span className="text-sm font-bold" style={{ color: 'var(--t-text)' }}>
                        {formatDate(lesson.lesson_date, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    </div>
                    {lesson.hijri_date && (
                      <div className="px-3 py-1.5 rounded-xl border" style={{ backgroundColor: 'var(--t-primary-light)', borderColor: 'var(--t-border)', color: 'var(--t-primary)' }}>
                        <span dir="auto" className="text-xs font-bold">📜 {lesson.hijri_date}</span>
                      </div>
                    )}
                  </div>

                  {/* Quran performance grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Recitation */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-black border-b pb-1" style={{ color: 'var(--t-primary)', borderColor: 'var(--t-border)' }}>{t('lessons.recitationTodayHeading')}</h3>
                      
                      {lesson.recitation_today_surah ? (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm gap-2">
                            <span className="font-semibold shrink-0" style={{ color: 'var(--t-text-muted)' }}>{t('lessons.currentLabel')}</span>
                            <span dir="auto" className="font-bold text-end" style={{ color: 'var(--t-text)' }}>
                              {t('lessons.surahRange', {
                                surah: lesson.recitation_today_surah,
                                from: lesson.recitation_today_from || formatNumber(1),
                                to: lesson.recitation_today_to || t('lessons.toEnd'),
                              })}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm gap-2">
                            <span className="font-semibold shrink-0" style={{ color: 'var(--t-text-muted)' }}>{t('lessons.memorizationLevelLabel')}</span>
                            <span dir="auto" className="font-black" style={{ color: 'var(--t-primary)' }}>{lesson.recitation_today_level}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs" style={{ color: 'var(--t-text-subtle)' }}>{t('lessons.noRecitationToday')}</p>
                      )}

                      {lesson.recitation_past_surah && (
                        <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--t-border)' }}>
                          <div className="flex justify-between text-sm gap-2">
                            <span className="font-semibold shrink-0" style={{ color: 'var(--t-text-muted)' }}>{t('lessons.pastReviewLabel')}</span>
                            <span dir="auto" className="font-bold text-end" style={{ color: 'var(--t-text)' }}>
                              {t('lessons.surahOnly', { surah: lesson.recitation_past_surah })}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm gap-2">
                            <span className="font-semibold shrink-0" style={{ color: 'var(--t-text-muted)' }}>{t('lessons.pastLevelLabel')}</span>
                            <span dir="auto" className="font-black" style={{ color: 'var(--t-primary)' }}>{lesson.recitation_past_level}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Reading & Tajweed */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-black border-b pb-1" style={{ color: 'var(--t-primary)', borderColor: 'var(--t-border)' }}>{t('lessons.readingAndTajweedHeading')}</h3>
                      
                      {lesson.reading_surah ? (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm gap-2">
                            <span className="font-semibold shrink-0" style={{ color: 'var(--t-text-muted)' }}>{t('lessons.readingLabel')}</span>
                            <span dir="auto" className="font-bold text-end" style={{ color: 'var(--t-text)' }}>
                              {t('lessons.surahRange', {
                                surah: lesson.reading_surah,
                                from: lesson.reading_from || formatNumber(1),
                                to: lesson.reading_to || t('lessons.toEnd'),
                              })}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm gap-2">
                            <span className="font-semibold shrink-0" style={{ color: 'var(--t-text-muted)' }}>{t('lessons.readingLevelLabel')}</span>
                            <span dir="auto" className="font-black" style={{ color: 'var(--t-primary)' }}>{lesson.reading_level}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs" style={{ color: 'var(--t-text-subtle)' }}>{t('lessons.noReadingToday')}</p>
                      )}

                      {lesson.tajweed_lesson && (
                        <div className="flex justify-between text-sm gap-2 pt-2 border-t" style={{ borderColor: 'var(--t-border)' }}>
                          <span className="font-semibold shrink-0" style={{ color: 'var(--t-text-muted)' }}>{t('lessons.tajweedLabel')}</span>
                          <span dir="auto" className="font-bold text-end" style={{ color: 'var(--t-text)' }}>{lesson.tajweed_lesson}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* General details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border rounded-2xl p-4" style={{ backgroundColor: 'var(--t-bg-surface-low)', borderColor: 'var(--t-border)' }}>
                    {lesson.interaction_level && (
                      <div className="flex justify-between text-xs sm:text-sm gap-2">
                        <span className="font-bold shrink-0" style={{ color: 'var(--t-text-muted)' }}>{t('lessons.interactionLabel')}</span>
                        <span dir="auto" className="font-black" style={{ color: 'var(--t-primary)' }}>{lesson.interaction_level}</span>
                      </div>
                    )}
                    {lesson.general_notes && (
                      <div className="text-xs leading-relaxed col-span-2 mt-2 pt-2 border-t" style={{ borderColor: 'var(--t-border)', color: 'var(--t-text)' }}>
                        <span className="font-bold block mb-0.5" style={{ color: 'var(--t-primary)' }}>{t('lessons.teacherNotesLabel')}</span>
                        <p dir="auto" className="italic">"{lesson.general_notes}"</p>
                      </div>
                    )}
                  </div>

                  {/* Homework section */}
                  {(lesson.homework_today_surah || lesson.homework_past_surah) && (
                    <div className="border-t pt-4 space-y-3" style={{ borderColor: 'var(--t-border)' }}>
                      <h3 className="text-xs font-black" style={{ color: 'var(--t-primary)' }}>{t('lessons.homeworkHeading')}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {lesson.homework_today_surah && (
                          <div className="text-xs">
                            <span className="font-bold" style={{ color: 'var(--t-text-muted)' }}>{t('lessons.homeworkCurrentLabel')}</span>
                            <p dir="auto" className="font-bold mt-0.5" style={{ color: 'var(--t-text)' }}>
                              {t('lessons.surahRange', {
                                surah: lesson.homework_today_surah,
                                from: lesson.homework_today_from || formatNumber(1),
                                to: lesson.homework_today_to || t('lessons.toEnd'),
                              })}
                            </p>
                          </div>
                        )}
                        {lesson.homework_past_surah && (
                          <div className="text-xs">
                            <span className="font-bold" style={{ color: 'var(--t-text-muted)' }}>{t('lessons.homeworkPastLabel')}</span>
                            <p dir="auto" className="font-bold mt-0.5" style={{ color: 'var(--t-text)' }}>
                              {t('lessons.surahOnly', { surah: lesson.homework_past_surah })}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              ))}
            </div>
          )}

        </div>
      </main>

      <QuranFooter />
    </div>
  );
}
