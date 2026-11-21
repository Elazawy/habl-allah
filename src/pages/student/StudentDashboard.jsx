import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { fetchMySubscribedCourses, fetchMySubscribedCompetitions } from '../../services/studentsService';
import { fetchMyLessons } from '../../services/quranLessonsService';
import { fetchPublishedCourses } from '../../services/coursesService';
import { fetchPublishedCompetitions } from '../../services/competitionsService';
import QuranNav from '../quran/QuranNav';
import QuranFooter from '../quran/QuranFooter';
import { BookOpen, Trophy, Calendar, User, ArrowLeft } from 'lucide-react';
import { useVisibleRefresh } from '../../hooks/useVisibleRefresh';
import {
  DirectionalIcon,
  LocalizedLink,
  useFormatters,
  useLocalizedContent,
  useLocalizedNavigate,
} from '../../i18n';

export default function StudentDashboard() {
  const { studentProfile, signOut } = useAuth();
  const navigate = useLocalizedNavigate();
  const { t } = useTranslation(['student', 'common']);
  const { formatDate, formatNumber } = useFormatters();
  const { field, text, latinName } = useLocalizedContent();

  const [myCourses, setMyCourses] = useState([]);
  const [otherCourses, setOtherCourses] = useState([]);
  const [myCompetitions, setMyCompetitions] = useState([]);
  const [otherCompetitions, setOtherCompetitions] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  useVisibleRefresh(async () => {
    const competitions = await fetchMySubscribedCompetitions();
    const published = await fetchPublishedCompetitions();
    setMyCompetitions(competitions);
    const ids = new Set(competitions.map((row) => row.competition_id));
    setOtherCompetitions(published.filter((row) => !ids.has(row.id)));
  });

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      try {
        // Fetch all data in parallel for speed
        const [subCourses, subComps, lessonHistory, allCourses, allComps] = await Promise.all([
          fetchMySubscribedCourses(),
          fetchMySubscribedCompetitions(),
          fetchMyLessons(),
          fetchPublishedCourses(),
          fetchPublishedCompetitions(),
        ]);

        setMyCourses(subCourses);
        setMyCompetitions(subComps);
        setLessons(lessonHistory);

        const subCourseIds = new Set(subCourses.map((c) => c.course_id));
        setOtherCourses(allCourses.filter((c) => !subCourseIds.has(c.id)));

        const subCompIds = new Set(subComps.map((c) => c.competition_id));
        setOtherCompetitions(allComps.filter((c) => !subCompIds.has(c.id)));
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate('/quran');
  };

  const latestLesson = lessons[0] ?? null;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--t-bg-page)', color: 'var(--t-text)' }}>
      <QuranNav />

      <main className="flex-1 py-10 px-5 md:px-8 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 start-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 end-0 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-6xl mx-auto space-y-10">
          
          {/* Welcome Banner */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border rounded-3xl p-6 md:p-8 shadow-sm" style={{ backgroundColor: 'var(--t-bg-card)', borderColor: 'var(--t-border)' }}>
            <div>
              <span className="text-xs font-bold block mb-1" style={{ color: 'var(--t-primary)' }}>{t('dashboard.welcomeBadge')}</span>
              <h1 className="text-2xl md:text-3xl font-black" style={{ color: 'var(--t-text)' }}>
                {t('common:nav.welcomeUser', { name: studentProfile?.full_name ?? '' })}
              </h1>
              {studentProfile?.teachers?.name && (
                <p className="text-xs md:text-sm mt-1 font-semibold" style={{ color: 'var(--t-text-muted)' }}>
                  {t('dashboard.assignedTeacher', { name: latinName(studentProfile.teachers, 'name').text })}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 mt-4 md:mt-0">
              <LocalizedLink
                to="/quran/student/profile"
                className="px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90"
                style={{ backgroundColor: 'var(--t-primary-light)', color: 'var(--t-primary)' }}
              >
                {t('dashboard.myProfile')}
              </LocalizedLink>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
              >
                {t('common:nav.signOut')}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-12 h-12 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--t-primary-light)', borderTopColor: 'var(--t-primary)' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--t-text-muted)' }}>{t('dashboard.loading')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Start Side (Teacher details and Latest Quran report) - 8 cols */}
              <div className="lg:col-span-8 space-y-8">
                
                {/* 1. Teacher Assignment Check */}
                {!studentProfile?.teachers && (
                  <div className="rounded-3xl p-6 text-center space-y-4 border" style={{ backgroundColor: 'rgba(217, 119, 6, 0.1)', borderColor: 'rgba(217, 119, 6, 0.2)' }}>
                    <User className="w-12 h-12 mx-auto opacity-70" style={{ color: 'var(--t-secondary)' }} />
                    <h2 className="text-lg font-bold" style={{ color: 'var(--t-secondary)' }}>{t('dashboard.noTeacher.title')}</h2>
                    <p className="text-xs max-w-md mx-auto" style={{ color: 'var(--t-text-muted)' }}>
                      {t('dashboard.noTeacher.description')}
                    </p>
                    <LocalizedLink
                      to="/quran/teachers"
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-xs text-white transition-all cursor-pointer hover:opacity-90"
                      style={{ backgroundColor: 'var(--t-secondary)' }}
                    >
                      {t('dashboard.noTeacher.cta')}
                    </LocalizedLink>
                  </div>
                )}

                {/* 2. Latest Quran Lesson Record */}
                {studentProfile?.teachers && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h2 className="text-lg font-black flex items-center gap-2" style={{ color: 'var(--t-text)' }}>
                        <Calendar className="w-5 h-5" style={{ color: 'var(--t-primary)' }} />
                        {t('dashboard.latestLesson.title')}
                      </h2>
                      {lessons.length > 0 && (
                        <LocalizedLink
                          to="/quran/student/lessons"
                          className="text-xs font-bold hover:underline flex items-center gap-1"
                          style={{ color: 'var(--t-primary)' }}
                        >
                          {t('dashboard.latestLesson.viewAll', { total: formatNumber(lessons.length) })}
                          <DirectionalIcon icon={ArrowLeft} flipIn="ltr" className="w-3.5 h-3.5" />
                        </LocalizedLink>
                      )}
                    </div>

                    {!latestLesson ? (
                      <div className="border rounded-3xl p-8 text-center text-xs" style={{ backgroundColor: 'var(--t-bg-card)', borderColor: 'var(--t-border)', color: 'var(--t-text-muted)' }}>
                        <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" style={{ color: 'var(--t-primary)' }} />
                        <p className="text-xs">{t('dashboard.latestLesson.empty')}</p>
                      </div>
                    ) : (
                      /* Quran Lesson Sheet format */
                      <div className="border rounded-3xl p-6 md:p-8 shadow-sm space-y-6 relative" style={{ backgroundColor: 'var(--t-bg-card)', borderColor: 'var(--t-border)' }}>
                        {/* Hijri Date and Gregorian Date */}
                        <div className="flex justify-between items-start border-b pb-4 flex-wrap gap-2" style={{ borderColor: 'var(--t-border)' }}>
                          <div>
                            <span className="text-[10px] font-bold block mb-0.5" style={{ color: 'var(--t-primary)' }}>{t('lessons.todayEvalDate')}</span>
                            <span className="text-sm font-bold" style={{ color: 'var(--t-text)' }}>
                              {formatDate(latestLesson.lesson_date, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                          </div>
                          {latestLesson.hijri_date && (
                            <div className="text-end sm:text-start px-3 py-1.5 rounded-xl border" style={{ backgroundColor: 'var(--t-primary-light)', borderColor: 'var(--t-border)' }}>
                              <span dir="auto" className="text-xs font-bold" style={{ color: 'var(--t-primary)' }}>📜 {latestLesson.hijri_date}</span>
                            </div>
                          )}
                        </div>

                        {/* Quran performance grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Start Column: Recitation */}
                          <div className="space-y-4">
                            <h3 className="text-xs font-black border-b pb-1" style={{ color: 'var(--t-primary)', borderColor: 'var(--t-border)' }}>{t('lessons.recitationTodayHeading')}</h3>
                            
                            {latestLesson.recitation_today_surah ? (
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm gap-2">
                                  <span className="font-semibold shrink-0" style={{ color: 'var(--t-text-muted)' }}>{t('lessons.currentLabel')}</span>
                                  <span dir="auto" className="font-bold text-end" style={{ color: 'var(--t-text)' }}>
                                    {t('lessons.surahRange', {
                                      surah: latestLesson.recitation_today_surah,
                                      from: latestLesson.recitation_today_from || formatNumber(1),
                                      to: latestLesson.recitation_today_to || t('lessons.toEnd'),
                                    })}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm gap-2">
                                  <span className="font-semibold shrink-0" style={{ color: 'var(--t-text-muted)' }}>{t('lessons.memorizationLevelLabel')}</span>
                                  <span dir="auto" className="font-black" style={{ color: 'var(--t-primary)' }}>{latestLesson.recitation_today_level}</span>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs" style={{ color: 'var(--t-text-subtle)' }}>{t('lessons.noRecitationToday')}</p>
                            )}

                            {latestLesson.recitation_past_surah && (
                              <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--t-border)' }}>
                                <div className="flex justify-between text-sm gap-2">
                                  <span className="font-semibold shrink-0" style={{ color: 'var(--t-text-muted)' }}>{t('lessons.pastReviewLabel')}</span>
                                  <span dir="auto" className="font-bold text-end" style={{ color: 'var(--t-text)' }}>
                                    {t('lessons.surahOnly', { surah: latestLesson.recitation_past_surah })}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm gap-2">
                                  <span className="font-semibold shrink-0" style={{ color: 'var(--t-text-muted)' }}>{t('lessons.pastLevelLabel')}</span>
                                  <span dir="auto" className="font-black" style={{ color: 'var(--t-primary)' }}>{latestLesson.recitation_past_level}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* End Column: Reading & Tajweed */}
                          <div className="space-y-4">
                            <h3 className="text-xs font-black border-b pb-1" style={{ color: 'var(--t-primary)', borderColor: 'var(--t-border)' }}>{t('lessons.readingAndTajweedHeading')}</h3>
                            
                            {latestLesson.reading_surah ? (
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm gap-2">
                                  <span className="font-semibold shrink-0" style={{ color: 'var(--t-text-muted)' }}>{t('lessons.readingLabel')}</span>
                                  <span dir="auto" className="font-bold text-end" style={{ color: 'var(--t-text)' }}>
                                    {t('lessons.surahRange', {
                                      surah: latestLesson.reading_surah,
                                      from: latestLesson.reading_from || formatNumber(1),
                                      to: latestLesson.reading_to || t('lessons.toEnd'),
                                    })}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm gap-2">
                                  <span className="font-semibold shrink-0" style={{ color: 'var(--t-text-muted)' }}>{t('lessons.readingLevelLabel')}</span>
                                  <span dir="auto" className="font-black" style={{ color: 'var(--t-primary)' }}>{latestLesson.reading_level}</span>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs" style={{ color: 'var(--t-text-subtle)' }}>{t('lessons.noReadingToday')}</p>
                            )}

                            {latestLesson.tajweed_lesson && (
                              <div className="flex justify-between text-sm gap-2 pt-2 border-t" style={{ borderColor: 'var(--t-border)' }}>
                                <span className="font-semibold shrink-0" style={{ color: 'var(--t-text-muted)' }}>{t('lessons.tajweedLabel')}</span>
                                <span dir="auto" className="font-bold text-end" style={{ color: 'var(--t-text)' }}>{latestLesson.tajweed_lesson}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* General details: notes and interaction */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border rounded-2xl p-4" style={{ backgroundColor: 'var(--t-bg-surface-low)', borderColor: 'var(--t-border)' }}>
                          {latestLesson.interaction_level && (
                            <div className="flex justify-between text-xs sm:text-sm gap-2">
                              <span className="font-bold shrink-0" style={{ color: 'var(--t-text-muted)' }}>{t('lessons.interactionLabel')}</span>
                              <span dir="auto" className="font-black" style={{ color: 'var(--t-primary)' }}>{latestLesson.interaction_level}</span>
                            </div>
                          )}
                          {latestLesson.general_notes && (
                            <div className="text-xs leading-relaxed col-span-2 mt-2 pt-2 border-t" style={{ borderColor: 'var(--t-border)', color: 'var(--t-text)' }}>
                              <span className="font-bold block mb-0.5" style={{ color: 'var(--t-primary)' }}>{t('lessons.teacherNotesLabel')}</span>
                              <p dir="auto" className="italic">"{latestLesson.general_notes}"</p>
                            </div>
                          )}
                        </div>

                        {/* Homework section */}
                        {(latestLesson.homework_today_surah || latestLesson.homework_past_surah) && (
                          <div className="border-t pt-4 space-y-3" style={{ borderColor: 'var(--t-border)' }}>
                            <h3 className="text-xs font-black" style={{ color: 'var(--t-primary)' }}>{t('lessons.homeworkHeading')}</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {latestLesson.homework_today_surah && (
                                <div className="text-xs">
                                  <span className="font-bold" style={{ color: 'var(--t-text-muted)' }}>{t('lessons.homeworkCurrentLabel')}</span>
                                  <p dir="auto" className="font-bold mt-0.5" style={{ color: 'var(--t-text)' }}>
                                    {t('lessons.surahRange', {
                                      surah: latestLesson.homework_today_surah,
                                      from: latestLesson.homework_today_from || formatNumber(1),
                                      to: latestLesson.homework_today_to || t('lessons.toEnd'),
                                    })}
                                  </p>
                                </div>
                              )}
                              {latestLesson.homework_past_surah && (
                                <div className="text-xs">
                                  <span className="font-bold" style={{ color: 'var(--t-text-muted)' }}>{t('lessons.homeworkPastLabel')}</span>
                                  <p dir="auto" className="font-bold mt-0.5" style={{ color: 'var(--t-text)' }}>
                                    {t('lessons.surahOnly', { surah: latestLesson.homework_past_surah })}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* End Side (Subscribed Courses & Competitions) - 4 cols */}
              <div className="lg:col-span-4 space-y-8">
                
                {/* 1. Courses Section */}
                <div className="space-y-4">
                  <h2 className="text-lg font-black flex items-center gap-2" style={{ color: 'var(--t-text)' }}>
                    <BookOpen className="w-5 h-5" style={{ color: 'var(--t-primary)' }} />
                    {t('dashboard.courses.title')}
                  </h2>

                  {myCourses.length === 0 ? (
                    <div className="border rounded-3xl p-5 text-center text-xs" style={{ backgroundColor: 'var(--t-bg-card)', borderColor: 'var(--t-border)', color: 'var(--t-text-muted)' }}>
                      {t('dashboard.courses.empty')}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {myCourses.map((sub) => {
                        const courseName = field(sub.quran_courses, 'name');
                        return (
                        <LocalizedLink
                          key={sub.id}
                          to={`/quran/courses/${sub.quran_courses.slug}/watch`}
                          className="block border rounded-2xl p-4 shadow-sm transition-all group hover:shadow-md hover:border-[var(--t-primary)]"
                          style={{ backgroundColor: 'var(--t-bg-card)', borderColor: 'var(--t-border)' }}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <span className="text-[9px] font-bold block mb-1" style={{ color: 'var(--t-primary)' }}>{t('dashboard.courses.activeBadge')}</span>
                              <h3 dir={courseName.dir} className="font-bold text-sm transition-colors group-hover:text-[var(--t-primary)]" style={{ color: 'var(--t-text)' }}>
                                {courseName.text}
                              </h3>
                            </div>
                            <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--t-primary)' }}>{t('dashboard.courses.watchCta')}</span>
                          </div>
                        </LocalizedLink>
                        );
                      })}
                    </div>
                  )}

                  {/* Suggest Other Courses */}
                  {otherCourses.length > 0 && (
                    <div className="pt-3 space-y-2">
                      <span className="text-xs font-bold block" style={{ color: 'var(--t-text-muted)' }}>{t('dashboard.courses.suggestedTitle')}</span>
                      <div className="space-y-2">
                        {otherCourses.slice(0, 2).map((course) => {
                          const courseName = field(course, 'name');
                          return (
                          <div
                            key={course.id}
                            className="rounded-xl p-3 border flex justify-between items-center"
                            style={{ backgroundColor: 'var(--t-bg-surface-low)', borderColor: 'var(--t-border)' }}
                          >
                            <div className="min-w-0 flex-1 pe-2">
                              <h4 dir={courseName.dir} className="text-xs font-bold truncate" style={{ color: 'var(--t-text)' }}>{courseName.text}</h4>
                              <span className="text-[10px]" style={{ color: 'var(--t-text-muted)' }}>{course.is_free ? t('dashboard.courses.free') : t('dashboard.courses.paid')}</span>
                            </div>
                            <LocalizedLink
                              to={`/quran/courses/${course.slug}`}
                              className="text-[10px] font-bold hover:underline shrink-0 inline-flex items-center gap-0.5"
                              style={{ color: 'var(--t-primary)' }}
                            >
                              <span>{t('dashboard.details')}</span>
                              <DirectionalIcon icon={ArrowLeft} flipIn="ltr" className="w-3 h-3" />
                            </LocalizedLink>
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Competitions Section */}
                <div className="space-y-4">
                  <h2 className="text-lg font-black flex items-center gap-2" style={{ color: 'var(--t-text)' }}>
                    <Trophy className="w-5 h-5" style={{ color: 'var(--t-primary)' }} />
                    {t('dashboard.competitions.title')}
                  </h2>

                  {myCompetitions.length === 0 ? (
                    <div className="border rounded-3xl p-5 text-center text-xs" style={{ backgroundColor: 'var(--t-bg-card)', borderColor: 'var(--t-border)', color: 'var(--t-text-muted)' }}>
                      {t('dashboard.competitions.empty')}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {myCompetitions.map((sub) => {
                        const assignment = Array.isArray(sub.student_stage_assignments)
                          ? sub.student_stage_assignments[0]
                          : sub.student_stage_assignments;
                        const stageName = assignment?.competition_stages
                          ? text(assignment.competition_stages, 'name')
                          : '';
                        const compName = field(sub.quran_competitions, 'name');

                        return (
                        <LocalizedLink
                          key={sub.id}
                          to={`/quran/competition/${sub.quran_competitions.slug}#progress`}
                          className="block border rounded-2xl p-4 shadow-sm transition-all group hover:shadow-md hover:border-[var(--t-primary)]"
                          style={{ backgroundColor: 'var(--t-bg-card)', borderColor: 'var(--t-border)' }}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <span className="text-[9px] font-bold mb-1 flex items-center gap-1 flex-wrap" style={{ color: 'var(--t-secondary)' }}>
                                {t('dashboard.competitions.enrolledBadge')}
                                {assignment && (
                                  <>
                                    <span className="opacity-50 mx-1">|</span>
                                    {assignment.status === 'active' && (
                                      <span style={{ color: 'var(--t-primary)' }}>
                                        {t('dashboard.competitions.stage', {
                                          stage: stageName || t('dashboard.competitions.currentStageShort'),
                                        })}
                                      </span>
                                    )}
                                    {assignment.status === 'completed' && (
                                      <span className="text-emerald-500 dark:text-emerald-400 font-black flex items-center gap-1">
                                        {t('dashboard.competitions.winnerBadge')}
                                      </span>
                                    )}

                                    {assignment.status === 'failed' && (
                                      <span className="text-red-500 font-bold">
                                        {t('dashboard.competitions.failedStage', {
                                          stage: stageName || t('dashboard.competitions.currentStageFull'),
                                        })}
                                      </span>
                                    )}
                                  </>
                                )}
                              </span>
                              <h3 dir={compName.dir} className="font-bold text-sm transition-colors group-hover:text-[var(--t-primary)]" style={{ color: 'var(--t-text)' }}>
                                {compName.text}
                              </h3>
                            </div>
                            <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--t-secondary)' }}>{t('dashboard.competitions.trackProgress')}</span>
                          </div>
                        </LocalizedLink>
                        );
                      })}
                    </div>
                  )}

                  {/* Suggest Other Competitions */}
                  {otherCompetitions.length > 0 && (
                    <div className="pt-3 space-y-2">
                      <span className="text-xs font-bold block" style={{ color: 'var(--t-text-muted)' }}>{t('dashboard.competitions.availableTitle')}</span>
                      <div className="space-y-2">
                        {otherCompetitions.slice(0, 2).map((comp) => {
                          const compName = field(comp, 'name');
                          return (
                          <div
                            key={comp.id}
                            className="rounded-xl p-3 border flex justify-between items-center"
                            style={{ backgroundColor: 'var(--t-bg-surface-low)', borderColor: 'var(--t-border)' }}
                          >
                            <div className="min-w-0 flex-1 pe-2">
                              <h4 dir={compName.dir} className="text-xs font-bold truncate" style={{ color: 'var(--t-text)' }}>{compName.text}</h4>
                              <span className="text-[10px]" style={{ color: 'var(--t-secondary)' }}>{t('dashboard.competitions.clickToRegister')}</span>
                            </div>
                            <LocalizedLink
                              to={`/quran/competition/${comp.slug}`}
                              className="text-[10px] font-bold hover:underline shrink-0 inline-flex items-center gap-0.5"
                              style={{ color: 'var(--t-primary)' }}
                            >
                              <span>{t('dashboard.details')}</span>
                              <DirectionalIcon icon={ArrowLeft} flipIn="ltr" className="w-3 h-3" />
                            </LocalizedLink>
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

        </div>
      </main>

      <QuranFooter />
    </div>
  );
}
