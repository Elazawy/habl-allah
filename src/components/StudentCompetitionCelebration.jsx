import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trophy, Sparkles, Award, Star, CheckCircle2, Share2, Printer, Copy, Check, BookOpen, RotateCcw } from 'lucide-react';

// Lightweight, Mobile-Optimized Canvas Confetti
class ConfettiEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.animId = null;
    this.running = false;
  }

  resize() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.width = rect.width;
    this.height = rect.height;
  }

  burst(count = 75) {
    if (!this.canvas) return;
    this.resize();
    const colors = ['#CFA767', '#1B4D3E', '#4ead88', '#f59e0b', '#fbbf24', '#059669', '#d97706'];
    const originX = this.width ? this.width / 2 : 200;
    const originY = 50;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
      const speed = Math.random() * 7 + 3;
      this.particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed * (Math.random() * 1.2 + 0.6),
        vy: Math.sin(angle) * speed - (Math.random() * 3 + 2),
        gravity: 0.16,
        drag: 0.98,
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 6 + 4,
        isStar: Math.random() > 0.6,
        life: 1,
        decay: Math.random() * 0.012 + 0.008,
      });
    }

    if (!this.running) {
      this.running = true;
      this.animate();
    }
  }

  animate() {
    if (!this.running || !this.canvas) return;
    this.ctx.clearRect(0, 0, this.width || 800, this.height || 600);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.rotation += p.vRot;
      p.life -= p.decay;

      if (p.life <= 0 || p.y > (this.height || 600) + 20) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.rotation * Math.PI) / 180);
      this.ctx.globalAlpha = Math.max(0, p.life);
      this.ctx.fillStyle = p.color;

      if (p.isStar) {
        this.ctx.beginPath();
        const r = p.size * 0.7;
        for (let s = 0; s < 5; s++) {
          this.ctx.lineTo(Math.cos(((18 + s * 72) * Math.PI) / 180) * r, -Math.sin(((18 + s * 72) * Math.PI) / 180) * r);
          this.ctx.lineTo(Math.cos(((54 + s * 72) * Math.PI) / 180) * (r / 2), -Math.sin(((54 + s * 72) * Math.PI) / 180) * (r / 2));
        }
        this.ctx.closePath();
        this.ctx.fill();
      } else {
        this.ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.6);
      }

      this.ctx.restore();
    }

    if (this.particles.length > 0) {
      this.animId = requestAnimationFrame(() => this.animate());
    } else {
      this.running = false;
    }
  }

  stop() {
    this.running = false;
    if (this.animId) cancelAnimationFrame(this.animId);
    this.particles = [];
  }
}

