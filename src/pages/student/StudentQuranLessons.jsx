import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchMyLessons } from '../../services/quranLessonsService';
import QuranNav from '../quran/QuranNav';
import QuranFooter from '../quran/QuranFooter';
import { Calendar, ArrowRight } from 'lucide-react';

export default function StudentQuranLessons() {
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
    <div dir="rtl" className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--t-bg-page)', color: 'var(--t-text)' }}>
      <QuranNav />

      <main className="flex-1 py-10 px-5 md:px-8 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Back Button */}
          <Link
            to="/student/dashboard"
            className="inline-flex items-center gap-1.5 font-bold text-xs bg-white dark:bg-emerald-950/20 border border-emerald-600/10 dark:border-emerald-400/10 hover:border-emerald-600 dark:hover:border-emerald-400 text-emerald-800 dark:text-emerald-300 px-4 py-2.5 rounded-xl shadow-sm hover:shadow transition-all"
          >
            <ArrowRight size={16} />
            العودة إلى لوحة التحكم
          </Link>

          {/* Header */}
          <div className="flex justify-between items-center pb-4 border-b border-emerald-600/10 dark:border-emerald-400/10">
            <div>
              <h1 className="text-xl md:text-2xl font-black text-emerald-900 dark:text-emerald-300">سجل تقارير دروس القرآن</h1>
              <p className="text-xs text-emerald-800/60 dark:text-emerald-200/60 mt-0.5">
                متابعة الدروس والتسميع والقراءة والتجويد مع المعلم.
              </p>
            </div>
            <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-600/10 text-emerald-800 dark:text-emerald-300 border border-emerald-600/10">
              عدد الدروس: {lessons.length}
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin" />
              <p className="text-sm font-semibold text-emerald-800/60 dark:text-emerald-200/60">جاري تحميل سجل الدروس...</p>
            </div>
          ) : lessons.length === 0 ? (
            <div className="bg-white dark:bg-emerald-950/20 border border-emerald-600/10 dark:border-emerald-400/10 rounded-3xl p-12 text-center text-emerald-800/60 dark:text-emerald-200/60">
              <Calendar className="w-16 h-16 mx-auto mb-3 opacity-20 text-emerald-600" />
              <h2 className="text-lg font-black text-emerald-900 dark:text-emerald-300">لا يوجد دروس مسجلة بعد</h2>
              <p className="text-xs max-w-sm mx-auto mt-1">سجل التقييمات يظهر هنا بمجرد إضافة أول درس أو تقييم من الشيخ المتابع لك.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {lessons.map((lesson, idx) => (
                <div
                  key={lesson.id}
                  className="bg-white dark:bg-emerald-950/20 border border-emerald-600/10 dark:border-emerald-400/10 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 relative transition-all duration-300 hover:shadow-md"
                >
                  {/* Floating index indicator */}
                  <span className="absolute top-6 left-6 text-2xl font-black text-emerald-700/10 dark:text-emerald-300/10">
                    #{lessons.length - idx}
                  </span>

                  {/* Hijri Date and Gregorian Date */}
                  <div className="flex justify-between items-start border-b border-emerald-600/10 dark:border-emerald-400/10 pb-4 flex-wrap gap-2 pr-10">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">تاريخ التقييم</span>
                      <span className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
                        {new Date(lesson.lesson_date).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    </div>
                    {lesson.hijri_date && (
                      <div className="bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                        <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">📜 {lesson.hijri_date}</span>
                      </div>
                    )}
                  </div>

                  {/* Quran performance grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Recitation (تسميع) */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-black text-emerald-700 dark:text-emerald-400 border-b border-emerald-600/5 pb-1">📌 تسميع اليوم</h3>
                      
                      {lesson.recitation_today_surah ? (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-emerald-800/60 dark:text-emerald-200/60 font-semibold">الحاضر:</span>
                            <span className="font-bold text-emerald-950 dark:text-emerald-200">
                              سورة {lesson.recitation_today_surah} (من {lesson.recitation_today_from || '١'} إلى {lesson.recitation_today_to || 'الآخر'})
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-emerald-800/60 dark:text-emerald-200/60 font-semibold">مستوى الحفظ:</span>
                            <span className="font-black text-emerald-700 dark:text-emerald-400">{lesson.recitation_today_level}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-emerald-800/40">لا يوجد تسميع حاضر اليوم.</p>
                      )}

                      {lesson.recitation_past_surah && (
                        <div className="space-y-2 pt-2 border-t border-emerald-600/5">
                          <div className="flex justify-between text-sm">
                            <span className="text-emerald-800/60 dark:text-emerald-200/60 font-semibold">الماضي:</span>
                            <span className="font-bold text-emerald-950 dark:text-emerald-200">سورة {lesson.recitation_past_surah}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-emerald-800/60 dark:text-emerald-200/60 font-semibold">مستوى الماضي:</span>
                            <span className="font-black text-emerald-700 dark:text-emerald-400">{lesson.recitation_past_level}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Reading & Tajweed */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-black text-emerald-700 dark:text-emerald-400 border-b border-emerald-600/5 pb-1">📌 القراءة والتجويد</h3>
                      
                      {lesson.reading_surah ? (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-emerald-800/60 dark:text-emerald-200/60 font-semibold">القراءة:</span>
                            <span className="font-bold text-emerald-950 dark:text-emerald-200">
                              سورة {lesson.reading_surah} (من {lesson.reading_from || '١'} إلى {lesson.reading_to || 'الآخر'})
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-emerald-800/60 dark:text-emerald-200/60 font-semibold">مستوى القراءة:</span>
                            <span className="font-black text-emerald-700 dark:text-emerald-400">{lesson.reading_level}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-emerald-800/40">لا يوجد درس قراءة اليوم.</p>
                      )}

                      {lesson.tajweed_lesson && (
                        <div className="flex justify-between text-sm pt-2 border-t border-emerald-600/5">
                          <span className="text-emerald-800/60 dark:text-emerald-200/60 font-semibold">التجويد:</span>
                          <span className="font-bold text-emerald-950 dark:text-emerald-200">{lesson.tajweed_lesson}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* General details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-emerald-50/50 dark:bg-emerald-950/40 border border-emerald-600/5 rounded-2xl p-4">
                    {lesson.interaction_level && (
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-emerald-800/60 dark:text-emerald-200/60 font-bold">📌 التفاعل والنشاط:</span>
                        <span className="font-black text-emerald-800 dark:text-emerald-300">{lesson.interaction_level}</span>
                      </div>
                    )}
                    {lesson.general_notes && (
                      <div className="text-xs leading-relaxed text-emerald-900/80 dark:text-emerald-100/80 col-span-2 mt-2 pt-2 border-t border-emerald-600/5">
                        <span className="font-bold block text-emerald-700 dark:text-emerald-400 mb-0.5">📌 ملاحظات المعلم العامة:</span>
                        <p className="italic">"{lesson.general_notes}"</p>
                      </div>
                    )}
                  </div>

                  {/* Homework section */}
                  {(lesson.homework_today_surah || lesson.homework_past_surah) && (
                    <div className="border-t border-emerald-600/10 dark:border-emerald-400/10 pt-4 space-y-3">
                      <h3 className="text-xs font-black text-emerald-700 dark:text-emerald-400">📌 الواجبات والتحضير للمرة القادمة</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {lesson.homework_today_surah && (
                          <div className="text-xs">
                            <span className="font-bold text-emerald-800/60 dark:text-emerald-200/60">واجب الحاضر:</span>
                            <p className="font-bold mt-0.5 text-emerald-950 dark:text-emerald-200">
                              سورة {lesson.homework_today_surah} (من {lesson.homework_today_from || '١'} إلى {lesson.homework_today_to || 'الآخر'})
                            </p>
                          </div>
                        )}
                        {lesson.homework_past_surah && (
                          <div className="text-xs">
                            <span className="font-bold text-emerald-800/60 dark:text-emerald-200/60">واجب الماضي:</span>
                            <p className="font-bold mt-0.5 text-emerald-950 dark:text-emerald-200">
                              سورة {lesson.homework_past_surah}
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
