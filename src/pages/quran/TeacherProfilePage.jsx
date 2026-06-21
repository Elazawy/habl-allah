import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play, Pause, Volume2, Star } from 'lucide-react';
import { fetchTeacherById } from '../../services/teachersService';
import { GENDER_LABELS } from '../../lib/constants';
import { FemaleMonogram, MalePhoto } from './TeacherCard';
import SubscribeModal from './SubscribeModal';
import QuranNav from './QuranNav';
import QuranFooter from './QuranFooter';

/* ─── Inline animation style helpers ──────────────────────────
   We use inline animation instead of reveal classes because
   content is loaded asynchronously — reveal requires elements
   to exist when the IntersectionObserver first runs.
──────────────────────────────────────────────────────────────── */
const anim = (delay = 0) => ({
  animation: `cardFadeIn 0.6s cubic-bezier(0.22,1,0.36,1) ${delay}s both`,
});

/* ─── Audio Player ─────────────────────────────────────────── */
function AudioPlayer({ src }) {
  const audioRef = useRef(null);
  const [playing, setPlaying]   = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (playing) { el.pause(); setPlaying(false); }
    else          { el.play();  setPlaying(true);  }
  }

  function handleTimeUpdate() {
    const el = audioRef.current;
    if (!el || !el.duration) return;
    setProgress((el.currentTime / el.duration) * 100);
  }

  function handleLoaded() { setDuration(audioRef.current?.duration ?? 0); }

  function handleSeek(e) {
    const el = audioRef.current;
    if (!el) return;
    const rect  = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    el.currentTime = ratio * el.duration;
  }

  function fmt(s) {
    if (!s || isNaN(s)) return '0:00';
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  }

  const elapsed = audioRef.current ? (progress / 100) * duration : 0;

  return (
    <div
      className="rounded-2xl p-5 flex items-center gap-4"
      style={{ backgroundColor: 'var(--t-primary-light)', border: '1px solid var(--t-border)' }}
    >
      <audio ref={audioRef} src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoaded}
        onEnded={() => setPlaying(false)}
      />

      <button
        onClick={toggle}
        id="audio-play-pause"
        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 hover:scale-105 active:scale-95"
        style={{ backgroundColor: 'var(--t-primary)', color: '#fff' }}
        aria-label={playing ? 'إيقاف' : 'تشغيل'}
      >
        {playing ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" />}
      </button>

      <div className="flex-1 flex flex-col gap-2">
        <div
          className="w-full h-2 rounded-full cursor-pointer overflow-hidden"
          style={{ backgroundColor: 'var(--t-border)' }}
          onClick={handleSeek}
          role="slider"
          aria-label="تقدم التشغيل"
          aria-valuenow={Math.round(progress)}
        >
          <div
            className="h-full rounded-full transition-all duration-100"
            style={{ width: `${progress}%`, backgroundColor: 'var(--t-primary)' }}
          />
        </div>
        <div className="flex justify-between text-xs font-mono" style={{ color: 'var(--t-text-muted)' }}>
          <span>{fmt(elapsed)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>

      <Volume2 size={18} style={{ color: 'var(--t-primary)', flexShrink: 0 }} />
    </div>
  );
}

/* ─── Review Card ──────────────────────────────────────────── */
function ReviewCard({ review }) {
  return (
    <div
      className="rounded-2xl p-5 border"
      style={{
        backgroundColor: 'var(--t-bg-card)',
        borderColor: 'var(--t-border)',
        boxShadow: '0 2px 10px var(--t-shadow-card)',
      }}
    >
      <div className="flex gap-0.5 mb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={14}
            fill={i < review.rating ? 'var(--t-secondary)' : 'none'}
            style={{ color: 'var(--t-secondary)' }}
          />
        ))}
      </div>
      <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--t-text)' }}>
        "{review.text}"
      </p>
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ backgroundColor: 'var(--t-primary-light)', color: 'var(--t-primary)' }}
        >
          {review.student_name?.[0] ?? '؟'}
        </div>
        <span className="text-xs font-semibold" style={{ color: 'var(--t-text-muted)' }}>
          {review.student_name}
        </span>
      </div>
    </div>
  );
}

