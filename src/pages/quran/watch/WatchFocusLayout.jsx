import { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  ChevronRight,
  ChevronLeft,
  RefreshCcw,
  Check,
  CheckSquare,
  FileText,
  HelpCircle,
  Send,
  X,
  Edit2,
  MessageSquare,
  Loader,
  Trash2
} from 'lucide-react';
import logoGold from '../../../assets/logo-gold.png';
import DarkModeToggle from '../../../components/DarkModeToggle';
import { fetchLectureQuestions, submitQuestion, updateQuestion, replyToQuestion, deleteQuestion } from '../../../services/lectureQuestionsService';
import { useAuth } from '../../../context/AuthContext';

const lectureNumberFormatter = new Intl.NumberFormat('ar-EG');

export default function WatchFocusLayout({
  course,
  lectures,
  selectedLecture,
  selectedLectureIndex,
  playbackState,
  setPlaybackRefreshKey,
  handleSelectLecture,
  youtubeEmbedUrl,
  completedLectures,
  toggleCompleteLecture,
  notes,
  saveNote
}) {
  const [showSidebar, setShowSidebar] = useState(true);
  const [copied, setCopied] = useState(false);

  // Tab state: 'content' | 'notes' | 'support' (on mobile)
  // 'notes' | 'support' (on desktop)
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024 ? 'content' : 'notes';
    }
    return 'notes';
  });

  const { user, isAdmin, studentProfile } = useAuth();
  const brandPath = user && !isAdmin ? '/quran/student/dashboard' : '/quran';

  // Interactive Question State
  const [questionTitle, setQuestionTitle] = useState('');
  const [questions, setQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false);

  // Edit Question State
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Admin Reply State
  const [replyingQuestionId, setReplyingQuestionId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  
  // UI UX helper states
  const [saveStatus, setSaveStatus] = useState('saved');
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // Fetch questions on selected lecture change
  useEffect(() => {
    let active = true;
    if (!selectedLecture?.id) {
      setQuestions([]);
      return;
    }

    async function loadQuestions() {
      try {
        setLoadingQuestions(true);
        const data = await fetchLectureQuestions(selectedLecture.id);
        if (active) {
          setQuestions(data);
        }
      } catch (err) {
        console.error('Error fetching questions:', err);
      } finally {
        if (active) {
          setLoadingQuestions(false);
        }
      }
    }
    loadQuestions();

    return () => {
      active = false;
    };
  }, [selectedLecture?.id]);

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    if (!questionTitle.trim() || isSubmittingQuestion) return;

    try {
      setIsSubmittingQuestion(true);
      const newQ = await submitQuestion(selectedLecture.id, questionTitle.trim());
      setQuestions((prev) => [
        { ...newQ, student_profiles: { full_name: studentProfile?.full_name || 'أنت' } },
        ...prev,
      ]);
      setQuestionTitle('');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء إرسال السؤال: ' + err.message);
    } finally {
      setIsSubmittingQuestion(false);
    }
  };

  const handleStartEdit = (q) => {
    setEditingQuestionId(q.id);
    setEditingText(q.question_title);
  };

  const handleCancelEdit = () => {
    setEditingQuestionId(null);
    setEditingText('');
  };

  const handleSaveEdit = async (questionId) => {
    if (!editingText.trim() || isSavingEdit) return;

    try {
      setIsSavingEdit(true);
      await updateQuestion(questionId, editingText.trim());
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId ? { ...q, question_title: editingText.trim() } : q
        )
      );
      setEditingQuestionId(null);
      setEditingText('');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء تعديل السؤال: ' + err.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleStartReply = (q) => {
    setReplyingQuestionId(q.id);
    setReplyText(q.admin_reply ?? '');
  };

  const handleCancelReply = () => {
    setReplyingQuestionId(null);
    setReplyText('');
  };

  const handleSaveReply = async (questionId) => {
    if (!replyText.trim() || isSubmittingReply) return;

    try {
      setIsSubmittingReply(true);
      await replyToQuestion(questionId, replyText.trim());
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId
            ? {
                ...q,
                is_answered: true,
                admin_reply: replyText.trim(),
                replied_at: new Date().toISOString(),
              }
            : q
        )
      );
      setReplyingQuestionId(null);
      setReplyText('');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء إرسال الرد: ' + err.message);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا السؤال؟')) return;

    try {
      await deleteQuestion(questionId);
      setQuestions((prev) => prev.filter((q) => q.id !== questionId));
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء حذف السؤال: ' + err.message);
    }
  };

  const handleCopyNotes = () => {
    navigator.clipboard.writeText(notes[selectedLecture?.id] || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrevLecture = () => {
    if (selectedLectureIndex > 0) {
      handleSelectLecture(lectures[selectedLectureIndex - 1].slug);
    }
  };

  const handleNextLecture = () => {
    if (selectedLectureIndex < lectures.length - 1) {
      handleSelectLecture(lectures[selectedLectureIndex + 1].slug);
    }
  };

  // Calculations for progress
  const completedCount = useMemo(() => {
    return lectures.filter((l) => completedLectures.has(l.id)).length;
  }, [lectures, completedLectures]);

  const progressPercent = useMemo(() => {
    if (!lectures.length) return 0;
    return Math.round((completedCount / lectures.length) * 100);
  }, [lectures, completedCount]);


  return (
    <main className="flex-1 relative transition-all duration-300">
      <div className="w-full relative z-10 grid lg:grid-cols-12 gap-0 border-b" style={{ borderColor: 'var(--t-border)' }}>
        
        {/* LARGE SCREEN SIDEBAR (Course Playlist) - Rendered first to sit on the right side in RTL */}
        {showSidebar && (
          <aside 
            className="hidden lg:block lg:col-span-3 lg:sticky lg:top-0 h-screen flex flex-col border-l self-start"
            style={{ backgroundColor: 'var(--t-bg-card)', borderColor: 'var(--t-border)' }}
          >
            {/* Sidebar Header */}
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--t-border)' }}>
              <div>
                <h2 className="text-sm font-black text-[var(--t-primary)]">المحاضرات الدراسية</h2>
                <span className="text-[10px] mt-0.5 block text-[var(--t-text-subtle)] font-bold">
                  إنجاز الدورة: {progressPercent}%
                </span>
              </div>
              <button
                onClick={() => setShowSidebar(false)}
                className="p-1.5 rounded-xl border border-[var(--t-border)] hover:bg-[var(--t-bg-surface-low)] transition-all text-[var(--t-text-subtle)] hover:text-[var(--t-primary)] cursor-pointer"
                title="إغلاق المحتوى الجانبي"
              >
                <X size={14} />
              </button>
            </div>

            {/* Circular Progress inside sidebar */}
            <div className="p-4 border-b flex items-center gap-3 bg-[var(--t-bg-surface-low)]/40" style={{ borderColor: 'var(--t-border)' }}>
              <div className="relative w-11 h-11 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="22" cy="22" r="18" className="stroke-[var(--t-border)]" strokeWidth="3.5" fill="transparent" />
                  <circle
                    cx="22"
                    cy="22"
                    r="18"
                    className="stroke-[var(--t-primary)] transition-all duration-500"
                    strokeWidth="3.5"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 18}
                    strokeDashoffset={2 * Math.PI * 18 - (progressPercent / 100) * (2 * Math.PI * 18)}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-[10px] font-black text-[var(--t-primary)]">
                  {progressPercent}%
                </span>
              </div>
              <div>
                <span className="text-xs font-bold block text-[var(--t-primary)]">التقدم في الدورة</span>
                <span className="text-[10px] text-[var(--t-text-subtle)]">أكملت {completedCount} من {lectures.length} محاضرات</span>
              </div>
            </div>

            {/* Checklist Scrollable */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {lectures.length === 0 ? (
                <div className="p-5 text-center text-xs text-[var(--t-text-subtle)]">
                  لا توجد محاضرات منشورة بعد.
                </div>
              ) : (
                lectures.map((lecture, idx) => {
                  const isActive = selectedLecture?.id === lecture.id;
                  const isDone = completedLectures.has(lecture.id);

                  return (
                    <div 
                      key={lecture.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-2.5 transition-all duration-200 ${
                        isActive 
                          ? 'border-[var(--t-primary)] ring-2 ring-[var(--t-primary)]/10 bg-[var(--t-bg-card)]' 
                          : isDone
                            ? 'border-emerald-500/20 dark:border-emerald-500/10 bg-emerald-500/5 dark:bg-emerald-950/40 text-[var(--t-text)]'
                            : 'border-[var(--t-border)] bg-[var(--t-bg-card)]/50 hover:border-[var(--t-primary)]'
                      }`}
                    >
                      <button
                        onClick={() => handleSelectLecture(lecture.slug)}
                        className="flex-1 text-right min-w-0 cursor-pointer group"
                      >
                        <span className="text-[9px] font-bold text-[var(--t-secondary)] block mb-0.5">
                          المحاضرة {lectureNumberFormatter.format(idx + 1)}
                        </span>
                        <span 
                          className={`text-xs font-bold block truncate transition-colors ${
                            isActive ? 'text-[var(--t-primary)] font-extrabold' : 'text-[var(--t-text)] group-hover:text-[var(--t-primary)]'
                          }`}
                        >
                          {lecture.title}
                        </span>
                      </button>

                      <button 
                        onClick={() => toggleCompleteLecture(lecture.id)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                          isDone 
                            ? 'bg-emerald-500 text-white shadow-sm' 
                            : 'bg-[var(--t-bg-surface-low)] text-[var(--t-text-subtle)] hover:text-[var(--t-primary)] hover:bg-[var(--t-bg-surface)]'
                        }`}
                        title={isDone ? 'تحديد كغير مكتمل' : 'تحديد كمكتمل'}
                      >
                        {isDone ? <Check size={14} strokeWidth={3} /> : <CheckSquare size={13} />}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        )}

        {/* LEFT WORKSPACE (Video Player & Tabs) - Rendered second to flow to the left in RTL */}
        <section className={`transition-all duration-300 ${showSidebar ? 'lg:col-span-9' : 'lg:col-span-12'} flex flex-col min-h-screen`}>
          
          {/* Header Block (Compact layout next to return button) */}
          <div className="px-4 md:px-8 py-3.5 flex items-center justify-between gap-4 border-b" style={{ borderColor: 'var(--t-border)' }}>
            {/* Right Side: Back Arrow + Course Title */}
            <div className="flex items-center gap-4 min-w-0">
              <Link
                to={`/quran/courses/${course.slug}`}
                className="inline-flex items-center justify-center transition-all shrink-0 bg-[var(--t-bg-card)] border border-[var(--t-border)] hover:border-[var(--t-primary)] hover:text-[var(--t-primary)] w-9 h-9 rounded-xl shadow-sm text-[var(--t-text-muted)] hover:shadow-md hover:scale-[1.05]"
                title="العودة للدورة"
              >
                <ChevronRight size={18} />
              </Link>
              
              <span className="text-[var(--t-border)]">|</span>
              
              <h1 className="text-xs md:text-sm font-black truncate text-[var(--t-primary)]">
                {course.name}
              </h1>
            </div>

            {/* Left Side: Logo only (+ DarkModeToggle) */}
            <div className="flex items-center gap-3 shrink-0">
              <DarkModeToggle />
              <Link to={brandPath} className="flex items-center hover:opacity-90 transition-opacity shrink-0">
                <img src={logoGold} alt="منصة حبل الله" className="w-[34px] h-[34px] object-contain" />
              </Link>
            </div>
          </div>

          {/* Video Player - Full edge-to-edge width, 75% height on large screens, no black side bars */}
          <div className="w-full bg-black relative group flex items-center justify-center lg:h-[75vh] aspect-video lg:aspect-auto">
            
            {/* Prev Arrow Overlay */}
            {selectedLectureIndex > 0 && (
              <button
                onClick={handlePrevLecture}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center bg-black/60 hover:bg-emerald-600/90 text-white transition-all cursor-pointer z-20 hover:scale-105 shadow-md border border-white/10"
                title="المحاضرة السابقة"
              >
                <ChevronRight size={20} />
              </button>
            )}

            {/* Next Arrow Overlay */}
            {selectedLectureIndex < lectures.length - 1 && (
              <button
                onClick={handleNextLecture}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center bg-black/60 hover:bg-emerald-600/90 text-white transition-all cursor-pointer z-20 hover:scale-105 shadow-md border border-white/10"
                title="المحاضرة التالية"
              >
                <ChevronLeft size={20} />
              </button>
            )}

            <div className="w-full h-full flex items-center justify-center">
              {!selectedLecture ? (
                <div className="text-center p-6 text-white">
                  <BookOpen className="w-10 h-10 mx-auto mb-2 text-white/30" />
                  <p className="text-xs text-white/70">لم تُنشر محاضرات لهذه الدورة بعد.</p>
                </div>
              ) : course.is_free ? (
                youtubeEmbedUrl ? (
                  <iframe
                    src={youtubeEmbedUrl}
                    title={selectedLecture.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                    style={{ border: 'none' }}
                  />
                ) : (
                  <div className="text-center p-6 text-white">
                    <BookOpen className="w-10 h-10 mx-auto mb-2 text-white/30" />
                    <p className="text-xs text-white/70">رابط يوتيوب لهذه المحاضرة غير صالح حالياً.</p>
                  </div>
                )
              ) : playbackState.loading ? (
                <div className="flex flex-col items-center justify-center gap-3 text-white bg-slate-950">
                  <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <p className="text-xs">جاري تحميل تشغيل الفيديو...</p>
                </div>
              ) : playbackState.url ? (
                <video
                  key={playbackState.url}
                  src={playbackState.url}
                  className="w-full h-full object-cover"
                  controls
                  controlsList="nodownload noremoteplayback"
                  disablePictureInPicture
                  playsInline
                  preload="metadata"
                  onContextMenu={(event) => event.preventDefault()}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-6 text-white max-w-md">
                  <BookOpen className="w-10 h-10 mx-auto mb-2 text-white/30" />
                  <p className="text-xs text-white/80 mb-3">{playbackState.error || 'تعذر تشغيل هذه المحاضرة.'}</p>
                  <button
                    onClick={() => setPlaybackRefreshKey((current) => current + 1)}
                    className="inline-flex items-center gap-2 py-2 px-3 rounded-lg font-bold text-xs bg-white/10 hover:bg-white/15 text-white transition-colors cursor-pointer"
                  >
                    <RefreshCcw className="w-3.5 h-3.5" />
                    إعادة المحاولة
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Workspace Tabs Dashboard - DIRECTLY on the background with NO container box/borders */}
          <div className="w-full flex-1 flex flex-col py-6">
            
            {/* MOBILE Tab Headers (< lg) */}
            <div className="flex lg:hidden border-b px-4 overflow-x-auto no-scrollbar gap-2" style={{ borderColor: 'var(--t-border)' }}>
              <button
                onClick={() => setActiveTab('content')}
                className={`px-4 py-3.5 font-bold text-xs shrink-0 border-b-2 transition-all duration-200 cursor-pointer flex items-center gap-1.5 rounded-t-xl ${
                  activeTab === 'content'
                    ? 'border-[var(--t-primary)] text-[var(--t-primary)] bg-[var(--t-primary-light)] font-black'
                    : 'border-transparent text-[var(--t-text-subtle)] hover:text-[var(--t-primary)] hover:bg-[var(--t-bg-surface-low)]'
                }`}
              >
                <BookOpen size={14} />
                <span>المحاضرات</span>
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`px-4 py-3.5 font-bold text-xs shrink-0 border-b-2 transition-all duration-200 cursor-pointer flex items-center gap-1.5 rounded-t-xl ${
                  activeTab === 'notes'
                    ? 'border-[var(--t-primary)] text-[var(--t-primary)] bg-[var(--t-primary-light)] font-black'
                    : 'border-transparent text-[var(--t-text-subtle)] hover:text-[var(--t-primary)] hover:bg-[var(--t-bg-surface-low)]'
                }`}
              >
                <FileText size={14} />
                <span>الملاحظات</span>
              </button>
              <button
                onClick={() => setActiveTab('support')}
                className={`px-4 py-3.5 font-bold text-xs shrink-0 border-b-2 transition-all duration-200 cursor-pointer flex items-center gap-1.5 rounded-t-xl ${
                  activeTab === 'support'
                    ? 'border-[var(--t-primary)] text-[var(--t-primary)] bg-[var(--t-primary-light)] font-black'
                    : 'border-transparent text-[var(--t-text-subtle)] hover:text-[var(--t-primary)] hover:bg-[var(--t-bg-surface-low)]'
                }`}
              >
                <HelpCircle size={14} />
                <span>اطرح سؤال</span>
              </button>
            </div>

            {/* DESKTOP Tab Headers (>= lg) */}
            <div className="hidden lg:flex border-b px-8 gap-4" style={{ borderColor: 'var(--t-border)' }}>
              <button
                onClick={() => setActiveTab('notes')}
                className={`px-6 py-4 font-bold text-sm border-b-2 transition-all duration-200 cursor-pointer flex items-center gap-2 rounded-t-xl ${
                  activeTab === 'notes'
                    ? 'border-[var(--t-primary)] text-[var(--t-primary)] bg-[var(--t-primary-light)] font-black'
                    : 'border-transparent text-[var(--t-text-subtle)] hover:text-[var(--t-primary)] hover:bg-[var(--t-bg-surface-low)]'
                }`}
              >
                <FileText size={16} />
                <span>الملاحظات الدراسية</span>
              </button>
              <button
                onClick={() => setActiveTab('support')}
                className={`px-6 py-4 font-bold text-sm border-b-2 transition-all duration-200 cursor-pointer flex items-center gap-2 rounded-t-xl ${
                  activeTab === 'support'
                    ? 'border-[var(--t-primary)] text-[var(--t-primary)] bg-[var(--t-primary-light)] font-black'
                    : 'border-transparent text-[var(--t-text-subtle)] hover:text-[var(--t-primary)] hover:bg-[var(--t-bg-surface-low)]'
                }`}
              >
                <HelpCircle size={16} />
                <span>الأسئلة والنقاشات</span>
              </button>
            </div>

            {/* Tab Contents - Spaced with padding, centered and max-width limited on desktop */}
            <div className="px-4 md:px-8 py-6">
              <div className="max-w-2xl mx-auto w-full space-y-6">
                
                {/* 1. Mobile Content Playlist */}
                {activeTab === 'content' && (
                  <div className="lg:hidden space-y-4">
                    {/* Mobile Progress Card */}
                    <div className="bg-[var(--t-bg-card)] p-4 rounded-2xl border border-[var(--t-border)] shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--t-text-muted)]">تقدمك في الدورة</span>
                        <span className="text-sm font-black text-[var(--t-primary)]">{progressPercent}%</span>
                      </div>
                      <div className="w-full bg-[var(--t-bg-surface-low)] h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-[var(--t-primary)] h-full rounded-full transition-all duration-500"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-[var(--t-text-subtle)] flex justify-between">
                        <span>أنجزت {completedCount} محاضرة</span>
                        <span>من أصل {lectures.length} محاضرات</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {lectures.map((lecture, idx) => {
                        const isActive = selectedLecture?.id === lecture.id;
                        const isDone = completedLectures.has(lecture.id);

                        return (
                          <div 
                            key={lecture.id}
                            className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all duration-200 shadow-sm ${
                              isActive 
                                ? 'border-[var(--t-primary)] ring-2 ring-[var(--t-primary)]/10 bg-[var(--t-bg-card)]' 
                                : isDone
                                  ? 'border-emerald-500/20 dark:border-emerald-500/10 bg-emerald-500/5 dark:bg-emerald-950/40 text-[var(--t-text)]'
                                  : 'border-[var(--t-border)] bg-[var(--t-bg-card)] hover:border-[var(--t-primary)]'
                            }`}
                          >
                            {/* Info button to click lecture */}
                            <button
                              onClick={() => {
                                handleSelectLecture(lecture.slug);
                                setActiveTab('content');
                              }}
                              className="flex-1 text-right min-w-0 cursor-pointer group"
                            >
                              <span className="text-[10px] font-bold text-[var(--t-secondary)] block mb-0.5">
                                المحاضرة {lectureNumberFormatter.format(idx + 1)}
                              </span>
                              <span 
                                className={`text-xs md:text-sm font-bold block truncate transition-colors ${
                                  isActive ? 'text-[var(--t-primary)] font-extrabold' : 'text-[var(--t-text)] group-hover:text-[var(--t-primary)]'
                                }`}
                              >
                                {lecture.title}
                              </span>
                            </button>

                            {/* Big readable Checkbox */}
                            <button 
                              onClick={() => toggleCompleteLecture(lecture.id)}
                              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                                isDone 
                                  ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20' 
                                  : 'bg-[var(--t-bg-surface-low)] text-[var(--t-text-subtle)] hover:text-[var(--t-primary)] hover:bg-[var(--t-bg-surface)]'
                              }`}
                              title={isDone ? 'تحديد كغير مكتمل' : 'تحديد كمكتمل'}
                            >
                              {isDone ? <Check size={18} strokeWidth={3} /> : <CheckSquare size={16} />}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. Notes Tab ("الملاحظات") */}
                {activeTab === 'notes' && selectedLecture && (
                  <div className="space-y-5">
                    {/* Lecture Info Card */}
                    <div className="bg-[var(--t-bg-card)] p-5 rounded-2xl border border-[var(--t-border)] shadow-sm space-y-3">
                      <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
                        <div>
                          <span className="text-[10px] sm:text-xs font-bold text-[var(--t-secondary)] block mb-1">
                            المحاضرة {lectureNumberFormatter.format(selectedLectureIndex + 1)} من {lectures.length}
                          </span>
                          <h2 className="text-base sm:text-lg font-black text-[var(--t-primary)] leading-snug">{selectedLecture.title}</h2>
                        </div>
                        
                        <button
                          onClick={() => toggleCompleteLecture(selectedLecture.id)}
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all duration-200 cursor-pointer shrink-0 ${
                            completedLectures.has(selectedLecture.id)
                              ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/20'
                              : 'bg-[var(--t-bg-card)] text-[var(--t-text)] border-[var(--t-border)] hover:border-[var(--t-primary)] hover:text-[var(--t-primary)]'
                          }`}
                        >
                          {completedLectures.has(selectedLecture.id) ? <Check size={16} strokeWidth={3} /> : <CheckSquare size={16} />}
                          <span>{completedLectures.has(selectedLecture.id) ? 'مكتملة ✓' : '✓ تمت المشاهدة'}</span>
                        </button>
                      </div>

                      {selectedLecture.description && (
                        <div className="pt-2 border-t border-[var(--t-border)]/50">
                          <p className="text-xs sm:text-sm text-[var(--t-text-muted)] leading-relaxed">
                            {selectedLecture.description}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Notepad without counters */}
                    <div className="pt-2 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <label className="text-xs sm:text-sm font-black text-[var(--t-primary)]">
                            ملاحظاتك الدراسية
                          </label>
                          <span className="text-[10px] text-[var(--t-text-subtle)] bg-[var(--t-bg-surface-low)] px-2 py-0.5 rounded-md">
                            حفظ تلقائي
                          </span>
                          {/* Autosave status indicator */}
                          <span className={`text-[10px] font-bold transition-all duration-300 ${
                            saveStatus === 'saving' 
                              ? 'text-amber-500 animate-pulse' 
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {saveStatus === 'saving' ? '● جاري الحفظ...' : '● تم حفظ التغييرات'}
                          </span>
                        </div>
                        
                        {(notes[selectedLecture.id] || '').trim() && (
                          <button
                            onClick={handleCopyNotes}
                            className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold px-2.5 py-1.5 rounded-xl border hover:bg-[var(--t-bg-surface-low)] transition-all cursor-pointer bg-[var(--t-bg-card)] border-[var(--t-border)] text-[var(--t-text-muted)] hover:text-[var(--t-primary)] shadow-sm"
                          >
                            {copied ? <Check size={12} className="text-emerald-500" /> : <Send size={12} className="-rotate-45" />}
                            <span>{copied ? 'تم نسخ الملاحظة' : 'نسخ الملاحظة'}</span>
                          </button>
                        )}
                      </div>

                      <textarea
                        value={notes[selectedLecture.id] || ''}
                        onChange={(e) => {
                          setSaveStatus('saving');
                          saveNote(selectedLecture.id, e.target.value);
                          if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                          saveTimeoutRef.current = setTimeout(() => {
                            setSaveStatus('saved');
                          }, 1000);
                        }}
                        placeholder="اكتب ملاحظاتك، فوائد الدرس، أو خواطرك هنا لتسترجعها لاحقاً..."
                        rows={6}
                        className="w-full p-4 rounded-2xl border text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[var(--t-primary)]/10 bg-[var(--t-bg-surface-low)]/50 border-[var(--t-border)] focus:border-[var(--t-primary)] focus:bg-[var(--t-bg-card)] placeholder-[var(--t-text-subtle)] leading-relaxed shadow-sm transition-all duration-200 focus:shadow-md"
                        style={{ color: 'var(--t-text)', direction: 'rtl', textAlign: 'right' }}
                      />
                    </div>
                  </div>
                )}

                {/* 3. Ask a Question Tab ("اطرح سؤال") */}
                {activeTab === 'support' && (
                  <div className="space-y-6">
                    {/* Ask Question Form Card */}
                    <div className="bg-[var(--t-bg-card)] p-5 rounded-2xl border border-[var(--t-border)] shadow-sm space-y-4">
                      <div className="flex items-center gap-2 border-b border-[var(--t-border)]/50 pb-3">
                        <HelpCircle className="text-[var(--t-primary)] w-5 h-5" />
                        <h3 className="text-sm sm:text-base font-black text-[var(--t-primary)]">اطرح سؤالك وسيجيبك الشيخ</h3>
                      </div>
                      
                      {user ? (
                        <form onSubmit={handleAskQuestion} className="space-y-4">
                          <div className="space-y-3">
                            <div>
                              <label className="text-[11px] font-bold text-[var(--t-text-muted)] block mb-1">السؤال</label>
                              <input
                                type="text"
                                required
                                value={questionTitle}
                                onChange={(e) => setQuestionTitle(e.target.value)}
                                placeholder="مثال: حكم القراءة بدون أحكام التجويد..."
                                className="w-full px-4 py-2.5 border border-[var(--t-border)] rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--t-primary)]/10 focus:border-[var(--t-primary)] bg-[var(--t-bg-surface-low)]/50 focus:bg-[var(--t-bg-card)] text-[var(--t-text)] transition-all placeholder-[var(--t-text-subtle)] focus:shadow-sm"
                              />
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={!questionTitle.trim() || isSubmittingQuestion}
                            className="w-full sm:w-auto py-2.5 px-6 rounded-xl font-bold text-xs sm:text-sm text-white bg-[var(--t-primary)] hover:bg-emerald-700 dark:hover:bg-emerald-500 hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm shadow-[var(--t-primary)]/10 hover:shadow-md"
                          >
                            {isSubmittingQuestion ? (
                              <Loader size={14} className="animate-spin" />
                            ) : (
                              <Send size={14} className="-rotate-45" />
                            )}
                            <span>{isSubmittingQuestion ? 'جاري الإرسال...' : 'إرسال السؤال'}</span>
                          </button>
                        </form>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-xs sm:text-sm text-[var(--t-text-muted)] leading-relaxed">
                            يمكنك مشاهدة هذه الدورة المجانية بدون تسجيل دخول، لكن طرح الأسئلة يتطلب تسجيل الدخول بحساب طالب.
                          </p>
                          <Link
                            to="/quran/student/login"
                            className="inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl font-bold text-xs sm:text-sm text-white bg-[var(--t-primary)] hover:bg-emerald-700 transition-all shadow-sm shadow-[var(--t-primary)]/10"
                          >
                            تسجيل الدخول لطرح سؤال
                          </Link>
                        </div>
                      )}
                    </div>

                    {/* Questions Board list */}
                    <div className="space-y-4">
                      <span className="text-sm font-black block text-[var(--t-primary)]">الأسئلة والنقاشات المطروحة ({questions.length})</span>
                      
                      {loadingQuestions ? (
                        <div className="text-center py-6 text-xs font-bold text-[var(--t-text-muted)] animate-pulse">
                          جاري تحميل الأسئلة...
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {questions.map((q) => {
                            const isMyQuestion = q.student_id === user?.id;
                            const showEditBtn = isMyQuestion && !q.is_answered && !isAdmin;
                            const isEditing = editingQuestionId === q.id;
                            const isReplying = replyingQuestionId === q.id;

                            return (
                              <div 
                                key={q.id} 
                                className="bg-[var(--t-bg-card)] p-5 rounded-2xl border border-[var(--t-border)] shadow-sm space-y-3.5 transition-all hover:shadow-md"
                              >
                                {/* Question Header Metadata */}
                                <div className="flex items-center justify-between text-[11px] text-[var(--t-text-subtle)] pb-2 border-b border-[var(--t-border)]/50">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-[var(--t-text-muted)]">
                                      {isMyQuestion ? 'أنت' : (q.student_profiles?.full_name ?? 'طالب')}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2.5">
                                    <span>{new Date(q.created_at).toLocaleDateString('ar-EG')}</span>
                                    {showEditBtn && !isEditing && (
                                      <button
                                        onClick={() => handleStartEdit(q)}
                                        className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold cursor-pointer flex items-center gap-0.5"
                                        title="تعديل السؤال"
                                      >
                                        <Edit2 size={11} />
                                        <span>تعديل</span>
                                      </button>
                                    )}
                                    {isMyQuestion && !isAdmin && (
                                      <button
                                        onClick={() => handleDeleteQuestion(q.id)}
                                        className="text-red-600 dark:text-red-400 hover:underline font-bold cursor-pointer flex items-center gap-0.5"
                                        title="حذف السؤال"
                                      >
                                        <Trash2 size={11} />
                                        <span>حذف</span>
                                      </button>
                                    )}
                                    {isAdmin && !isReplying && (
                                      <button
                                        onClick={() => handleStartReply(q)}
                                        className="text-emerald-700 dark:text-emerald-400 hover:underline font-bold cursor-pointer flex items-center gap-0.5"
                                        title={q.is_answered ? 'تعديل الإجابة' : 'إضافة إجابة'}
                                      >
                                        <MessageSquare size={11} />
                                        <span>{q.is_answered ? 'تعديل الرد' : 'رد'}</span>
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Question Content / Edit Field */}
                                <div className="space-y-1.5">
                                  {isEditing ? (
                                    <div className="space-y-2">
                                      <input
                                        type="text"
                                        value={editingText}
                                        onChange={(e) => setEditingText(e.target.value)}
                                        className="w-full px-3 py-2 border border-[var(--t-border)] rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--t-primary)]/10 focus:border-[var(--t-primary)] bg-[var(--t-bg-surface-low)] text-[var(--t-text)]"
                                        required
                                      />
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => handleSaveEdit(q.id)}
                                          disabled={!editingText.trim() || isSavingEdit}
                                          className="px-3 py-1.5 bg-[var(--t-primary)] text-white text-xs font-bold rounded-lg hover:bg-emerald-700 cursor-pointer disabled:opacity-50 flex items-center gap-1"
                                        >
                                          {isSavingEdit && <Loader size={11} className="animate-spin" />}
                                          <span>حفظ</span>
                                        </button>
                                        <button
                                          onClick={handleCancelEdit}
                                          disabled={isSavingEdit}
                                          className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-[var(--t-text-muted)] text-xs font-bold rounded-lg hover:bg-gray-200 cursor-pointer"
                                        >
                                          إلغاء
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <h4 className="font-bold text-sm sm:text-base text-[var(--t-text)] leading-snug">
                                      {q.question_title}
                                    </h4>
                                  )}
                                </div>

                                {/* Replies / الشيخ Answer */}
                                {q.is_answered && q.admin_reply && !isReplying && (
                                  <div className="space-y-2.5 pt-2 border-t border-[var(--t-border)]/50">
                                    <div 
                                      className="bg-[#d3dcd9] dark:bg-[#1C3329] border-r-4 border-[var(--t-primary)] p-3.5 rounded-l-2xl text-xs sm:text-sm space-y-1 border-t border-b border-l border-[var(--t-border)]/40"
                                    >
                                      <div className="flex items-center justify-between font-bold text-xs mb-1" style={{ color: 'var(--t-primary)' }}>
                                        <span>إجابة الشيخ:</span>
                                      </div>
                                      <p className="text-[var(--t-text-muted)] leading-relaxed text-xs sm:text-sm">
                                        {q.admin_reply}
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {/* Admin Reply Input Form */}
                                {isReplying && (
                                  <div className="space-y-2.5 pt-2 border-t border-[var(--t-border)]/50">
                                    <div className="space-y-2">
                                      <label className="text-[11px] font-bold text-[var(--t-primary)] block">إجابتك كأدمن:</label>
                                      <textarea
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        rows={2}
                                        placeholder="اكتب إجابتك هنا..."
                                        className="w-full p-3 border border-[var(--t-border)] rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--t-primary)]/10 focus:border-[var(--t-primary)] bg-[var(--t-bg-surface-low)] text-[var(--t-text)]"
                                      />
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => handleSaveReply(q.id)}
                                          disabled={!replyText.trim() || isSubmittingReply}
                                          className="px-3 py-1.5 bg-[var(--t-primary)] text-white text-xs font-bold rounded-lg hover:bg-emerald-700 cursor-pointer disabled:opacity-50 flex items-center gap-1"
                                        >
                                          {isSubmittingReply && <Loader size={11} className="animate-spin" />}
                                          <span>حفظ الإجابة</span>
                                        </button>
                                        <button
                                          onClick={handleCancelReply}
                                          disabled={isSubmittingReply}
                                          className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-[var(--t-text-muted)] text-xs font-bold rounded-lg hover:bg-gray-200 cursor-pointer"
                                        >
                                          إلغاء
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                  </div>
                )}
                
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* Floating Arrow Drawer Handle to reopen sidebar in desktop when hidden */}
      {!showSidebar && (
        <button
          onClick={() => setShowSidebar(true)}
          className="hidden lg:flex fixed right-0 top-1/2 -translate-y-1/2 w-8 h-16 bg-emerald-600 hover:bg-emerald-700 text-white rounded-l-xl items-center justify-center cursor-pointer transition-all shadow-lg z-30 border border-r-0 border-emerald-500/20"
          title="عرض المحاضرات"
        >
          <ChevronLeft size={18} />
        </button>
      )}
    </main>
  );
}
