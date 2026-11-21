import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, Award, CheckCircle, ChevronRight, MessageCircle, PlayCircle, List, Lock } from 'lucide-react';
import QuranNav from './QuranNav';
import QuranFooter from './QuranFooter';
import { fetchCourseBySlug } from '../../services/coursesService';
import { fetchPublishedCourseLectures } from '../../services/courseLecturesService';
import { checkMyCourseAccess } from '../../services/studentsService';
import { WHATSAPP_NUMBER } from '../../lib/constants';
import { useAuth } from '../../context/AuthContext';
import quranHero from '../../assets/quran-hero.png';
import {
  DirectionalIcon,
  LocalizedLink,
  truncateMetaDescription,
  useFormatters,
  useLocalizedContent,
  usePageMeta,
} from '../../i18n';

export default function CourseDetailPage() {
  const { t } = useTranslation(['courses', 'seo']);
  const { formatNumber } = useFormatters();
  const { field, text, latinName, list } = useLocalizedContent();
  const { slug } = useParams();
  const { user, isAdmin, isStudent } = useAuth();

  const [course, setCourse] = useState(null);
  const [lectures, setLectures] = useState([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    async function loadCourse() {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchCourseBySlug(slug);
        if (!active) return;
        if (!data) {
          setError(t('detail.errors.notFound'));
          return;
        }

        setCourse(data);

        // Fetch lectures in parallel with access check
        const [lects, accessResult] = await Promise.all([
          fetchPublishedCourseLectures(data.id).catch(() => []),
          (async () => {
            if (data.is_free) return true;        // Free: everyone has access
            if (isAdmin) return true;              // Admin always has access
            if (!user) return false;               // Not logged in
            return checkMyCourseAccess(data.id);  // Check subscription
          })(),
        ]);

        if (!active) return;
        setLectures(lects);
        setHasAccess(accessResult);
      } catch (err) {
        console.warn('Supabase fetch failed:', err);
        if (active) setError(t('detail.errors.loadFailed'));
      } finally {
        if (active) setLoading(false);
      }
    }
    loadCourse();
    return () => { active = false; };
  }, [slug, user, isAdmin, t]);

  const activeCourse = !loading && !error ? course : null;
  const activeCourseName = activeCourse ? text(activeCourse, 'name') : '';
  const activeCourseDescription = activeCourse
    ? text(activeCourse, 'short_description') || text(activeCourse, 'long_description')
    : '';

  usePageMeta({
    title: activeCourseName
      ? t('seo:templates.courseDetailTitle', { name: activeCourseName })
      : undefined,
    description: activeCourseDescription
      ? truncateMetaDescription(activeCourseDescription)
      : undefined,
  });

  const handleSubscribe = () => {
    if (!course) return;
    const message = t('detail.whatsappSubscribeMessage', { name: text(course, 'name') });
    const url = `https://api.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--t-bg-page)', color: 'var(--t-text)' }}>
        <QuranNav />
        <div className="flex-grow flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-sm font-semibold" style={{ color: 'var(--t-text-muted)' }}>{t('detail.loading')}</p>
        </div>
        <QuranFooter />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--t-bg-page)', color: 'var(--t-text)' }}>
        <QuranNav />
        <div className="flex-grow flex flex-col items-center justify-center py-24 px-5 text-center">
          <BookOpen className="w-16 h-16 text-red-500/40 mb-4" />
          <h2 className="text-2xl font-black mb-2" style={{ color: 'var(--t-primary)' }}>{t('detail.notFoundTitle')}</h2>
          <p className="text-sm max-w-md mx-auto mb-8" style={{ color: 'var(--t-text-muted)' }}>
            {error || t('detail.notFoundDefault')}
          </p>
          <LocalizedLink
            to="/quran/courses"
            className="inline-flex items-center gap-2 py-3.5 px-6 rounded-xl font-bold text-white text-sm bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
          >
            {t('detail.backToCourses')}
          </LocalizedLink>
        </div>
        <QuranFooter />
      </div>
    );
  }

  const isSignedInStudent = Boolean(user && isStudent && !isAdmin);
  const isEnrolledFreeCourse = course.is_free && isSignedInStudent;
  const isEnrolledPaidCourse = !course.is_free && hasAccess;
  const watchHref = lectures[0]?.slug
    ? `/quran/courses/${course.slug}/watch/${lectures[0].slug}`
    : `/quran/courses/${course.slug}/watch`;

  const courseName = field(course, 'name');
  const shortDescription = field(course, 'short_description');
  const longDescription = field(course, 'long_description');
  const coursePrice = field(course, 'price');
  const teacherName = latinName(course, 'teacher_name', 'teacher_name_latin');
  const learningOutcomes = list(course, 'learning_outcomes');

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--t-bg-page)', color: 'var(--t-text)' }}>
      <QuranNav />

      <main className="flex-1 py-12 px-5 md:px-8 relative overflow-hidden">
        <div className="geometric-bg opacity-10" />
        
        <div className="max-w-4xl mx-auto relative z-10">
          {/* Breadcrumb / Back button */}
          <LocalizedLink
            to="/quran/courses"
            className="inline-flex items-center gap-1.5 font-bold text-xs mb-8 transition-colors hover:opacity-75"
            style={{ color: 'var(--t-text-muted)' }}
          >
            <DirectionalIcon icon={ChevronRight} flipIn="ltr" size={16} />
            <span>{t('detail.backToCourses')}</span>
          </LocalizedLink>

          {/* Main Card Content */}
          <div
            className="rounded-3xl border overflow-hidden shadow-sm"
            style={{
              backgroundColor: 'var(--t-bg-card)',
              borderColor: 'var(--t-border-gold)',
            }}
          >
            {/* Wide Hero Image */}
            <div className="relative h-64 md:h-80 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
              <img
                src={course.image_url || quranHero}
                alt={courseName.text}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              <div className="absolute bottom-6 inset-x-6 text-white">
                <span className="inline-block px-3 py-1.5 rounded-full text-xs font-black bg-emerald-600 mb-3">
                  {course.is_free ? t('detail.freeInitiative') : t('detail.educationalCourse')}
                </span>
                <h1 dir={courseName.dir} className="text-2xl md:text-4xl font-black tracking-tight">{courseName.text}</h1>
              </div>
            </div>

            {/* Course Information Details */}
            <div className="p-6 md:p-10 space-y-10">
              {teacherName.text.trim() !== '' && (
                <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--t-text-muted)' }}>
                  <span>{t('detail.teacherPrefix')}</span>
                  <span dir={teacherName.dir} className="font-bold" style={{ color: 'var(--t-primary)' }}>{teacherName.text}</span>
                </div>
              )}

              {/* Short / Long Description */}
              <div className="space-y-4">
                <p dir={shortDescription.dir} className="text-base md:text-lg font-semibold leading-relaxed" style={{ color: 'var(--t-primary)' }}>
                  {shortDescription.text}
                </p>
                {longDescription.text && (
                  <p dir={longDescription.dir} className="text-sm md:text-base leading-relaxed whitespace-pre-line" style={{ color: 'var(--t-text-muted)' }}>
                    {longDescription.text}
                  </p>
                )}
              </div>

              {/* Learning Outcomes */}
              {learningOutcomes.items.length > 0 && (
                <div className="p-6 md:p-8 rounded-2xl border" style={{ backgroundColor: 'var(--t-bg-surface-low)', borderColor: 'var(--t-border-gold)' }}>
                  <h2 className="text-lg md:text-xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--t-primary)' }}>
                    <Award className="w-5 h-5 text-amber-500" />
                    <span>{t('detail.learningOutcomesTitle')}</span>
                  </h2>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {learningOutcomes.items.map((outcome, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-sm leading-relaxed" style={{ color: 'var(--t-text-muted)' }}>
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span dir={learningOutcomes.dir}>{outcome}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Course Content: Lectures List */}
              {lectures.length > 0 && (
                <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--t-border)' }}>
                  <div
                    className="flex items-center justify-between px-5 py-4 border-b"
                    style={{ backgroundColor: 'var(--t-bg-surface-low)', borderColor: 'var(--t-border)' }}
                  >
                    <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--t-primary)' }}>
                      <List className="w-4 h-4 text-emerald-600" />
                      {t('detail.contentTitle')}
                    </h2>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: 'var(--t-badge-bg)', color: 'var(--t-primary)' }}>
                      {t('detail.lectureCount', {
                        count: lectures.length,
                        formattedCount: formatNumber(lectures.length),
                      })}
                    </span>
                  </div>
                  <ul className="divide-y" style={{ borderColor: 'var(--t-border)' }}>
                    {lectures.map((lecture, idx) => {
                      const lectureTitle = field(lecture, 'title');
                      return (
                      <li
                        key={lecture.id}
                        className="flex items-center gap-3 px-5 py-3.5"
                        style={{ color: 'var(--t-text-muted)' }}
                      >
                        <span className="text-xs font-black w-6 shrink-0 text-center opacity-50">
                          {formatNumber(idx + 1)}
                        </span>
                        {(course.is_free || hasAccess) ? (
                          <PlayCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <Lock className="w-4 h-4 shrink-0 opacity-40" />
                        )}
                        <span dir={lectureTitle.dir} className="text-sm font-semibold flex-1">{lectureTitle.text}</span>
                        {course.is_free && (
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 shrink-0">{t('detail.freeBadge')}</span>
                        )}
                      </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Subscription CTA Panel */}
              <div className="border-t pt-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6" style={{ borderColor: 'var(--t-border)' }}>
                <div>
                  <h4 className="font-bold text-base mb-1" style={{ color: 'var(--t-text)' }}>
                    {course.is_free
                      ? isEnrolledFreeCourse
                        ? t('detail.continueLearning')
                        : t('detail.joinFreeCta')
                      : isEnrolledPaidCourse
                        ? t('detail.continueLearning')
                        : t('detail.subscribeCta')}
                  </h4>
                  {!course.is_free && !isEnrolledPaidCourse && (
                    <p className="text-xs" style={{ color: 'var(--t-text-muted)' }}>
                      {t('detail.whatsappSubtitle')}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-stretch md:items-end gap-3 w-full md:w-auto shrink-0">
                  {/* Price row — hidden for free courses */}
                  {!course.is_free && !isEnrolledPaidCourse && (
                    <div className="flex items-center justify-between md:justify-end gap-4">
                      <span className="text-sm font-bold" style={{ color: 'var(--t-text-muted)' }}>{t('detail.priceLabel')}</span>
                      <span dir={coursePrice.text ? coursePrice.dir : undefined} className="text-2xl font-black" style={{ color: 'var(--t-secondary)' }}>
                        {coursePrice.text || t('detail.contactForPrice')}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    {/* Free course: direct watch button always shown */}
                    {course.is_free && (
                      <LocalizedLink
                        to={watchHref}
                        className="py-3.5 px-6 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-2 justify-center shadow-sm shadow-emerald-600/10"
                      >
                        <PlayCircle className="w-4 h-4" />
                        {isEnrolledFreeCourse ? t('detail.continueLearning') : t('detail.startWatching')}
                      </LocalizedLink>
                    )}

                    {/* Paid course: show watch button ONLY if user is logged in AND subscribed (or admin) */}
                    {!course.is_free && hasAccess && (
                      <LocalizedLink
                        to={watchHref}
                        className="py-3.5 px-6 rounded-xl font-bold text-sm border hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-2 justify-center"
                        style={{ borderColor: 'var(--t-border)', color: 'var(--t-primary)' }}
                      >
                        <PlayCircle className="w-4 h-4" />
                        {t('detail.continueLearning')}
                      </LocalizedLink>
                    )}

                    {/* Paid course: show subscribe (WhatsApp) button */}
                    {!course.is_free && !hasAccess && (
                      <button
                        onClick={handleSubscribe}
                        className="py-3.5 px-6 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-2 cursor-pointer justify-center shadow-sm shadow-emerald-600/10"
                      >
                        <MessageCircle className="w-4 h-4" />
                        {t('detail.clickToSubscribe')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <QuranFooter />
    </div>
  );
}