/* ─── Section Card wrapper ─────────────────────────────────── */
function SectionCard({ children, delay = 0, surface = false }) {
  return (
    <div
      className="rounded-3xl p-7 md:p-8 border"
      style={{
        backgroundColor: surface ? 'var(--t-bg-surface-low)' : 'var(--t-bg-card)',
        borderColor: 'var(--t-border)',
        boxShadow: surface ? 'none' : '0 2px 16px var(--t-shadow-card)',
        ...anim(delay),
      }}
    >
      {children}
    </div>
  );
}

/* ─── Main Profile Page ────────────────────────────────────── */
export default function TeacherProfilePage() {
  const { gender, id } = useParams();
  const [teacher,   setTeacher]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);

  const isMale      = gender === 'male';
  const genderLabel = GENDER_LABELS[gender] ?? 'المعلمون';

  useEffect(() => {
    setLoading(true);
    fetchTeacherById(id)
      .then(setTeacher)
      .finally(() => setLoading(false));
  }, [id]);

  /* ── Loading state ── */
  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--t-bg-page)' }}>
        <QuranNav />
        <div className="flex-1 flex items-center justify-center">
          <div
            className="w-10 h-10 rounded-full border-4 animate-spin"
            style={{ borderColor: 'var(--t-border)', borderTopColor: 'var(--t-primary)' }}
          />
        </div>
      </div>
    );
  }

  /* ── Not found ── */
  if (!teacher) {
    return (
      <div dir="rtl" className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--t-bg-page)' }}>
        <QuranNav />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-lg" style={{ color: 'var(--t-text-muted)' }}>لم يُعثر على هذا المعلم.</p>
        </main>
        <QuranFooter />
      </div>
    );
  }

  const reviews = teacher.reviews ?? teacher.teacher_reviews ?? [];
  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  return (
    <div dir="rtl" className="min-h-screen" style={{ backgroundColor: 'var(--t-bg-page)', color: 'var(--t-text)' }}>
      <QuranNav />

      <main className="pb-36">

        {/* ── Breadcrumb ── */}
        <section className="pt-10 pb-4 px-5 md:px-8" style={anim(0)}>
          <div className="max-w-3xl mx-auto">
            <nav className="flex items-center gap-1.5 text-xs flex-wrap" aria-label="مسار التنقل">
              <Link to="/quran" className="font-semibold hover:underline" style={{ color: 'var(--t-text-muted)' }}>
                حبل الله
              </Link>
              <ChevronLeft size={12} style={{ color: 'var(--t-text-subtle)' }} />
              <Link to="/quran/teachers" className="font-semibold hover:underline" style={{ color: 'var(--t-text-muted)' }}>
                اختر معلمك
              </Link>
              <ChevronLeft size={12} style={{ color: 'var(--t-text-subtle)' }} />
              <Link to={`/quran/teachers/${gender}`} className="font-semibold hover:underline" style={{ color: 'var(--t-text-muted)' }}>
                {genderLabel}
              </Link>
              <ChevronLeft size={12} style={{ color: 'var(--t-text-subtle)' }} />
              <span className="font-bold" style={{ color: 'var(--t-primary)' }}>{teacher.name}</span>
            </nav>
          </div>
        </section>

        {/* ── Hero card ── */}
        <section className="px-5 md:px-8 pt-6 pb-6">
          <div className="max-w-3xl mx-auto">
            <SectionCard delay={0.05}>
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-7">

                {/* Avatar */}
                <div className="flex-shrink-0">
                  {isMale
                    ? <MalePhoto photoUrl={teacher.photo_url} name={teacher.name} size="lg" />
                    : <FemaleMonogram name={teacher.name} size="lg" />
                  }
                </div>

                {/* Info */}
                <div className="flex-1 text-center sm:text-right">
                  <h1 className="text-2xl md:text-3xl font-black mb-1" style={{ color: 'var(--t-text)' }}>
                    {teacher.name}
                  </h1>
                  <p className="text-sm font-semibold mb-3" style={{ color: 'var(--t-primary)' }}>
                    {isMale ? 'معلم قرآن كريم' : 'معلمة قرآن كريم'}
                  </p>

                  {/* Stars (profile page only — from reviews) */}
                  {reviews.length > 0 && (
                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} size={15}
                            fill={i < Math.round(avgRating) ? 'var(--t-secondary)' : 'none'}
                            style={{ color: 'var(--t-secondary)' }}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-semibold" style={{ color: 'var(--t-text-muted)' }}>
                        {avgRating.toFixed(1)} ({reviews.length} تقييم)
                      </span>
                    </div>
                  )}

                  {/* CTA — desktop inline */}
                  <button
                    id="subscribe-cta-hero"
                    onClick={() => setShowModal(true)}
                    className="hidden sm:inline-flex mt-5 items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 hover:opacity-90 active:scale-[0.98]"
                    style={{ backgroundColor: 'var(--t-primary)', color: '#fff' }}
                  >
                    اشترك مع المعلم
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </SectionCard>
          </div>
        </section>

        {/* ── Bio ── */}
        <section className="px-5 md:px-8 pb-6">
          <div className="max-w-3xl mx-auto">
            <SectionCard delay={0.12}>
              <h2 className="text-lg font-black mb-4 flex items-center gap-2" style={{ color: 'var(--t-text)' }}>
                <span>📖</span> السيرة الذاتية
              </h2>
              <p className="text-base leading-[1.95] text-justify" style={{ color: 'var(--t-text-muted)' }}>
                {teacher.bio}
              </p>
            </SectionCard>
          </div>
        </section>

        {/* ── Recitation (males with file only) ── */}
        {isMale && teacher.recitation_url && (
          <section className="px-5 md:px-8 pb-6">
            <div className="max-w-3xl mx-auto">
              <SectionCard delay={0.18}>
                <h2 className="text-lg font-black mb-4 flex items-center gap-2" style={{ color: 'var(--t-text)' }}>
                  <span>🎙️</span> تسجيل قرآني
                </h2>
                {teacher.recitation_type === 'audio' ? (
                  <AudioPlayer src={teacher.recitation_url} />
                ) : (
                  <div className="rounded-2xl overflow-hidden aspect-video bg-black">
                    {(() => {
                      const url = teacher.recitation_url ?? '';
                      // Detect YouTube links and extract video ID
                      const ytMatch =
                        url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/) ||
                        url.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/);
                      if (ytMatch) {
                        const embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}?rel=0`;
                        return (
                          <iframe
                            id="recitation-video"
                            src={embedUrl}
                            title={`تسجيل قرآني للمعلم ${teacher.name}`}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full"
                            style={{ border: 'none' }}
                          />
                        );
                      }
                      return (
                        <video
                          id="recitation-video"
                          src={url}
                          controls
                          className="w-full h-full object-cover"
                          aria-label={`تسجيل قرآني للمعلم ${teacher.name}`}
                        />
                      );
                    })()}
                  </div>
                )}
              </SectionCard>
            </div>
          </section>
        )}

        {/* ── Reviews ── */}
        {reviews.length > 0 && (
          <section className="px-5 md:px-8 pb-6">
            <div className="max-w-3xl mx-auto">
              <SectionCard delay={0.22} surface>
                <h2 className="text-lg font-black mb-5 flex items-center gap-2" style={{ color: 'var(--t-text)' }}>
                  <span>💬</span> آراء الطلاب
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {reviews.map((r) => (
                    <ReviewCard key={r.id} review={r} />
                  ))}
                </div>
              </SectionCard>
            </div>
          </section>
        )}

      </main>

      {/* ── Sticky Subscribe CTA ── */}
      <div
        className="fixed bottom-0 inset-x-0 z-40 px-5 py-4 flex justify-center"
        style={{ background: 'linear-gradient(to top, var(--t-bg-page) 70%, transparent)' }}
      >
        <button
          id="subscribe-cta-sticky"
          onClick={() => setShowModal(true)}
          className="w-full max-w-sm py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-all duration-300 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            backgroundColor: 'var(--t-primary)',
            color: '#ffffff',
            boxShadow: '0 8px 32px rgba(27,77,62,0.35)',
          }}
        >
          اشترك مع المعلم
          <ChevronRight size={18} />
        </button>
      </div>

      {/* ── Subscribe Modal ── */}
      {showModal && (
        <SubscribeModal teacher={teacher} onClose={() => setShowModal(false)} />
      )}

      <QuranFooter />
    </div>
  );
}
