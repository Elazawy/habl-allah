import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, PlayCircle, BookOpen, MessageSquare, Play, Pause, Volume2, X, Gift } from 'lucide-react';
import { fetchTeacherById } from '../../services/teachersService';
import { GENDER_LABELS, WHATSAPP_NUMBER } from '../../lib/constants';
import { FemaleMonogram, MalePhoto } from './TeacherCard';
import SubscribeModal from './SubscribeModal';
import QuranNav from './QuranNav';
import QuranFooter from './QuranFooter';

const anim = (delay = 0) => ({
  animation: `cardFadeIn 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) ${delay}s both`,
});

/* ─── Shared Components from Variants ──────────────────────── */

export function AudioPlayer({ src }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (playing) { el.pause(); setPlaying(false); }
    else { el.play(); setPlaying(true); }
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
    const rect = e.currentTarget.getBoundingClientRect();
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
      className="rounded-2xl p-5 flex items-center gap-4 transition-all duration-300"
      style={{ backgroundColor: 'var(--t-primary-light)', border: '1px solid var(--t-border)' }}
    >
      <audio ref={audioRef} src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoaded}
        onEnded={() => setPlaying(false)}
      />

      <button
        onClick={toggle}
        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg transition-transform duration-200 hover:scale-105 active:scale-95"
        style={{ backgroundColor: 'var(--t-primary)', color: '#fff' }}
      >
        {playing ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" />}
      </button>

      <div className="flex-1 flex flex-col gap-2">
        <div
          className="w-full h-2 rounded-full cursor-pointer overflow-hidden bg-gray-200 dark:bg-gray-800"
          onClick={handleSeek}
        >
          <div
            className="h-full rounded-full transition-all duration-100"
            style={{ width: `${progress}%`, backgroundColor: 'var(--t-primary)' }}
          />
        </div>
        <div className="flex justify-between text-xs font-mono font-medium" style={{ color: 'var(--t-text-muted)' }}>
          <span>{fmt(elapsed)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>
      <Volume2 size={18} style={{ color: 'var(--t-primary)' }} className="flex-shrink-0" />
    </div>
  );
}

export function ReviewImageCard({ review, onOpen, className = '' }) {
  return (
    <button
      type="button"
      className={`text-right rounded-2xl overflow-hidden border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${className}`}
      style={{
        backgroundColor: '#091111',
        borderColor: 'var(--t-border)',
      }}
      onClick={() => onOpen(review)}
    >
      <img
        src={review.image_url}
        alt="صورة مراجعة طالب"
        className="w-full h-80 object-contain opacity-90 transition-opacity hover:opacity-100"
        loading="lazy"
        style={{ backgroundColor: '#091111' }}
      />
    </button>
  );
}

export function ReviewImageLightbox({ review, onClose }) {
  if (!review) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 p-4 flex items-center justify-center backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button
        type="button"
        className="absolute top-4 left-4 w-12 h-12 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
        style={{ color: '#fff' }}
        onClick={onClose}
      >
        <X size={24} />
      </button>

      <div className="max-w-4xl w-full max-h-[88vh] rounded-2xl overflow-hidden border border-white/20 shadow-2xl">
        <img
          src={review.image_url}
          alt="صورة مراجعة طالب"
          className="w-full max-h-[80vh] object-contain bg-black"
        />
      </div>
    </div>
  );
}

