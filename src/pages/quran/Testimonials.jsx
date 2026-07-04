import { useEffect, useState, useRef } from 'react';
import { useReveal } from '../../hooks/useReveal';
import { fetchPublishedQuranReviews } from '../../services/reviewsService';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';

export default function Testimonials() {
  const ref = useReveal();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);

  const anim = (delay = 0) => ({
    animation: `cardFadeIn 0.6s cubic-bezier(0.22,1,0.36,1) ${delay}s both`,
  });

  useEffect(() => {
    let active = true;
    fetchPublishedQuranReviews()
      .then((data) => {
        if (active) setReviews(data ?? []);
      })
      .catch((error) => {
        console.error('[quran reviews fetch failed]', error);
        if (active) setReviews([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (reviews.length <= 1) return;

    let intervalId;
    if (!isHovered) {
      intervalId = setInterval(() => {
        if (scrollRef.current) {
          const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
          const scrollAmount = 340;
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

  if (!loading && reviews.length === 0) {
    return null;
  }

  return (
    <section ref={ref} className="py-24 px-5 md:px-8 pattern-overlay-gold" style={{ backgroundColor: 'var(--t-bg-page)' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14 reveal">
          <h2 className="text-4xl font-black mb-4" style={{ color: 'var(--t-primary)' }}>
            آراء طلاب الأكاديمية
          </h2>
          <div className="w-16 h-1 mx-auto rounded-full" style={{ backgroundColor: 'var(--t-secondary)' }} />
        </div>

        {/* Carousel */}
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
                onClick={() => scrollRef.current?.scrollBy({ left: 380, behavior: 'smooth' })}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/90 shadow-lg flex items-center justify-center text-gray-800 hover:bg-white hover:scale-105 transition-all"
                aria-label="السابق"
              >
                <ChevronRight size={24} />
              </button>
              <button 
                type="button"
                onClick={() => scrollRef.current?.scrollBy({ left: -380, behavior: 'smooth' })}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/90 shadow-lg flex items-center justify-center text-gray-800 hover:bg-white hover:scale-105 transition-all"
                aria-label="التالي"
              >
                <ChevronLeft size={24} />
              </button>
            </div>
          )}

          <div 
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-4"
            style={{ scrollBehavior: 'smooth' }}
          >
            {reviews.map((review, i) => (
              <figure
                key={review.id}
                className="snap-center flex-shrink-0 w-[280px] sm:w-[320px] lg:w-[380px] rounded-3xl border overflow-hidden cursor-pointer hover:-translate-y-1 transition-transform"
                style={{
                  backgroundColor: '#091111',
                  borderColor: 'var(--t-border-gold)',
                  boxShadow: '0 8px 30px var(--t-shadow-card)',
                  ...anim(i * 0.08),
                }}
                onClick={() => setSelectedReview(review)}
              >
                <img
                  src={review.image_url}
                  alt="صورة مراجعة واتساب"
                  loading="lazy"
                  className="w-full h-[360px] sm:h-[430px] lg:h-[500px] object-contain opacity-90 hover:opacity-100 transition-opacity"
                />
              </figure>
            ))}
          </div>
        </div>

      </div>

      {/* Lightbox */}
      {selectedReview && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 p-4 flex items-center justify-center backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedReview(null);
          }}
        >
          <button
            type="button"
            className="absolute top-4 left-4 w-12 h-12 rounded-full flex items-center justify-center transition-colors hover:bg-white/10 text-white"
            onClick={() => setSelectedReview(null)}
          >
            <X size={24} />
          </button>
          <div className="max-w-4xl w-full max-h-[88vh] rounded-2xl overflow-hidden shadow-2xl">
            <img
              src={selectedReview.image_url}
              alt="صورة مراجعة طالب"
              className="w-full max-h-[80vh] object-contain bg-black"
            />
          </div>
        </div>
      )}
    </section>
  );
}
