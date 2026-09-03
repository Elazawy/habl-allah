import { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Share2, Copy, Check, Balloon } from 'lucide-react';


// Lightweight, Mobile-Optimized Canvas Confetti & Balloons
class ConfettiEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.particles = [];
    this.balloons = [];
    this.animId = null;
    this.running = false;
    this.width = 0;
    this.height = 0;
  }

  resize() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetWidth = Math.floor(rect.width * dpr);
    const targetHeight = Math.floor(rect.height * dpr);

    if (this.canvas.width !== targetWidth || this.canvas.height !== targetHeight) {
      this.canvas.width = targetWidth;
      this.canvas.height = targetHeight;
      if (this.ctx) {
        this.ctx.scale(dpr, dpr);
      }
    }
    this.width = rect.width;
    this.height = rect.height;
  }

  // Spawn adorable, floating party balloons scaled for mobile and desktop
  spawnBalloons(count = 4) {
    if (!this.canvas || !this.ctx) return;
    this.resize();

    const currentWidth = this.width || 360;
    const currentHeight = this.height || 550;
    const isMobile = currentWidth < 640;

    // Responsive dimensions:
    // Mobile: radiusX 13-17px (width 26-34px), radiusY 18-23px (height 36-46px)
    // Desktop: radiusX 18-23px (width 36-46px), radiusY 23-30px (height 46-60px)
    const baseRx = isMobile ? 14 : 19;
    const baseRy = isMobile ? 19 : 25;

    const palettes = [
      // 1. Royal Gold (ذهب ملكي مشرق)
      { lightColor: '#FEF08A', color: '#F59E0B', darkColor: '#B45309', shineColor: 'rgba(255,255,255,0.60)' },
      // 2. Quranic Emerald (زمرد قرآني بهيج)
      { lightColor: '#6EE7B7', color: '#10B981', darkColor: '#047857', shineColor: 'rgba(255,255,255,0.55)' },
      // 3. Sky Turquoise / Celestial Blue (سماوي فيروزي)
      { lightColor: '#BAE6FD', color: '#0EA5E9', darkColor: '#0369A1', shineColor: 'rgba(255,255,255,0.60)' },
      // 4. Festive Coral / Rose (وردي احتفالي مبهج)
      { lightColor: '#FECDD3', color: '#F43F5E', darkColor: '#9F1239', shineColor: 'rgba(255,255,255,0.55)' },
      // 5. Radiant Violet (بنفسجي مشرق)
      { lightColor: '#E9D5FF', color: '#A855F7', darkColor: '#6B21A8', shineColor: 'rgba(255,255,255,0.55)' },
      // 6. Warm Amber / Tangerine (عنبر مشرق)
      { lightColor: '#FED7AA', color: '#F97316', darkColor: '#C2410C', shineColor: 'rgba(255,255,255,0.55)' },
    ];

    const minX = isMobile ? 26 : 48;
    const maxX = currentWidth - minX;
    const safeSpan = Math.max(40, maxX - minX);

    for (let i = 0; i < count; i++) {
      const palette = palettes[(this.balloons.length + i) % palettes.length];
      const scale = Math.random() * 0.28 + 0.86; // 0.86 to 1.14
      const radiusX = baseRx * scale;
      const radiusY = baseRy * scale;

      const seg = safeSpan / count;
      const baseX = minX + seg * i + Math.random() * (seg * 0.5) + (seg * 0.25);
      // Stagger Y so balloons enter the scene continuously in a soft organic flow
      const startY = currentHeight + radiusY + 15 + (i * 28) + (Math.random() * 20);

      // Upward float speed (gentle, serene buoyancy)
      const vy = -(Math.random() * 0.55 + (isMobile ? 1.3 : 1.6));
      const stringLength = isMobile ? radiusY * 1.35 : radiusY * 1.5;

      this.balloons.push({
        baseX,
        x: baseX,
        y: startY,
        vy,
        radiusX,
        radiusY,
        palette,
        stringLength,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleSpeed: Math.random() * 0.024 + 0.018,
        wobbleAmp: Math.random() * 4 + (isMobile ? 5 : 8),
        rotation: 0,
        opacity: 0.94,
      });
    }

    if (!this.running) {
      this.running = true;
      this.animate();
    }
  }

  // Draw an individual balloon with organic curves, 3D radial shine, tied knot, and swinging string
  drawBalloon(b) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate((b.rotation * Math.PI) / 180);
    ctx.globalAlpha = b.opacity;

    const w = b.radiusX;
    const h = b.radiusY;

    // 1. Waving dangling string
    ctx.beginPath();
    ctx.moveTo(0, h + 2);
    const strLen = b.stringLength;
    const s1 = Math.sin(b.wobblePhase) * 4;
    const s2 = -Math.sin(b.wobblePhase + 0.8) * 3.5;
    ctx.bezierCurveTo(
      s1, h + 2 + strLen * 0.35,
      s2, h + 2 + strLen * 0.7,
      s1 * 0.5, h + 2 + strLen
    );
    ctx.strokeStyle = 'rgba(150, 150, 150, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 2. Tied knot at base
    ctx.beginPath();
    ctx.moveTo(-w * 0.22, h + 3.5);
    ctx.lineTo(w * 0.22, h + 3.5);
    ctx.lineTo(0, h - 0.5);
    ctx.closePath();
    ctx.fillStyle = b.palette.darkColor;
    ctx.fill();

    // 3. Balloon Body - Organic pear-shaped curve
    ctx.beginPath();
    ctx.moveTo(0, -h);
    ctx.bezierCurveTo(w * 1.2, -h * 0.65, w * 1.08, h * 0.65, 0, h);
    ctx.bezierCurveTo(-w * 1.08, h * 0.65, -w * 1.2, -h * 0.65, 0, -h);
    ctx.closePath();

    // 3D Spherical Radial Gradient
    const grad = ctx.createRadialGradient(
      -w * 0.28, -h * 0.35, w * 0.08,
      0, 0, Math.max(w, h) * 1.15
    );
    grad.addColorStop(0, b.palette.lightColor);
    grad.addColorStop(0.55, b.palette.color);
    grad.addColorStop(1, b.palette.darkColor);
    ctx.fillStyle = grad;
    ctx.fill();

    // 4. Glossy Specular Highlight (Upper Left)
    ctx.beginPath();
    ctx.ellipse(-w * 0.35, -h * 0.38, w * 0.22, h * 0.32, -Math.PI / 4.5, 0, Math.PI * 2);
    ctx.fillStyle = b.palette.shineColor;
    ctx.fill();

    // Secondary subtle pin-point highlight
    ctx.beginPath();
    ctx.arc(-w * 0.16, -h * 0.65, Math.max(1.2, w * 0.08), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fill();

    ctx.restore();
  }

  burst(options = {}) {
    if (!this.canvas || !this.ctx) return;
    this.resize();

    const config = typeof options === 'number' ? { count: options } : (options || {});
    const count = config.count || 120;
    const colors = [
      '#CFA767', // Warm Gold
      '#F59E0B', // Amber 500
      '#FBBF24', // Amber 400
      '#FDE047', // Yellow 300 (Sparkle Gold)
      '#10B981', // Emerald 500
      '#059669', // Emerald 600
      '#1B4D3E', // Deep Quranic Green
      '#34D399', // Emerald 400
      '#F5D061', // Radiant Gold
      '#EAB308', // Amber-Yellow 500
    ];

    const currentWidth = this.width || 400;
    const originXRatio = config.originXRatio ?? 0.5;
    const originX = config.originX ?? (currentWidth * originXRatio);
    const originY = config.originY ?? 50;
    const spreadX = config.spreadX ?? 40;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.7;
      const speed = (Math.random() * 7.5 + 3.5) * (config.speedMultiplier || 1);
      const isStar = Math.random() < 0.88; // 88% stars (dominant festive stars)
      const starType = isStar ? (Math.random() > 0.4 ? '5-point' : 'sparkle') : 'ribbon';
      const isLarge = Math.random() > 0.75;
      const size = isLarge ? Math.random() * 6 + 10 : Math.random() * 5 + 5;

      this.particles.push({
        x: originX + (Math.random() - 0.5) * spreadX,
        y: originY + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed * (Math.random() * 1.2 + 0.6) + (config.biasVx || 0),
        vy: Math.sin(angle) * speed - (Math.random() * 3.5 + 2.5),
        gravity: Math.random() * 0.04 + 0.13,
        drag: 0.98,
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        size,
        isStar,
        starType,
        life: 1,
        decay: Math.random() * 0.007 + 0.005,
      });
    }

    if (!this.running) {
      this.running = true;
      this.animate();
    }
  }

  animate() {
    if (!this.running || !this.canvas || !this.ctx) return;
    this.ctx.clearRect(0, 0, this.width || 800, this.height || 600);

    // 1. Draw rising balloons (in background behind stars)
    for (let i = this.balloons.length - 1; i >= 0; i--) {
      const b = this.balloons[i];
      b.y += b.vy;
      b.wobblePhase += b.wobbleSpeed;
      b.x = b.baseX + Math.sin(b.wobblePhase) * b.wobbleAmp;
      b.rotation = Math.sin(b.wobblePhase) * 5;

      // Clean up balloons that have floated past top of canvas
      if (b.y < -(b.radiusY + b.stringLength + 40)) {
        this.balloons.splice(i, 1);
        continue;
      }

      this.drawBalloon(b);
    }

    // 2. Draw falling stars & confetti particles
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
        if (p.starType === 'sparkle') {
          // 4-point diamond sparkle star (✨)
          this.ctx.beginPath();
          const r = p.size * 0.85;
          const innerR = r * 0.22;
          for (let s = 0; s < 4; s++) {
            const outerAngle = ((s * 90) * Math.PI) / 180;
            const innerAngle = ((s * 90 + 45) * Math.PI) / 180;
            if (s === 0) {
              this.ctx.moveTo(Math.cos(outerAngle) * r, Math.sin(outerAngle) * r);
            } else {
              this.ctx.lineTo(Math.cos(outerAngle) * r, Math.sin(outerAngle) * r);
            }
            this.ctx.lineTo(Math.cos(innerAngle) * innerR, Math.sin(innerAngle) * innerR);
          }
          this.ctx.closePath();
          this.ctx.fill();
        } else {
          // 5-point star (★)
          this.ctx.beginPath();
          const r = p.size * 0.75;
          const innerR = r * 0.42;
          for (let s = 0; s < 5; s++) {
            const outerAngle = ((18 + s * 72) * Math.PI) / 180;
            const innerAngle = ((54 + s * 72) * Math.PI) / 180;
            if (s === 0) {
              this.ctx.moveTo(Math.cos(outerAngle) * r, -Math.sin(outerAngle) * r);
            } else {
              this.ctx.lineTo(Math.cos(outerAngle) * r, -Math.sin(outerAngle) * r);
            }
            this.ctx.lineTo(Math.cos(innerAngle) * innerR, -Math.sin(innerAngle) * innerR);
          }
          this.ctx.closePath();
          this.ctx.fill();
        }
      } else {
        this.ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.6);
      }

      this.ctx.restore();
    }

    if (this.particles.length > 0 || this.balloons.length > 0) {
      this.animId = requestAnimationFrame(() => this.animate());
    } else {
      this.running = false;
    }
  }

  stop() {
    this.running = false;
    if (this.animId) cancelAnimationFrame(this.animId);
    this.particles = [];
    this.balloons = [];
  }
}