export default function StudentCompetitionCelebration({
  studentName = 'طالب القرآن الكريم',
  competitionName = 'المسابقة القرآنية',
  level = 'المستوى العام',
  finalRank = 1,
  stagesCount = 3,
  completionDate = null,
  teacherName = '',
}) {
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef(null);
  const engineRef = useRef(null);

  const formattedDate = completionDate
    ? new Date(completionDate).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });

  // Rank metadata
  const getRankData = (rank) => {
    const num = Number(rank);
    if (num === 1) {
      return {
        title: 'المركز الأول',
        honorTitle: 'الفائز بالمركز الأول الذهبي',
        badge: '🥇 المركز الأول',
        accentColor: '#CFA767',
      };
    }
    if (num === 2) {
      return {
        title: 'المركز الثاني',
        honorTitle: 'الفائز بالمركز الثاني الفضي',
        badge: '🥈 المركز الثاني',
        accentColor: '#94a3b8',
      };
    }
    if (num === 3) {
      return {
        title: 'المركز الثالث',
        honorTitle: 'الفائز بالمركز الثالث البرونزي',
        badge: '🥉 المركز الثالث',
        accentColor: '#d97706',
      };
    }
    return {
      title: 'اجتياز وتفوق',
      honorTitle: 'مجتاز للمسابقة بتفوق وتميز',
      badge: '🌟 اجتياز وتفوق',
      accentColor: '#1B4D3E',
    };
  };

  const rankData = getRankData(finalRank);

  // Confetti Init
  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new ConfettiEngine(canvasRef.current);
    engineRef.current = engine;
    engine.resize();

    const handleResize = () => engine.resize();
    window.addEventListener('resize', handleResize);

    const timer = setTimeout(() => {
      engine.burst(80);
    }, 300);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      engine.stop();
    };
  }, []);

  const triggerCelebration = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.burst(75);
    }
  }, []);

  const shareTitle = `مبارك فوز الطالب ${studentName} في مسابقة ${competitionName}`;
  const shareText = `الحمد لله الذي بنعمته تتم الصالحات! 🌟\nبفضل الله وتوفيقه، اجتزت مسابقة "${competitionName}" (${rankData.badge}) في أكاديمية حبل الله للقرآن الكريم. 📜✨\nنسأل الله أن يجعل القرآن ربيع قلوبنا وشفيعاً لنا يوم القيامة.`;

  // Native Web Share on Mobile, fallback to WhatsApp web
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: window.location.href,
        });
        return;
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error(err);
        }
      }
    }
    // Fallback: WhatsApp URL
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div dir="rtl" className="relative w-full overflow-hidden my-4">
      {/* Confetti Overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-20"
      />

      {/* =========================================================================
          "واحة البهجة والرياحين" (Festive Quranic Garden & Joyful Illuminations)
          Warm, open, unboxed, authentic celebration with flowing ribbons and heartfelt duaa.
          ========================================================================= */}
      <section className="relative py-6 sm:py-10 px-2 sm:px-6">
        <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8 text-center">
          
          {/* Arched Celebratory Top Ribbon */}
          <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-white font-black text-xs sm:text-sm shadow-md">
            <Sparkles className="w-4 h-4" />
            <span>مُبَارَكٌ الفَوْزُ وَالاجْتِيَازُ يَا بَطَلَ القُرْآنِ!</span>
            <Sparkles className="w-4 h-4" />
          </div>

          {/* Student Name & Achievement Title */}
          <div className="space-y-2">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-stone-900 dark:text-white">
              {studentName}
            </h2>
            
            <p className="text-base sm:text-lg font-bold text-emerald-700 dark:text-emerald-400">
              {competitionName} {level ? `• ${level}` : ''}
            </p>
          </div>

          {/* Fluid Highlight Badge (Unboxed) */}
          <div className="inline-flex flex-col sm:flex-row items-center gap-3 p-4 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-center sm:text-right">
            <div className="w-14 h-14 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-sm">
              <Trophy className="w-8 h-8" />
            </div>
            <div>
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300 block">المرتبة المستحقة:</span>
              <span className="text-lg font-black text-stone-900 dark:text-white">{rankData.honorTitle}</span>
            </div>
          </div>

          {/* Heartfelt Duaa in Open Styled Quotes */}
          <div className="relative py-4 max-w-xl mx-auto">
            <span className="text-3xl text-amber-500/40 font-serif leading-none block -mb-2">“</span>
            <p className="text-sm sm:text-base text-stone-700 dark:text-stone-300 leading-relaxed font-semibold italic">
              بَارَكَ اللَّهُ لَكَ فِي حِفْظِكَ، وَجَعَلَ القُرْآنَ العَظِيمَ نُوراً لِقَلْبِكَ وَرِفْعَةً لَكَ فِي الدَّارَيْنِ، وَهَنِيئاً لِوَالِدَيْكَ تَاجَ الوَقَارِ.
            </p>
            <span className="text-3xl text-amber-500/40 font-serif leading-none block -mt-2">”</span>
          </div>

          {/* Milestone Highlights in Minimalist Row */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-bold text-stone-600 dark:text-stone-400">
            <span className="inline-flex items-center gap-1 bg-stone-100 dark:bg-stone-800 px-3.5 py-1.5 rounded-full border border-stone-200 dark:border-stone-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              المراحل: {stagesCount} من {stagesCount}
            </span>
            <span className="inline-flex items-center gap-1 bg-stone-100 dark:bg-stone-800 px-3.5 py-1.5 rounded-full border border-stone-200 dark:border-stone-700">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              وسام الإتقان القرآني
            </span>
            <span className="inline-flex items-center gap-1 bg-stone-100 dark:bg-stone-800 px-3.5 py-1.5 rounded-full border border-stone-200 dark:border-stone-700">
              <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
              {formattedDate}
            </span>
          </div>

          {/* Mobile Touch Actions (Min 48px height) */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-lg mx-auto">
            <button
              onClick={handleShare}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl font-black text-sm bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[48px] active:scale-95"
            >
              <Share2 className="w-4 h-4" />
              <span>شارك فرحتك مع الأهل</span>
            </button>

            <button
              onClick={handleCopy}
              className="w-full sm:w-auto px-5 py-3.5 rounded-2xl font-bold text-sm bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[48px]"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'تم النسخ!' : 'نسخ التهنئة'}</span>
            </button>

            <button
              onClick={triggerCelebration}
              className="w-full sm:w-auto px-5 py-3.5 rounded-2xl font-bold text-sm bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[48px]"
              title="إطلاق الزينة والاحتفال"
            >
              <RotateCcw className="w-4 h-4" />
              <span>🎉 احتفل مجدداً</span>
            </button>
          </div>

        </div>
      </section>
    </div>
  );
}
