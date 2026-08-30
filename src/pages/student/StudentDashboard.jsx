import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchMySubscribedCourses, fetchMySubscribedCompetitions } from '../../services/studentsService';
import { fetchMyLessons } from '../../services/quranLessonsService';
import { fetchPublishedCourses } from '../../services/coursesService';
import { fetchPublishedCompetitions } from '../../services/competitionsService';
import QuranNav from '../quran/QuranNav';
import QuranFooter from '../quran/QuranFooter';
import { BookOpen, Trophy, Calendar, Phone, User, ArrowLeft } from 'lucide-react';
import { WHATSAPP_NUMBER } from '../../lib/constants';

export default function StudentDashboard() {
  const { studentProfile, signOut } = useAuth();
  const navigate = useNavigate();

  const [myCourses, setMyCourses] = useState([]);
  const [otherCourses, setOtherCourses] = useState([]);
  const [myCompetitions, setMyCompetitions] = useState([]);
  const [otherCompetitions, setOtherCompetitions] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const handleContactTeacher = (teacherName) => {
    const text = `السلام عليكم ورحمة الله وبركاته، أنا الطالب (${studentProfile?.full_name}) المتابع مع الشيخ (${teacherName})، أود التواصل بخصوص الحلقات الحالية.`;
    const url = `https://api.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/quran');
  };

  const latestLesson = lessons[0] ?? null;

  return (
    <div dir="rtl" className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--t-bg-page)', color: 'var(--t-text)' }}>
      <QuranNav />

      <main className="flex-1 py-10 px-5 md:px-8 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-6xl mx-auto space-y-10">
          
          {/* Welcome Banner */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border rounded-3xl p-6 md:p-8 shadow-sm" style={{ backgroundColor: 'var(--t-bg-card)', borderColor: 'var(--t-border)' }}>
            <div>
              <span className="text-xs font-bold block mb-1" style={{ color: 'var(--t-primary)' }}>أهلاً بك يا قارئ القرآن</span>
              <h1 className="text-2xl md:text-3xl font-black" style={{ color: 'var(--t-text)' }}>
                مرحباً، {studentProfile?.full_name}
              </h1>
              {studentProfile?.teachers?.name && (
                <p className="text-xs md:text-sm mt-1 font-semibold" style={{ color: 'var(--t-text-muted)' }}>
                  الشيخ المتابع: {studentProfile.teachers.name}
                </p>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="mt-4 md:mt-0 px-4 py-2 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
            >
              تسجيل الخروج
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-12 h-12 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--t-primary-light)', borderTopColor: 'var(--t-primary)' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--t-text-muted)' }}>جاري تحميل بيانات لوحة التحكم...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Right Side (Teacher details and Latest Quran report) - 8 cols */}
              <div className="lg:col-span-8 space-y-8">
                
                {/* 1. Teacher Assignment Check */}
                {!studentProfile?.teachers && (
                  <div className="rounded-3xl p-6 text-center space-y-4 border" style={{ backgroundColor: 'rgba(217, 119, 6, 0.1)', borderColor: 'rgba(217, 119, 6, 0.2)' }}>
                    <User className="w-12 h-12 mx-auto opacity-70" style={{ color: 'var(--t-secondary)' }} />
                    <h2 className="text-lg font-bold" style={{ color: 'var(--t-secondary)' }}>أنت غير مشترك مع معلم حالياً</h2>
                    <p className="text-xs max-w-md mx-auto" style={{ color: 'var(--t-text-muted)' }}>
                      لتبدأ حلقات الحفظ والتسميع المباشرة ومتابعة ورقة تقييم القرآن الخاصة بك، يرجى اختيار المعلم المناسب لك والاشتراك معه.
                    </p>
                    <Link
                      to="/quran/teachers"
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-xs text-white transition-all cursor-pointer hover:opacity-90"
                      style={{ backgroundColor: 'var(--t-secondary)' }}
                    >
                      تصفح قائمة المعلمين والاشتراك
                    </Link>
                  </div>
                )}

                {/* 2. Latest Quran Lesson Record */}
                {studentProfile?.teachers && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h2 className="text-lg font-black flex items-center gap-2" style={{ color: 'var(--t-text)' }}>
                        <Calendar className="w-5 h-5" style={{ color: 'var(--t-primary)' }} />
                        آخر تقرير لدرس القرآن
                      </h2>
                      {lessons.length > 0 && (
                        <Link
                          to="/quran/student/lessons"
                          className="text-xs font-bold hover:underline flex items-center gap-1"
                          style={{ color: 'var(--t-primary)' }}
                        >
                          عرض كل التقارير ({lessons.length})
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>

                    {!latestLesson ? (
                      <div className="border rounded-3xl p-8 text-center text-xs" style={{ backgroundColor: 'var(--t-bg-card)', borderColor: 'var(--t-border)', color: 'var(--t-text-muted)' }}>
                        <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" style={{ color: 'var(--t-primary)' }} />
                        <p className="text-xs">لم يتم تسجيل أي تقارير قرآن لك بعد من قبل الشيخ المتابع.</p>
                      </div>
                    ) : (
                      /* Quran Lesson Sheet format */
                      <div className="border rounded-3xl p-6 md:p-8 shadow-sm space-y-6 relative" style={{ backgroundColor: 'var(--t-bg-card)', borderColor: 'var(--t-border)' }}>
                        {/* Hijri Date and Gregorian Date */}
                        <div className="flex justify-between items-start border-b pb-4 flex-wrap gap-2" style={{ borderColor: 'var(--t-border)' }}>
                          <div>
                            <span className="text-[10px] font-bold block mb-0.5" style={{ color: 'var(--t-primary)' }}>تاريخ تقييم اليوم</span>
                            <span className="text-sm font-bold" style={{ color: 'var(--t-text)' }}>
                              {new Date(latestLesson.lesson_date).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                          </div>
                          {latestLesson.hijri_date && (
                            <div className="text-left sm:text-right px-3 py-1.5 rounded-xl border" style={{ backgroundColor: 'var(--t-primary-light)', borderColor: 'var(--t-border)' }}>
                              <span className="text-xs font-bold" style={{ color: 'var(--t-primary)' }}>📜 {latestLesson.hijri_date}</span>
                            </div>
                          )}
                        </div>

                        {/* Quran performance grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Right Column: Recitation (تسميع) */}
                          <div className="space-y-4">
                            <h3 className="text-xs font-black border-b pb-1" style={{ color: 'var(--t-primary)', borderColor: 'var(--t-border)' }}>📌 تسميع اليوم</h3>
                            
                            {latestLesson.recitation_today_surah ? (
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="font-semibold" style={{ color: 'var(--t-text-muted)' }}>الحاضر:</span>
                                  <span className="font-bold" style={{ color: 'var(--t-text)' }}>
                                    سورة {latestLesson.recitation_today_surah} (من {latestLesson.recitation_today_from || '١'} إلى {latestLesson.recitation_today_to || 'الآخر'})
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="font-semibold" style={{ color: 'var(--t-text-muted)' }}>مستوى الحفظ:</span>
                                  <span className="font-black" style={{ color: 'var(--t-primary)' }}>{latestLesson.recitation_today_level}</span>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs" style={{ color: 'var(--t-text-subtle)' }}>لا يوجد تسميع حاضر اليوم.</p>
                            )}

                            {latestLesson.recitation_past_surah && (
                              <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--t-border)' }}>
                                <div className="flex justify-between text-sm">
                                  <span className="font-semibold" style={{ color: 'var(--t-text-muted)' }}>الماضي:</span>
                                  <span className="font-bold" style={{ color: 'var(--t-text)' }}>سورة {latestLesson.recitation_past_surah}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="font-semibold" style={{ color: 'var(--t-text-muted)' }}>مستوى الماضي:</span>
                                  <span className="font-black" style={{ color: 'var(--t-primary)' }}>{latestLesson.recitation_past_level}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Left Column: Reading & Tajweed */}
                          <div className="space-y-4">
                            <h3 className="text-xs font-black border-b pb-1" style={{ color: 'var(--t-primary)', borderColor: 'var(--t-border)' }}>📌 القراءة والتجويد</h3>
                            
                            {latestLesson.reading_surah ? (
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="font-semibold" style={{ color: 'var(--t-text-muted)' }}>القراءة:</span>
                                  <span className="font-bold" style={{ color: 'var(--t-text)' }}>
                                    سورة {latestLesson.reading_surah} (من {latestLesson.reading_from || '١'} إلى {latestLesson.reading_to || 'الآخر'})
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="font-semibold" style={{ color: 'var(--t-text-muted)' }}>مستوى القراءة:</span>
                                  <span className="font-black" style={{ color: 'var(--t-primary)' }}>{latestLesson.reading_level}</span>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs" style={{ color: 'var(--t-text-subtle)' }}>لا يوجد درس قراءة اليوم.</p>
                            )}

                            {latestLesson.tajweed_lesson && (
                              <div className="flex justify-between text-sm pt-2 border-t" style={{ borderColor: 'var(--t-border)' }}>
                                <span className="font-semibold" style={{ color: 'var(--t-text-muted)' }}>التجويد:</span>
                                <span className="font-bold" style={{ color: 'var(--t-text)' }}>{latestLesson.tajweed_lesson}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* General details: notes and interaction */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border rounded-2xl p-4" style={{ backgroundColor: 'var(--t-bg-surface-low)', borderColor: 'var(--t-border)' }}>
                          {latestLesson.interaction_level && (
                            <div className="flex justify-between text-xs sm:text-sm">
                              <span className="font-bold" style={{ color: 'var(--t-text-muted)' }}>📌 التفاعل والنشاط:</span>
                              <span className="font-black" style={{ color: 'var(--t-primary)' }}>{latestLesson.interaction_level}</span>
                            </div>
                          )}
                          {latestLesson.general_notes && (
                            <div className="text-xs leading-relaxed col-span-2 mt-2 pt-2 border-t" style={{ borderColor: 'var(--t-border)', color: 'var(--t-text)' }}>
                              <span className="font-bold block mb-0.5" style={{ color: 'var(--t-primary)' }}>📌 ملاحظات المعلم العامة:</span>
                              <p className="italic">"{latestLesson.general_notes}"</p>
                            </div>
                          )}
                        </div>

                        {/* Homework section */}
                        {(latestLesson.homework_today_surah || latestLesson.homework_past_surah) && (
                          <div className="border-t pt-4 space-y-3" style={{ borderColor: 'var(--t-border)' }}>
                            <h3 className="text-xs font-black" style={{ color: 'var(--t-primary)' }}>📌 الواجبات والتحضير للمرة القادمة</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {latestLesson.homework_today_surah && (
                                <div className="text-xs">
                                  <span className="font-bold" style={{ color: 'var(--t-text-muted)' }}>واجب الحاضر:</span>
                                  <p className="font-bold mt-0.5" style={{ color: 'var(--t-text)' }}>
                                    سورة {latestLesson.homework_today_surah} (من {latestLesson.homework_today_from || '١'} إلى {latestLesson.homework_today_to || 'الآخر'})
                                  </p>
                                </div>
                              )}
                              {latestLesson.homework_past_surah && (
                                <div className="text-xs">
                                  <span className="font-bold" style={{ color: 'var(--t-text-muted)' }}>واجب الماضي:</span>
                                  <p className="font-bold mt-0.5" style={{ color: 'var(--t-text)' }}>
                                    سورة {latestLesson.homework_past_surah}
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

              {/* Left Side (Subscribed Courses & Competitions) - 4 cols */}
              <div className="lg:col-span-4 space-y-8">
                
                {/* 1. Courses Section */}
                <div className="space-y-4">
                  <h2 className="text-lg font-black flex items-center gap-2" style={{ color: 'var(--t-text)' }}>
                    <BookOpen className="w-5 h-5" style={{ color: 'var(--t-primary)' }} />
                    دوراتي التدريبية
                  </h2>

                  {myCourses.length === 0 ? (
                    <div className="border rounded-3xl p-5 text-center text-xs" style={{ backgroundColor: 'var(--t-bg-card)', borderColor: 'var(--t-border)', color: 'var(--t-text-muted)' }}>
                      أنت غير مشترك في أي دورة تعليمية حالياً.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {myCourses.map((sub) => (
                        <Link
                          key={sub.id}
                          to={`/quran/courses/${sub.quran_courses.slug}/watch`}
                          className="block border rounded-2xl p-4 shadow-sm transition-all group hover:shadow-md hover:border-[var(--t-primary)]"
                          style={{ backgroundColor: 'var(--t-bg-card)', borderColor: 'var(--t-border)' }}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[9px] font-bold block mb-1" style={{ color: 'var(--t-primary)' }}>دورة مفعلة</span>
                              <h3 className="font-bold text-sm transition-colors group-hover:text-[var(--t-primary)]" style={{ color: 'var(--t-text)' }}>
                                {sub.quran_courses.name}
                              </h3>
                            </div>
                            <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--t-primary)' }}>مشاهدة</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Suggest Other Courses */}
                  {otherCourses.length > 0 && (
                    <div className="pt-3 space-y-2">
                      <span className="text-xs font-bold block" style={{ color: 'var(--t-text-muted)' }}>دورات مقترحة لك:</span>
                      <div className="space-y-2">
                        {otherCourses.slice(0, 2).map((course) => (
                          <div
                            key={course.id}
                            className="rounded-xl p-3 border flex justify-between items-center"
                            style={{ backgroundColor: 'var(--t-bg-surface-low)', borderColor: 'var(--t-border)' }}
                          >
                            <div className="min-w-0 flex-1 pl-2">
                              <h4 className="text-xs font-bold truncate" style={{ color: 'var(--t-text)' }}>{course.name}</h4>
                              <span className="text-[10px]" style={{ color: 'var(--t-text-muted)' }}>{course.is_free ? 'مجانية' : 'مدفوعة'}</span>
                            </div>
                            <Link
                              to={`/quran/courses/${course.slug}`}
                              className="text-[10px] font-bold hover:underline shrink-0"
                              style={{ color: 'var(--t-primary)' }}
                            >
                              التفاصيل ←
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Competitions Section */}
                <div className="space-y-4">
                  <h2 className="text-lg font-black flex items-center gap-2" style={{ color: 'var(--t-text)' }}>
                    <Trophy className="w-5 h-5" style={{ color: 'var(--t-primary)' }} />
                    المسابقات والفعاليات
                  </h2>

                  {myCompetitions.length === 0 ? (
                    <div className="border rounded-3xl p-5 text-center text-xs" style={{ backgroundColor: 'var(--t-bg-card)', borderColor: 'var(--t-border)', color: 'var(--t-text-muted)' }}>
                      أنت غير مسجل في أي مسابقة قرأنية حالياً.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {myCompetitions.map((sub) => (
                        <Link
                          key={sub.id}
                          to={`/quran/competition/${sub.quran_competitions.slug}`}
                          className="block border rounded-2xl p-4 shadow-sm transition-all group hover:shadow-md hover:border-[var(--t-primary)]"
                          style={{ backgroundColor: 'var(--t-bg-card)', borderColor: 'var(--t-border)' }}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[9px] font-bold block mb-1 flex items-center gap-1" style={{ color: 'var(--t-secondary)' }}>
                                أنت مشترك
                                {sub.student_stage_assignments && (Array.isArray(sub.student_stage_assignments) ? sub.student_stage_assignments[0] : sub.student_stage_assignments) && (
                                  <>
                                    <span className="opacity-50 mx-1">|</span>
                                    {(Array.isArray(sub.student_stage_assignments) ? sub.student_stage_assignments[0] : sub.student_stage_assignments).status === 'active' && (
                                      <span style={{ color: 'var(--t-primary)' }}>
                                        المرحلة: {(Array.isArray(sub.student_stage_assignments) ? sub.student_stage_assignments[0] : sub.student_stage_assignments).competition_stages?.name || 'الحالية'}
                                      </span>
                                    )}
                                    {(Array.isArray(sub.student_stage_assignments) ? sub.student_stage_assignments[0] : sub.student_stage_assignments).status === 'completed' && (
                                      <span className="text-emerald-500 font-bold">
                                        اجتاز المسابقة ✓
                                      </span>
                                    )}
                                    {(Array.isArray(sub.student_stage_assignments) ? sub.student_stage_assignments[0] : sub.student_stage_assignments).status === 'failed' && (
                                      <span className="text-red-500 font-bold">
                                        لم يجتاز
                                      </span>
                                    )}
                                  </>
                                )}
                              </span>
                              <h3 className="font-bold text-sm transition-colors group-hover:text-[var(--t-primary)]" style={{ color: 'var(--t-text)' }}>
                                {sub.quran_competitions.name}
                              </h3>
                            </div>
                            <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--t-secondary)' }}>تفاصيل</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Suggest Other Competitions */}
                  {otherCompetitions.length > 0 && (
                    <div className="pt-3 space-y-2">
                      <span className="text-xs font-bold block" style={{ color: 'var(--t-text-muted)' }}>مسابقات متاحة للتسجيل:</span>
                      <div className="space-y-2">
                        {otherCompetitions.slice(0, 2).map((comp) => (
                          <div
                            key={comp.id}
                            className="rounded-xl p-3 border flex justify-between items-center"
                            style={{ backgroundColor: 'var(--t-bg-surface-low)', borderColor: 'var(--t-border)' }}
                          >
                            <div className="min-w-0 flex-1 pl-2">
                              <h4 className="text-xs font-bold truncate" style={{ color: 'var(--t-text)' }}>{comp.name}</h4>
                              <span className="text-[10px]" style={{ color: 'var(--t-secondary)' }}>انقر للتسجيل</span>
                            </div>
                            <Link
                              to={`/quran/competition/${comp.slug}`}
                              className="text-[10px] font-bold hover:underline shrink-0"
                              style={{ color: 'var(--t-primary)' }}
                            >
                              التفاصيل ←
                            </Link>
                          </div>
                        ))}
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