// Cute, 3D Decorative Balloon Cluster fixed next to the contestant's name
function FixedBalloonCluster({ side = 'right', className = '', onClick }) {
  const isRight = side === 'right';
  const prefix = isRight ? 'fbr' : 'fbl';

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`relative shrink-0 select-none transition-transform duration-300 active:scale-95 ${onClick ? 'cursor-pointer hover:scale-105' : ''} ${className}`}
      title="اضغط للاحتفال مجدداً!"
    >
      <svg
        viewBox="0 0 70 102"
        className="w-8 h-12 sm:w-12 sm:h-18 md:w-14 md:h-20 drop-shadow-sm overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          {/* Palette 1: Gold */}
          <radialGradient id={`${prefix}-gold`} cx="32%" cy="26%" r="68%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#B45309" />
          </radialGradient>
          {/* Palette 2: Emerald */}
          <radialGradient id={`${prefix}-emerald`} cx="32%" cy="26%" r="68%">
            <stop offset="0%" stopColor="#6EE7B7" />
            <stop offset="50%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#047857" />
          </radialGradient>
          {/* Palette 3: Sky Blue */}
          <radialGradient id={`${prefix}-blue`} cx="32%" cy="26%" r="68%">
            <stop offset="0%" stopColor="#BAE6FD" />
            <stop offset="50%" stopColor="#0EA5E9" />
            <stop offset="100%" stopColor="#0369A1" />
          </radialGradient>
          {/* Palette 4: Rose Coral */}
          <radialGradient id={`${prefix}-rose`} cx="32%" cy="26%" r="68%">
            <stop offset="0%" stopColor="#FECDD3" />
            <stop offset="50%" stopColor="#F43F5E" />
            <stop offset="100%" stopColor="#9F1239" />
          </radialGradient>
          {/* Palette 5: Amber */}
          <radialGradient id={`${prefix}-amber`} cx="32%" cy="26%" r="68%">
            <stop offset="0%" stopColor="#FED7AA" />
            <stop offset="50%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#C2410C" />
          </radialGradient>
        </defs>

        {/* Strings */}
        <g stroke="#cbd5e1" strokeWidth="1.2" strokeLinecap="round" fill="none">
          <path d="M 22 53 C 24 67, 28 80, 35 88" />
          <path d="M 48 50 C 46 65, 42 78, 35 88" />
          <path d="M 35 59 C 36 68, 34 78, 35 88" strokeWidth="1.3" />
        </g>

        {/* Balloon 1 (Back Left) */}
        <g transform="rotate(-12, 22, 36)">
          <path
            d="M 22 19 C 33 19, 34 35, 22 51 C 10 35, 11 19, 22 19 Z"
            fill={`url(#${prefix}-${isRight ? 'emerald' : 'rose'})`}
          />
          <polygon points="20,52 24,52 22,49" fill={isRight ? '#047857' : '#9F1239'} />
          <ellipse cx="17" cy="27" rx="3" ry="5.5" transform="rotate(-30, 17, 27)" fill="white" opacity="0.6" />
          <circle cx="20" cy="23" r="1.1" fill="white" opacity="0.8" />
        </g>

        {/* Balloon 2 (Back Right) */}
        <g transform="rotate(14, 48, 33)">
          <path
            d="M 48 17 C 58 17, 59 32, 48 48 C 37 32, 38 17, 48 17 Z"
            fill={`url(#${prefix}-${isRight ? 'blue' : 'amber'})`}
          />
          <polygon points="46,49 50,49 48,46" fill={isRight ? '#0369A1' : '#C2410C'} />
          <ellipse cx="44" cy="24" rx="2.8" ry="5" transform="rotate(-30, 44, 24)" fill="white" opacity="0.6" />
          <circle cx="46.5" cy="20.5" r="1" fill="white" opacity="0.8" />
        </g>

        {/* Balloon 3 (Front Center) */}
        <g>
          <path
            d="M 35 21 C 47.5 21, 48.5 40, 35 57 C 21.5 40, 22.5 21, 35 21 Z"
            fill={`url(#${prefix}-${isRight ? 'gold' : 'emerald'})`}
          />
          <polygon points="32.5,58 37.5,58 35,55" fill={isRight ? '#B45309' : '#047857'} />
          <ellipse cx="30" cy="30" rx="3.5" ry="6.5" transform="rotate(-30, 30, 30)" fill="white" opacity="0.65" />
          <circle cx="33" cy="25" r="1.3" fill="white" opacity="0.85" />
        </g>

        {/* Tied Golden Ribbon Bow at base */}
        <g fill="#D97706">
          <path d="M 35 88 C 29 83, 24 88, 31 92 Z" />
          <path d="M 35 88 C 41 83, 46 88, 39 92 Z" />
          <circle cx="35" cy="89" r="2.2" fill="#B45309" />
          <path d="M 34 90 Q 29 95, 27 99 M 36 90 Q 41 95, 43 99" stroke="#D97706" strokeWidth="1.3" strokeLinecap="round" fill="none" />
        </g>
      </svg>
    </div>
  );
}

