import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Headphones,
  Pause,
  Play,
  RefreshCcw,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import logoGold from '../../../assets/logo-gold.png';

const PLAYBACK_RATES = [1, 1.25, 1.5, 2];

function formatAudioTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export default function LectureAudioPlayer({
  src,
  title,
  titleDir = 'auto',
  courseName,
  courseNameDir = 'auto',
  courseImageUrl,
  loading = false,
  error = '',
  onRetry,
}) {
  const { t } = useTranslation('courseWatch');
  const audioRef = useRef(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [muted, setMuted] = useState(false);
  const [audioLoadError, setAudioLoadError] = useState(false);

  useEffect(() => {
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setAudioLoadError(false);
  }, [src]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.muted = muted;
    }
  }, [src, playbackRate, muted]);

  const togglePlay = async () => {
    const el = audioRef.current;
    if (!el || !src) return;

    if (playing) {
      el.pause();
      setPlaying(false);
      return;
    }

    try {
      await el.play();
      setPlaying(true);
    } catch (playErr) {
      console.error('[audio playback failed]', playErr);
      setPlaying(false);
    }
  };

  const skipBy = (deltaSeconds) => {
    const el = audioRef.current;
    if (!el) return;
    const maxTime = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : duration;
    const nextTime = Math.max(0, Math.min(maxTime || 0, el.currentTime + deltaSeconds));
    el.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const handleSeek = (event) => {
    const el = audioRef.current;
    const nextTime = Number(event.target.value);
    setCurrentTime(nextTime);
    if (el && Number.isFinite(nextTime)) {
      el.currentTime = nextTime;
    }
  };

  const cyclePlaybackRate = () => {
    const idx = PLAYBACK_RATES.indexOf(playbackRate);
    const nextRate = PLAYBACK_RATES[(idx + 1) % PLAYBACK_RATES.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const toggleMute = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    if (audioRef.current) {
      audioRef.current.muted = nextMuted;
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-8 flex flex-col items-center justify-center gap-3 text-white">
        <div className="w-9 h-9 border-2 border-white/20 border-t-amber-400 rounded-full animate-spin" />
        <p className="text-xs font-semibold text-white/80">{t('layout.loadingAudio')}</p>
      </div>
    );
  }

  if (error || audioLoadError || !src) {
    return (
      <div className="w-full max-w-2xl mx-auto rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-8 flex flex-col items-center justify-center text-center text-white gap-3">
        <Headphones className="w-10 h-10 text-amber-300/70" />
        <p className="text-xs text-white/80">
          {error || (audioLoadError ? t('audioPlayer.playbackError') : t('layout.playbackFallbackError'))}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={() => {
              setAudioLoadError(false);
              onRetry();
            }}
            className="inline-flex items-center gap-2 py-2 px-4 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            {t('layout.retry')}
          </button>
        )}
      </div>
    );
  }

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div
      className="w-full max-w-2xl mx-auto rounded-3xl border border-emerald-400/20 bg-white/10 backdrop-blur-md p-5 sm:p-7 shadow-2xl text-white space-y-5"
      onContextMenu={(event) => event.preventDefault()}
    >
      <audio
        ref={audioRef}
        key={src}
        src={src}
        preload="metadata"
        controlsList="nodownload noremoteplayback"
        onLoadedMetadata={(event) => {
          setDuration(event.currentTarget.duration || 0);
          event.currentTarget.playbackRate = playbackRate;
          event.currentTarget.muted = muted;
        }}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)}
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        onError={() => {
          setPlaying(false);
          setAudioLoadError(true);
        }}
      />

      {/* Artwork & Lecture Meta */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border border-white/15 bg-emerald-950/70 shrink-0 flex items-center justify-center shadow-lg">
          <img
            src={courseImageUrl || logoGold}
            alt={courseName || title || ''}
            className={`w-full h-full ${courseImageUrl ? 'object-cover' : 'object-contain p-2'}`}
          />
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/15 text-amber-300 border border-amber-400/25">
            <Headphones size={12} />
            <span>{t('audioPlayer.badge')}</span>
          </span>
          <h2 dir={titleDir} className="text-sm sm:text-base font-black text-white truncate">
            {title}
          </h2>
          {courseName && (
            <p dir={courseNameDir} className="text-xs text-white/65 truncate">
              {courseName}
            </p>
          )}
        </div>
      </div>

      {/* Seek Slider (explicit LTR so left -> right matches audio progress) */}
      <div className="space-y-1.5" dir="ltr">
        <div className="relative flex items-center">
          <input
            type="range"
            min={0}
            max={duration > 0 ? duration : 0}
            step="0.1"
            value={Math.min(currentTime, duration || 0)}
            onChange={handleSeek}
            aria-label={t('audioPlayer.seek')}
            disabled={!duration}
            className="w-full h-2 rounded-full appearance-none cursor-pointer accent-amber-400 disabled:cursor-default"
            style={{
              background: `linear-gradient(to right, #fbbf24 ${progressPercent}%, rgba(255,255,255,0.2) ${progressPercent}%)`,
            }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono text-white/70">
          <span>{formatAudioTime(currentTime)}</span>
          <span>{formatAudioTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={cyclePlaybackRate}
            aria-label={t('audioPlayer.speed')}
            title={t('audioPlayer.speed')}
            className="px-2.5 py-1.5 rounded-xl text-xs font-extrabold bg-white/10 hover:bg-white/20 text-amber-300 border border-white/10 transition-colors cursor-pointer min-w-[46px]"
            dir="ltr"
          >
            {playbackRate}x
          </button>

          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? t('audioPlayer.unmute') : t('audioPlayer.mute')}
            title={muted ? t('audioPlayer.unmute') : t('audioPlayer.mute')}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 text-white/85 transition-colors cursor-pointer"
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>

        <div className="flex items-center gap-2.5" dir="ltr">
          <button
            type="button"
            onClick={() => skipBy(-15)}
            aria-label={t('audioPlayer.rewind15')}
            title={t('audioPlayer.rewind15')}
            className="h-9 px-2.5 rounded-xl flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            <RotateCcw size={15} />
            <span>15</span>
          </button>

          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? t('audioPlayer.pause') : t('audioPlayer.play')}
            title={playing ? t('audioPlayer.pause') : t('audioPlayer.play')}
            className="w-12 h-12 rounded-full flex items-center justify-center bg-amber-400 hover:bg-amber-300 text-emerald-950 shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ms-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => skipBy(15)}
            aria-label={t('audioPlayer.forward15')}
            title={t('audioPlayer.forward15')}
            className="h-9 px-2.5 rounded-xl flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            <span>15</span>
            <RotateCw size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
