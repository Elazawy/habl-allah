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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-emerald-950/20 backdrop-blur-md border border-emerald-600/10 dark:border-emerald-400/10 rounded-3xl p-6 md:p-8 shadow-sm">
            <div>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 block mb-1">أهلاً بك يا قارئ القرآن</span>
              <h1 className="text-2xl md:text-3xl font-black text-emerald-900 dark:text-emerald-300">
                مرحباً، {studentProfile?.full_name}
              </h1>
              <p className="text-xs md:text-sm text-emerald-800/60 dark:text-emerald-200/60 mt-1">
                رقم الحساب: {studentProfile?.phone} | نسأل الله أن يجعلك من أهل القرآن الذين هم أهله وخاصته.
              </p>
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
              <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin" />
              <p className="text-sm font-semibold text-emerald-800/60 dark:text-emerald-200/60">جاري تحميل بيانات لوحة التحكم...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Right Side (Teacher details and Latest Quran report) - 8 cols */}
              <div className="lg:col-span-8 space-y-8">
                
                {/* 1. Teacher Assignment Check */}
                {!studentProfile?.teachers ? (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-6 text-center space-y-4">
                    <User className="w-12 h-12 text-amber-500 mx-auto opacity-70" />
                    <h2 className="text-lg font-bold text-amber-800 dark:text-amber-400">أنت غير مشترك مع معلم حالياً</h2>
                    <p className="text-xs max-w-md mx-auto text-amber-700/80 dark:text-amber-300/80">
                      لتبدأ حلقات الحفظ والتسميع المباشرة ومتابعة ورقة تقييم القرآن الخاصة بك، يرجى اختيار المعلم المناسب لك والاشتراك معه.
                    </p>
                    <Link
                      to="/quran/teachers"
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-700 text-white transition-all cursor-pointer"
                    >
                      تصفح قائمة المعلمين والاشتراك
                    </Link>
                  </div>
                ) : (
                  /* Teacher Information Card */
                  <div className="bg-white dark:bg-emerald-950/20 border border-emerald-600/10 dark:border-emerald-400/10 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-center gap-5">
                    {studentProfile.teachers.photo_url ? (
                      <img
                        src={studentProfile.teachers.photo_url}
                        alt={studentProfile.teachers.name}
                        className="w-20 h-20 rounded-2xl object-cover border border-emerald-600/20"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-emerald-600/10 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-black text-3xl">
                        {studentProfile.teachers.name[0]}
                      </div>
                    )}
                    <div className="text-center sm:text-right flex-1">
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">معلمك المتابع الحالي</span>
                      <h2 className="text-lg font-black text-emerald-900 dark:text-emerald-300">{studentProfile.teachers.name}</h2>
                      <p className="text-xs text-emerald-800/60 dark:text-emerald-200/60 mt-0.5">
                        حلقات تسميع القرآن الكريم ومراجعة الأحكام بشكل دوري.
                      </p>
                    </div>
                    <button
                      onClick={() => handleContactTeacher(studentProfile.teachers.name)}
                      className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <Phone className="w-4 h-4" />
                      تواصل عبر واتساب
                    </button>
                  </div>
                )}

                {/* 2. Latest Quran Lesson Record */}
                {studentProfile?.teachers && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h2 className="text-lg font-black text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-emerald-700" />
                        آخر تقرير لدرس القرآن
                      </h2>
                      {lessons.length > 0 && (
                        <Link
                          to="/student/lessons"
                          className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
                        >
                          عرض كل التقارير ({lessons.length})
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>

                    {!latestLesson ? (
                      <div className="bg-white dark:bg-emerald-950/20 border border-emerald-600/10 dark:border-emerald-400/10 rounded-3xl p-8 text-center text-emerald-800/60 dark:text-emerald-200/60">
                        <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30 text-emerald-600" />
                        <p className="text-xs">لم يتم تسجيل أي تقارير قرآن لك بعد من قبل الشيخ المتابع.</p>
                      </div>
                    ) : (
                      /* Quran Lesson Sheet format */
                      <div className="bg-white dark:bg-emerald-950/20 border border-emerald-600/10 dark:border-emerald-400/10 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 relative">
                        {/* Hijri Date and Gregorian Date */}
                        <div className="flex justify-between items-start border-b border-emerald-600/10 dark:border-emerald-400/10 pb-4 flex-wrap gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">تاريخ تقييم اليوم</span>
                            <span className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
                              {new Date(latestLesson.lesson_date).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                          </div>
                          {latestLesson.hijri_date && (
                            <div className="text-left sm:text-right bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">📜 {latestLesson.hijri_date}</span>
                            </div>
                          )}
                        </div>

                        {/* Quran performance grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Right Column: Recitation (تسميع) */}
                          <div className="space-y-4">
                            <h3 className="text-xs font-black text-emerald-700 dark:text-emerald-400 border-b border-emerald-600/5 pb-1">📌 تسميع اليوم</h3>
                            
                            {latestLesson.recitation_today_surah ? (
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-emerald-800/60 dark:text-emerald-200/60 font-semibold">الحاضر:</span>
                                  <span className="font-bold text-emerald-950 dark:text-emerald-200">
                                    سورة {latestLesson.recitation_today_surah} (من {latestLesson.recitation_today_from || '١'} إلى {latestLesson.recitation_today_to || 'الآخر'})
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-emerald-800/60 dark:text-emerald-200/60 font-semibold">مستوى الحفظ:</span>
                                  <span className="font-black text-emerald-700 dark:text-emerald-400">{latestLesson.recitation_today_level}</span>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-emerald-800/40">لا يوجد تسميع حاضر اليوم.</p>
                            )}

                            {latestLesson.recitation_past_surah && (
                              <div className="space-y-2 pt-2 border-t border-emerald-600/5">
                                <div className="flex justify-between text-sm">
                                  <span className="text-emerald-800/60 dark:text-emerald-200/60 font-semibold">الماضي:</span>
                                  <span className="font-bold text-emerald-950 dark:text-emerald-200">سورة {latestLesson.recitation_past_surah}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-emerald-800/60 dark:text-emerald-200/60 font-semibold">مستوى الماضي:</span>
                                  <span className="font-black text-emerald-700 dark:text-emerald-400">{latestLesson.recitation_past_level}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Left Column: Reading & Tajweed */}
                          <div className="space-y-4">
                            <h3 className="text-xs font-black text-emerald-700 dark:text-emerald-400 border-b border-emerald-600/5 pb-1">📌 القراءة والتجويد</h3>
                            
                            {latestLesson.reading_surah ? (
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-emerald-800/60 dark:text-emerald-200/60 font-semibold">القراءة:</span>
                                  <span className="font-bold text-emerald-950 dark:text-emerald-200">
                                    سورة {latestLesson.reading_surah} (من {latestLesson.reading_from || '١'} إلى {latestLesson.reading_to || 'الآخر'})
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-emerald-800/60 dark:text-emerald-200/60 font-semibold">مستوى القراءة:</span>
                                  <span className="font-black text-emerald-700 dark:text-emerald-400">{latestLesson.reading_level}</span>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-emerald-800/40">لا يوجد درس قراءة اليوم.</p>
                            )}

                            {latestLesson.tajweed_lesson && (
                              <div className="flex justify-between text-sm pt-2 border-t border-emerald-600/5">
                                <span className="text-emerald-800/60 dark:text-emerald-200/60 font-semibold">التجويد:</span>
                                <span className="font-bold text-emerald-950 dark:text-emerald-200">{latestLesson.tajweed_lesson}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* General details: notes and interaction */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-emerald-50/50 dark:bg-emerald-950/40 border border-emerald-600/5 rounded-2xl p-4">
                          {latestLesson.interaction_level && (
                            <div className="flex justify-between text-xs sm:text-sm">
                              <span className="text-emerald-800/60 dark:text-emerald-200/60 font-bold">📌 التفاعل والنشاط:</span>
                              <span className="font-black text-emerald-800 dark:text-emerald-300">{latestLesson.interaction_level}</span>
                            </div>
                          )}
                          {latestLesson.general_notes && (
                            <div className="text-xs leading-relaxed text-emerald-900/80 dark:text-emerald-100/80 col-span-2 mt-2 pt-2 border-t border-emerald-600/5">
                              <span className="font-bold block text-emerald-700 dark:text-emerald-400 mb-0.5">📌 ملاحظات المعلم العامة:</span>
                              <p className="italic">"{latestLesson.general_notes}"</p>
                            </div>
                          )}
                        </div>

                        {/* Homework section */}
                        {(latestLesson.homework_today_surah || latestLesson.homework_past_surah) && (
                          <div className="border-t border-emerald-600/10 dark:border-emerald-400/10 pt-4 space-y-3">
                            <h3 className="text-xs font-black text-emerald-700 dark:text-emerald-400">📌 الواجبات والتحضير للمرة القادمة</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {latestLesson.homework_today_surah && (
                                <div className="text-xs">
                                  <span className="font-bold text-emerald-800/60 dark:text-emerald-200/60">واجب الحاضر:</span>
                                  <p className="font-bold mt-0.5 text-emerald-950 dark:text-emerald-200">
                                    سورة {latestLesson.homework_today_surah} (من {latestLesson.homework_today_from || '١'} إلى {latestLesson.homework_today_to || 'الآخر'})
                                  </p>
                                </div>
                              )}
                              {latestLesson.homework_past_surah && (
                                <div className="text-xs">
                                  <span className="font-bold text-emerald-800/60 dark:text-emerald-200/60">واجب الماضي:</span>
                                  <p className="font-bold mt-0.5 text-emerald-950 dark:text-emerald-200">
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
                  <h2 className="text-lg font-black text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-emerald-700" />
                    دوراتي التدريبية
                  </h2>

                  {myCourses.length === 0 ? (
                    <div className="bg-white dark:bg-emerald-950/20 border border-emerald-600/10 dark:border-emerald-400/10 rounded-3xl p-5 text-center text-emerald-800/60 dark:text-emerald-200/60 text-xs">
                      أنت غير مشترك في أي دورة تعليمية حالياً.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {myCourses.map((sub) => (
                        <Link
                          key={sub.id}
                          to={`/quran/courses/${sub.quran_courses.slug}/watch`}
                          className="block bg-white dark:bg-emerald-950/20 border border-emerald-600/10 dark:border-emerald-400/10 rounded-2xl p-4 shadow-sm hover:border-emerald-600 dark:hover:border-emerald-400 hover:shadow-md transition-all group"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 block mb-1">دورة مفعلة</span>
                              <h3 className="font-bold text-sm text-emerald-900 dark:text-emerald-200 group-hover:text-emerald-700 transition-colors">
                                {sub.quran_courses.name}
                              </h3>
                            </div>
                            <span className="text-[10px] font-bold text-white bg-emerald-600 px-2 py-0.5 rounded-full shrink-0">مشاهدة</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Suggest Other Courses */}
                  {otherCourses.length > 0 && (
                    <div className="pt-3 space-y-2">
                      <span className="text-xs font-bold text-emerald-800/60 dark:text-emerald-200/60 block">دورات مقترحة لك:</span>
                      <div className="space-y-2">
                        {otherCourses.slice(0, 2).map((course) => (
                          <div
                            key={course.id}
                            className="bg-emerald-50/40 dark:bg-emerald-950/10 rounded-xl p-3 border border-emerald-600/5 flex justify-between items-center"
                          >
                            <div className="min-w-0 flex-1 pl-2">
                              <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300 truncate">{course.name}</h4>
                              <span className="text-[10px] text-emerald-800/60 dark:text-emerald-400/60">{course.is_free ? 'مجانية' : 'مدفوعة'}</span>
                            </div>
                            <Link
                              to={`/quran/courses/${course.slug}`}
                              className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline shrink-0"
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
                  <h2 className="text-lg font-black text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-emerald-700" />
                    المسابقات والفعاليات
                  </h2>

                  {myCompetitions.length === 0 ? (
                    <div className="bg-white dark:bg-emerald-950/20 border border-emerald-600/10 dark:border-emerald-400/10 rounded-3xl p-5 text-center text-emerald-800/60 dark:text-emerald-200/60 text-xs">
                      أنت غير مسجل في أي مسابقة قرأنية حالياً.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {myCompetitions.map((sub) => (
                        <Link
                          key={sub.id}
                          to={`/quran/competition/${sub.quran_competitions.slug}`}
                          className="block bg-white dark:bg-emerald-950/20 border border-emerald-600/10 dark:border-emerald-400/10 rounded-2xl p-4 shadow-sm hover:border-emerald-600 dark:hover:border-emerald-400 hover:shadow-md transition-all group"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 block mb-1">أنت مشترك</span>
                              <h3 className="font-bold text-sm text-emerald-900 dark:text-emerald-200 group-hover:text-emerald-700 transition-colors">
                                {sub.quran_competitions.name}
                              </h3>
                            </div>
                            <span className="text-[10px] font-bold text-white bg-amber-600 px-2 py-0.5 rounded-full shrink-0">تفاصيل</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Suggest Other Competitions */}
                  {otherCompetitions.length > 0 && (
                    <div className="pt-3 space-y-2">
                      <span className="text-xs font-bold text-emerald-800/60 dark:text-emerald-200/60 block">مسابقات متاحة للتسجيل:</span>
                      <div className="space-y-2">
                        {otherCompetitions.slice(0, 2).map((comp) => (
                          <div
                            key={comp.id}
                            className="bg-emerald-50/40 dark:bg-emerald-950/10 rounded-xl p-3 border border-emerald-600/5 flex justify-between items-center"
                          >
                            <div className="min-w-0 flex-1 pl-2">
                              <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300 truncate">{comp.name}</h4>
                              <span className="text-[10px] text-amber-700 dark:text-amber-400">انقر للتسجيل</span>
                            </div>
                            <Link
                              to={`/quran/competition/${comp.slug}`}
                              className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline shrink-0"
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
