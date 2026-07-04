import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import {
  BookOpen,
} from 'lucide-react';
import QuranNav from './QuranNav';
import { WHATSAPP_NUMBER } from '../../lib/constants';
import {
  fetchCourseWatchPageBySlug,
  requestCourseLecturePlaybackUrl,
} from '../../services/courseLecturesService';
import { getYouTubeEmbedUrl } from '../../lib/youtube';
import WatchFocusLayout from './watch/WatchFocusLayout';
import { useAuth } from '../../context/AuthContext';
import { checkMyCourseAccess } from '../../services/studentsService';

export default function CourseWatchPage() {
  const { slug } = useParams();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAdmin } = useAuth();
  const [course, setCourse] = useState(null);
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessLoading, setAccessLoading] = useState(true);
  const [error, setError] = useState('');
  const [playbackRefreshKey, setPlaybackRefreshKey] = useState(0);
  const [playbackState, setPlaybackState] = useState({
    loading: false,
    url: '',
    error: '',
    expiresAt: null,
  });

  // User progress states (completed lectures & notes per lecture)
  const [completedLectures, setCompletedLectures] = useState(new Set());
  const [notes, setNotes] = useState({});

  const lectureParam = searchParams.get('lecture') || location.state?.lectureId || null;

  const selectedLecture = useMemo(() => {
    if (!lectures.length) return null;
    return lectures.find((lecture) => lecture.id === lectureParam) ?? lectures[0];
  }, [lectureParam, lectures]);

  const selectedLectureIndex = useMemo(() => {
    if (!selectedLecture) return -1;
    return lectures.findIndex((lecture) => lecture.id === selectedLecture.id);
  }, [lectures, selectedLecture]);

  const youtubeEmbedUrl = useMemo(() => {
    if (!course?.is_free || !selectedLecture) return null;
    return getYouTubeEmbedUrl(selectedLecture.youtube_url);
  }, [course?.is_free, selectedLecture]);

  const isFreeCourse = Boolean(course?.is_free);
  const selectedLectureId = selectedLecture?.id ?? null;

  // Load course and lectures
  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        setAccessLoading(true);

        const data = await fetchCourseWatchPageBySlug(slug);
        if (!active) return;

        if (!data.course) {
          setCourse(null);
          setLectures([]);
          setError('الدورة المطلوبة غير موجودة أو غير منشورة.');
          return;
        }

        setCourse(data.course);
        setLectures(data.lectures ?? []);

        // Access check
        if (!user) {
          setHasAccess(Boolean(data.course.is_free));
        } else if (isAdmin) {
          setHasAccess(true);
        } else if (data.course.is_free) {
          setHasAccess(true);
        } else {
          // Paid course, check student subscription
          const subscribed = await checkMyCourseAccess(data.course.id);
          if (active) {
            setHasAccess(subscribed);
          }
        }
      } catch (loadError) {
        console.error(loadError);
        if (!active) return;
        setCourse(null);
        setLectures([]);
        setError(loadError.message ?? 'تعذر تحميل صفحة المشاهدة حالياً.');
      } finally {
        if (active) {
          setLoading(false);
          setAccessLoading(false);
        }
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [slug, user, isAdmin]);

  // Load user progress and notes once course details are fetched
  useEffect(() => {
    if (course) {
      // Completed lectures list
      const savedCompleted = localStorage.getItem(`completed_lectures_${course.id}`);
      if (savedCompleted) {
        try {
          setCompletedLectures(new Set(JSON.parse(savedCompleted)));
        } catch (e) {
          console.error(e);
        }
      } else {
        setCompletedLectures(new Set());
      }

      // Notes object
      const savedNotes = localStorage.getItem(`notes_${course.id}`);
      if (savedNotes) {
        try {
          setNotes(JSON.parse(savedNotes));
        } catch (e) {
          console.error(e);
        }
      } else {
        setNotes({});
      }
    }
  }, [course]);

  // Update Page Document Title
  useEffect(() => {
    if (course) {
      document.title = `${course.name} - المشاهدة | منصة القرآن حبل الله`;
      return;
    }

    document.title = 'صفحة المشاهدة - حبل الله';
  }, [course]);

  // Update Search Params on Lecture change
  useEffect(() => {
    if (!selectedLecture) return;

    const currentLectureParam = searchParams.get('lecture');
    if (currentLectureParam === selectedLecture.id) return;

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('lecture', selectedLecture.id);
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, selectedLecture, setSearchParams]);

  // Load Playback URL for secure MP4 files
  useEffect(() => {
    let active = true;

    const loadPlaybackUrl = async () => {
      if (!course || isFreeCourse || !selectedLectureId || !hasAccess) {
        if (!active) return;
        setPlaybackState({ loading: false, url: '', error: '', expiresAt: null });
        return;
      }

      try {
        setPlaybackState({ loading: true, url: '', error: '', expiresAt: null });
        const result = await requestCourseLecturePlaybackUrl(selectedLectureId);

        if (!active) return;

        setPlaybackState({
          loading: false,
          url: result.url,
          error: '',
          expiresAt: result.expiresAt,
        });
      } catch (playbackError) {
        console.error(playbackError);
        if (!active) return;

        setPlaybackState({
          loading: false,
          url: '',
          error: playbackError.message ?? 'تعذر تحميل رابط تشغيل الفيديو.',
          expiresAt: null,
        });
      }
    };

    loadPlaybackUrl();

    return () => {
      active = false;
    };
  }, [course, isFreeCourse, selectedLectureId, playbackRefreshKey, hasAccess]);

  // Event handlers
  const handleSelectLecture = (lectureId) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('lecture', lectureId);
    setSearchParams(nextParams, { replace: false });
  };

  const handleSubscribe = () => {
    if (!course) return;

    const text = `السلام عليكم ورحمة الله وبركاته، أرغب في الاشتراك في دورة: (${course.name})، يرجى إفادتي بالتفاصيل وكيفية البدء.`;
    const url = `https://api.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const toggleCompleteLecture = (lectureId) => {
    if (!course) return;
    setCompletedLectures((prev) => {
      const next = new Set(prev);
      if (next.has(lectureId)) {
        next.delete(lectureId);
      } else {
        next.add(lectureId);
      }
      localStorage.setItem(`completed_lectures_${course.id}`, JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const saveNote = (lectureId, text) => {
    if (!course) return;
    setNotes((prev) => {
      const next = { ...prev, [lectureId]: text };
      localStorage.setItem(`notes_${course.id}`, JSON.stringify(next));
      return next;
    });
  };

  // Loading indicator screen
  if (loading || accessLoading) {
    return (
      <div dir="rtl" className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--t-bg-page)', color: 'var(--t-text)' }}>
        <QuranNav />
        <div className="flex-1 flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-sm font-semibold" style={{ color: 'var(--t-text-muted)' }}>جاري تحميل صفحة المشاهدة والتحقق من الصلاحية...</p>
        </div>
      </div>
    );
  }

  // Error page load screen
  if (error || !course) {
    return (
      <div dir="rtl" className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--t-bg-page)', color: 'var(--t-text)' }}>
        <QuranNav />
        <div className="flex-1 flex flex-col items-center justify-center py-24 px-5 text-center">
          <BookOpen className="w-16 h-16 text-red-500/40 mb-4" />
          <h2 className="text-2xl font-black mb-2" style={{ color: 'var(--t-primary)' }}>تعذر فتح صفحة المشاهدة</h2>
          <p className="text-sm max-w-md mx-auto mb-8" style={{ color: 'var(--t-text-muted)' }}>
            {error || 'المعذرة، لم نتمكن من تحميل هذه الدورة حالياً.'}
          </p>
          <Link
            to="/quran/courses"
            className="inline-flex items-center gap-2 py-3.5 px-6 rounded-xl font-bold text-white text-sm bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
          >
            العودة إلى صفحة الدورات
          </Link>
        </div>
      </div>
    );
  }

  // Not logged in screen
  if (!course.is_free && !user) {
    return (
      <div dir="rtl" className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--t-bg-page)', color: 'var(--t-text)' }}>
        <QuranNav />
        <div className="flex-1 flex flex-col items-center justify-center py-24 px-5 text-center">
          <BookOpen className="w-16 h-16 text-emerald-600/40 mb-4" />
          <h2 className="text-2xl font-black mb-2" style={{ color: 'var(--t-primary)' }}>تسجيل الدخول مطلوب</h2>
          <p className="text-sm max-w-md mx-auto mb-8" style={{ color: 'var(--t-text-muted)' }}>
            لمشاهدة محاضرات هذه الدورة، يرجى تسجيل الدخول إلى حساب الطالب الخاص بك أولاً.
          </p>
          <Link
            to="/quran/student/login"
            className="inline-flex items-center gap-2 py-3.5 px-6 rounded-xl font-bold text-white text-sm bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
          >
            تسجيل الدخول كطالب
          </Link>
        </div>
      </div>
    );
  }

  // Subscribed but not authorized screen
  if (!hasAccess) {
    return (
      <div dir="rtl" className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--t-bg-page)', color: 'var(--t-text)' }}>
        <QuranNav />
        <div className="flex-1 flex flex-col items-center justify-center py-24 px-5 text-center">
          <BookOpen className="w-16 h-16 text-amber-500/40 mb-4" />
          <h2 className="text-2xl font-black mb-2" style={{ color: 'var(--t-primary)' }}>الوصول غير مفعل</h2>
          <p className="text-sm max-w-md mx-auto mb-8" style={{ color: 'var(--t-text-muted)' }}>
            هذه الدورة مدفوعة، وحسابك غير مشترك فيها حالياً. يرجى التواصل مع إدارة المنصة لتفعيل الدورة لحسابك.
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleSubscribe}
              className="inline-flex items-center gap-2 py-3.5 px-6 rounded-xl font-bold text-white text-sm bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
            >
              طلب تفعيل الاشتراك عبر الواتساب
            </button>
            <Link
              to="/quran/courses"
              className="inline-flex items-center gap-2 py-3.5 px-6 rounded-xl font-bold text-emerald-700 border border-emerald-600/20 text-sm hover:bg-emerald-50 dark:hover:bg-emerald-950/10 transition-colors cursor-pointer"
            >
              تصفح الدورات الأخرى
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      dir="rtl" 
      className="min-h-screen flex flex-col transition-colors duration-300" 
      style={{ 
        backgroundColor: 'var(--t-bg-page)', 
        color: 'var(--t-text)' 
      }}
    >
      <WatchFocusLayout
        course={course}
        lectures={lectures}
        selectedLecture={selectedLecture}
        selectedLectureIndex={selectedLectureIndex}
        playbackState={playbackState}
        playbackRefreshKey={playbackRefreshKey}
        setPlaybackRefreshKey={setPlaybackRefreshKey}
        handleSelectLecture={handleSelectLecture}
        handleSubscribe={handleSubscribe}
        youtubeEmbedUrl={youtubeEmbedUrl}
        completedLectures={completedLectures}
        toggleCompleteLecture={toggleCompleteLecture}
        notes={notes}
        saveNote={saveNote}
      />
    </div>
  );
}