export default function StudentCompetitionCelebration({
  studentName = 'طالب القرآن الكريم',
  competitionName = 'المسابقة القرآنية',
  level = 'المستوى العام',
  finalRank = 1,
  teacherName = '',
}) {
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const timersRef = useRef([]);

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

  const clearCelebrationTimers = useCallback(() => {
    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current = [];
  }, []);

  // 3-wave celebration sequence with abundant stars and floating balloons
  const triggerCelebration = useCallback(() => {
    if (!engineRef.current) return;
    clearCelebrationTimers();
    const engine = engineRef.current;
    const isMobile = (engine.width || (typeof window !== 'undefined' ? window.innerWidth : 360)) < 640;

    // Wave 1: Central grand burst of stars + first wave of floating balloons
    timersRef.current.push(
      setTimeout(() => {
        engine.burst({
          count: 125,
          originXRatio: 0.5,
          originY: 45,
          spreadX: 50,
          biasVx: 0,
        });
        engine.spawnBalloons(isMobile ? 3 : 4);
      }, 50)
    );

    // Wave 2: Left-side festive wave of stars + second wave of balloons
    timersRef.current.push(
      setTimeout(() => {
        engine.burst({
          count: 115,
          originXRatio: 0.28,
          originY: 60,
          spreadX: 40,
          biasVx: 1.5,
        });
        engine.spawnBalloons(isMobile ? 3 : 4);
      }, 650)
    );

    // Wave 3: Right-side celebratory grand finale of stars + final wave of balloons
    timersRef.current.push(
      setTimeout(() => {
        engine.burst({
          count: 135,
          originXRatio: 0.72,
          originY: 60,
          spreadX: 40,
          biasVx: -1.5,
        });
        engine.spawnBalloons(isMobile ? 4 : 5);
      }, 1300)
    );
  }, [clearCelebrationTimers]);

  // Confetti Init
  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new ConfettiEngine(canvasRef.current);
    engineRef.current = engine;
    engine.resize();

    const handleResize = () => engine.resize();
    window.addEventListener('resize', handleResize);

    // Trigger the 3-wave celebration when the student view loads
    const initialTimer = setTimeout(() => {
      triggerCelebration();
    }, 250);

    return () => {
      clearTimeout(initialTimer);
      clearCelebrationTimers();
      window.removeEventListener('resize', handleResize);
      engine.stop();
    };
  }, [triggerCelebration, clearCelebrationTimers]);

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
      <section className="relative py-6 sm:py-10 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8 text-center">
          
          {/* Arched Celebratory Top Ribbon */}
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-full bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-white font-black text-xs sm:text-sm shadow-md max-w-full">
            <Balloon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-amber-200" />
            <span className="leading-snug">مُبَارَكٌ الفَوْزُ وَالاجْتِيَازُ يَا بَطَلَ القُرْآنِ!</span>
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-amber-200" />
          </div>

          {/* Student Name & Achievement Title with Fixed Festive Balloons */}
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 sm:gap-4 md:gap-5 max-w-full px-1">
              {/* Right-side Fixed Balloons */}
              <FixedBalloonCluster
                side="right"
                className="animate-balloon-float-right"
                onClick={triggerCelebration}
              />

              {/* Student Name */}
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-stone-900 dark:text-white tracking-tight leading-snug break-words">
                {studentName}
              </h2>

              {/* Left-side Fixed Balloons */}
              <FixedBalloonCluster
                side="left"
                className="animate-balloon-float-left"
                onClick={triggerCelebration}
              />
            </div>
            
            <p className="text-base sm:text-lg font-bold text-emerald-700 dark:text-emerald-400">
              {competitionName} {level ? `• ${level}` : ''}
            </p>
            {teacherName && (
              <p className="text-xs sm:text-sm font-medium text-stone-500 dark:text-stone-400">
                بإشراف المعلم: {teacherName}
              </p>
            )}
          </div>

          {/* Celebration Trigger Button in screen center */}
          <div className="flex justify-center pt-1">
            <button
              onClick={triggerCelebration}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs sm:text-sm bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-500/30 transition-all cursor-pointer shadow-sm active:scale-95"
              title="إطلاق الزينة والبلالين والاحتفال"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <Balloon className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 shrink-0" />
              <span>احتفل مجدداً</span>
            </button>
          </div>

          {/* Heartfelt Duaa in Open Styled Quotes */}
          <div className="relative py-4 max-w-xl mx-auto px-2">
            <span className="text-3xl text-amber-500/40 font-serif leading-none block -mb-2">“</span>
            <p className="text-sm sm:text-base text-stone-700 dark:text-stone-300 leading-relaxed font-semibold italic">
              بَارَكَ اللَّهُ لَكَ فِي حِفْظِكَ، وَجَعَلَ القُرْآنَ العَظِيمَ نُوراً لِقَلْبِكَ وَرِفْعَةً لَكَ فِي الدَّارَيْنِ، وَهَنِيئاً لِوَالِدَيْكَ تَاجَ الوَقَارِ.
            </p>
            <span className="text-3xl text-amber-500/40 font-serif leading-none block -mt-2">”</span>
          </div>

          {/* Mobile-Friendly Share & Copy Buttons (Always Side-by-Side) */}
          <div className="pt-2 flex flex-row items-center justify-center gap-3 w-full max-w-xs sm:max-w-sm mx-auto px-1">
            {/* 1. Share Button */}
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-sm transition-all cursor-pointer h-10 sm:h-11 active:scale-95 whitespace-nowrap"
            >
              <Share2 className="w-3.5 h-3.5 shrink-0" />
              <span>مشاركة الفرحة</span>
            </button>

            {/* 2. Copy Text Button */}
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 transition-all cursor-pointer h-10 sm:h-11 active:scale-95 whitespace-nowrap"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>تم النسخ!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 shrink-0" />
                  <span>نسخ التهنئة</span>
                </>
              )}
            </button>
          </div>

        </div>
      </section>

    </div>
  );
}
