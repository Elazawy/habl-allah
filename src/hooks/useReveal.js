import { useEffect, useRef } from 'react';

/**
 * useReveal — attach to a container ref.
 * All descendants with class "reveal", "reveal-left", "reveal-right",
 * or "reveal-scale" will get the "visible" class when they enter the viewport.
 *
 * @param {object} options - IntersectionObserver options
 * @param {Array} deps - Re-run observation when dynamic content appears
 */
export function useReveal(options = {}, deps = []) {
  const ref = useRef(null);
  const { threshold = 0.12, rootMargin = '0px 0px -40px 0px' } = options;
  const depsKey = JSON.stringify(deps);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const targets = el.querySelectorAll(
      '.reveal, .reveal-left, .reveal-right, .reveal-scale'
    );
    if (!targets.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target); // animate once
          }
        });
      },
      { threshold, rootMargin }
    );

    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, [threshold, rootMargin, depsKey]);

  return ref;
}