function ReviewCarousel({ reviews, onOpen }) {
  const scrollRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (reviews.length <= 1) return;

    let intervalId;
    if (!isHovered) {
      intervalId = setInterval(() => {
        if (scrollRef.current) {
          const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
          const scrollAmount = 320;
          const isAtEnd = Math.abs(scrollLeft) + clientWidth >= scrollWidth - 10;
          
          if (isAtEnd) {
             scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
          } else {
             scrollRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
          }
        }
      }, 3000);
    }

    return () => clearInterval(intervalId);
  }, [isHovered, reviews.length]);

  return (
    <div 
      className="relative w-full overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setIsHovered(false)}
    >
      {/* Desktop Navigation Arrows */}
      {reviews.length > 2 && (
        <div className="hidden md:block">
        <button 
          type="button"
          onClick={() => scrollRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center text-gray-800 hover:bg-white hover:scale-105 transition-all"
          aria-label="السابق"
        >
          <ChevronRight size={20} />
        </button>
        <button 
          type="button"
          onClick={() => scrollRef.current?.scrollBy({ left: -320, behavior: 'smooth' })}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center text-gray-800 hover:bg-white hover:scale-105 transition-all"
          aria-label="التالي"
        >
          <ChevronLeft size={20} />
        </button>
      </div>
      )}

      <div 
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-4"
        style={{ scrollBehavior: 'smooth' }}
      >
        {reviews.map((r) => (
          <div key={r.id} className="snap-center flex-shrink-0 w-[280px] sm:w-[320px]">
            <ReviewImageCard review={r} onOpen={onOpen} className="w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Profile Page (V4 Design) ─────────────────────────── */

export default function TeacherProfilePage() {
  const { gender, id } = useParams();
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);

  const isMale = gender === 'male';
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

  return (
    <div dir="rtl" className="min-h-screen" style={{ backgroundColor: 'var(--t-bg-page)', color: 'var(--t-text)' }}>
      <QuranNav />

      {/* Immersive Hero Header */}
      <header className="relative w-full h-[50vh] min-h-[400px] flex items-end pb-12 overflow-hidden">
        {/* Background Overlay */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundColor: 'var(--t-primary)',
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l2.598 15h5.196L30 7.5 22.206 15h5.196L30 0zm0 60l-2.598-15h-5.196L30 52.5 37.794 45h-5.196L30 60zM0 30l15-2.598v-5.196L7.5 30 15 37.794v-5.196L0 30zm60 0l-15 2.598v5.196L52.5 30 45 22.206v5.196L60 30z' fill='%23ffffff' fill-opacity='0.05' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        {/* Breadcrumb Navigation in Header */}
        <div className="absolute top-24 inset-x-0 z-20 w-full max-w-5xl mx-auto px-5 md:px-8">
           <nav className="flex items-center gap-1.5 text-xs md:text-sm flex-wrap drop-shadow-md" aria-label="مسار التنقل" style={anim(0.05)}>
             <Link to="/quran" className="font-semibold text-white/70 hover:text-white transition-colors">حبل الله</Link>
             <ChevronLeft size={14} className="text-white/40" />
             <Link to="/quran/teachers" className="font-semibold text-white/70 hover:text-white transition-colors">اختر معلمك</Link>
             <ChevronLeft size={14} className="text-white/40" />
             <Link to={`/quran/teachers/${gender}`} className="font-semibold text-white/70 hover:text-white transition-colors">{genderLabel}</Link>
             <ChevronLeft size={14} className="text-white/40" />
             <span className="font-bold text-white">{teacher.name}</span>
           </nav>
        </div>
        
        {/* Hero Content */}
        <div className="relative z-10 w-full max-w-5xl mx-auto px-5 md:px-8 flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-right" style={anim(0.1)}>
          <div className="relative">
            {isMale
              ? <MalePhoto photoUrl={teacher.photo_url} name={teacher.name} size="lg" />
              : <FemaleMonogram name={teacher.name} size="lg" />
            }
            <div className="absolute inset-0 rounded-full border-4 border-black/20" />
          </div>
          <div className="flex-1 text-white">
            <p className="text-sm md:text-base font-semibold text-white/80 mb-2">
              {isMale ? 'معلم قرآن كريم' : 'معلمة قرآن كريم'}
            </p>
            <h1 className="text-3xl md:text-5xl font-black mb-4">{teacher.name}</h1>
            <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start">
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-bold text-sm md:text-base transition-all duration-300 hover:scale-105"
                style={{ backgroundColor: '#CFA767', color: '#000' }}
              >
              اشترك مع المعلم 
                <ChevronRight size={18} />
              </button>
              {teacher.free_trial_enabled && (
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`اود حجز حصة تجريبية مجانية مع ${teacher.gender === 'female' ? 'الأستاذة' : 'الشيخ'} ${teacher.name}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  id="free-trial-btn"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-bold text-sm md:text-base transition-all duration-300 hover:scale-105 border-2 border-white/30"
                  style={{ backgroundColor: '#25D366', color: '#fff' }}
                >
                  <Gift size={18} />
                  جرب حصة مجانية
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="max-w-5xl mx-auto px-5 md:px-8 -mt-6 relative z-20 flex flex-col gap-8 pb-20">
        
        {/* Bio Section */}
        <section className="rounded-3xl p-8 shadow-xl border backdrop-blur-md" style={{ backgroundColor: 'var(--t-bg-card)', borderColor: 'var(--t-border)', ...anim(0.2) }}>
          <h2 className="text-xl font-bold mb-5 flex items-center gap-3" style={{ color: 'var(--t-primary)' }}>
            <div className="p-2 rounded-xl" style={{ backgroundColor: 'var(--t-primary-light)' }}>
              <BookOpen size={20} />
            </div>
            عن المعلم
          </h2>
          <p className="text-lg leading-loose" style={{ color: 'var(--t-text-muted)' }}>
            {teacher.bio}
          </p>
        </section>

        {/* Recitation Section */}
        {isMale && teacher.recitation_url && (
          <section className="rounded-3xl p-8 shadow-xl border" style={{ backgroundColor: 'var(--t-bg-card)', borderColor: 'var(--t-border)', ...anim(0.3) }}>
            <h2 className="text-xl font-bold mb-5 flex items-center gap-3" style={{ color: 'var(--t-primary)' }}>
              <div className="p-2 rounded-xl" style={{ backgroundColor: 'var(--t-primary-light)' }}>
                <PlayCircle size={20} />
              </div>
              الاستماع للتلاوة
            </h2>
            {teacher.recitation_type === 'audio' ? (
              <AudioPlayer src={teacher.recitation_url} />
            ) : (
              <div className="rounded-2xl overflow-hidden aspect-video bg-black/5">
                <video src={teacher.recitation_url} controls className="w-full h-full object-cover" />
              </div>
            )}
          </section>
        )}

        {/* Reviews Section */}
        {reviews.length > 0 && (
          <section className="rounded-3xl p-6 sm:p-8 shadow-xl border overflow-hidden" style={{ backgroundColor: 'var(--t-bg-card)', borderColor: 'var(--t-border)', ...anim(0.4) }}>
            <h2 className="text-xl font-bold mb-5 flex items-center gap-3" style={{ color: 'var(--t-primary)' }}>
              <div className="p-2 rounded-xl" style={{ backgroundColor: 'var(--t-primary-light)' }}>
                <MessageSquare size={20} />
              </div>
              تجارب الطلاب
            </h2>
            
            <ReviewCarousel reviews={reviews} onOpen={setSelectedReview} />

          </section>
        )}

      </main>

      {showModal && <SubscribeModal teacher={teacher} onClose={() => setShowModal(false)} />}
      <ReviewImageLightbox review={selectedReview} onClose={() => setSelectedReview(null)} />

      <QuranFooter />
    </div>
  );
}
