import { useEffect, useRef, useState } from 'react';
import { X, Loader2, ExternalLink } from 'lucide-react';
import { WHATSAPP_NUMBER } from '../../lib/constants';
import { submitSubscriptionRequest } from '../../services/teachersService';
import { prepareStudentRequest } from '../../lib/studentRequestValidation';

/**
 * Opens the WhatsApp tab synchronously, while the submit click still counts as
 * a user gesture. The save below is async; opening after it would be blocked by
 * popup blockers in most browsers.
 *
 * `noopener` is passed to window.open only when we don't need a handle. Here we
 * need one to navigate after saving, so we sever `opener` immediately instead.
 */
function openWhatsAppTarget() {
  try {
    const target = window.open('about:blank', '_blank');
    if (target) {
      try {
        target.opener = null;
      } catch {
        // Some browsers refuse the assignment; the target itself is still usable.
      }
    }
    return target;
  } catch {
    return null;
  }
}

/** Navigate the prepared target. Same-tab fallback is only for a blocked popup. */
function navigateToWhatsApp(target, url) {
  // `window.open` returning null is the only signal that the popup was blocked.
  if (!target) {
    window.location.assign(url);
    return;
  }

  // A real target that the user closed is their decision. Never hijack the
  // current tab as a fallback in that case.
  if (target.closed) return;

  try {
    target.location.replace(url);
  } catch {
    // The target can disappear between the check and navigation. Do not fall
    // back to the current tab; close a surviving blank target instead.
    try {
      target.close();
    } catch {
      // Already closed.
    }
  }
}

/**
 * SubscribeModal
 * ─────────────
 * Small modal that collects student name + WhatsApp number,
 * saves both server-side, then redirects to WhatsApp with a
 * message containing ONLY the teacher name + student name
 * (phone number is NOT included in the WA message — it's stored
 *  for academy follow-up if the student doesn't complete the WA send).
 */
export default function SubscribeModal({ teacher, onClose }) {
  const [values, setValues] = useState({ student_name: '', whatsapp: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const submitting = useRef(false);
  const panelRef = useRef(null);
  const whatsappTargetRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const mountedRef = useRef(true);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Basic dialog behavior: Escape closes, Tab stays inside, background scroll is locked.
  useEffect(() => {
    mountedRef.current = true;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    panel?.querySelector('#sub-student-name')?.focus();

    function getFocusableElements() {
      if (!panel) return [];
      return [...panel.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )];
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!panel?.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      mountedRef.current = false;
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;

      // A pending blank tab is closed if the modal goes away before the save
      // finishes, so we never leave an un-navigated tab behind.
      const pendingTarget = whatsappTargetRef.current;
      whatsappTargetRef.current = null;
      if (pendingTarget && !pendingTarget.closed) {
        try {
          pendingTarget.close();
        } catch {
          // The browser may already have closed it.
        }
      }

      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);

  function handleChange(e) {
    setValues((v) => ({ ...v, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting.current) return;
    let contact;
    try {
      contact = prepareStudentRequest(values);
    } catch (validationError) {
      setError(validationError.message);
      return;
    }

    submitting.current = true;
    setLoading(true);
    setError('');

    // Build WhatsApp message: teacher name + student name only
    const message = `مرحباً، أود الاشتراك مع ${teacher.name}.\nالاسم: ${contact.student_name}`;
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

    // Must happen before the await to stay inside the click's user activation.
    const target = openWhatsAppTarget();
    whatsappTargetRef.current = target;

    try {
      // Save to backend (WhatsApp number stored for follow-up — NOT sent in message)
      await submitSubscriptionRequest({
        teacher_id:   teacher.id,
        teacher_name: teacher.name,
        ...contact,
      });
    } catch {
      // Non-blocking — still open WhatsApp even if save fails.
    } finally {
      if (mountedRef.current) setLoading(false);
    }

    if (!mountedRef.current) return;

    whatsappTargetRef.current = null;
    navigateToWhatsApp(target, whatsappUrl);
    onClose();
  }

  const inputStyle = {
    backgroundColor: 'var(--t-input-bg)',
    color: 'var(--t-text)',
    borderColor: 'var(--t-border)',
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      aria-modal="true"
      role="dialog"
      aria-label="طلب اشتراك"
    >
      {/* Panel */}
      <div
        ref={panelRef}
        className="w-full max-w-md rounded-3xl p-8 relative"
        style={{
          backgroundColor: 'var(--t-bg-card)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          id="subscribe-modal-close"
          className="absolute top-5 left-5 p-2 rounded-full transition-colors hover:opacity-70"
          style={{ color: 'var(--t-text-muted)' }}
          aria-label="إغلاق"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: 'var(--t-primary-light)' }}
          >
            <ExternalLink size={24} style={{ color: 'var(--t-primary)' }} />
          </div>
          <h2 className="text-xl font-black mb-1" style={{ color: 'var(--t-text)' }}>
            طلب اشتراك
          </h2>
          <p className="text-sm" style={{ color: 'var(--t-text-muted)' }}>
            مع <span className="font-bold" style={{ color: 'var(--t-primary)' }}>{teacher.name}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Teacher name — read only */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--t-text-subtle)' }}>
              المعلم
            </label>
            <div
              className="w-full rounded-xl px-4 py-3 text-sm border font-semibold"
              style={{ ...inputStyle, opacity: 0.75, cursor: 'default' }}
            >
              {teacher.name}
            </div>
          </div>

          {/* Student name */}
          <div>
            <label
              htmlFor="sub-student-name"
              className="block text-xs font-semibold mb-1.5"
              style={{ color: 'var(--t-text-muted)' }}
            >
              اسمك <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              id="sub-student-name"
              name="student_name"
              type="text"
              required
              maxLength={200}
              autoComplete="name"
              placeholder="اكتب اسمك الكامل…"
              value={values.student_name}
              onChange={handleChange}
              className="w-full rounded-xl px-4 py-3 text-sm border outline-none transition-all duration-200 focus:ring-2"
              style={inputStyle}
            />
          </div>

          {/* WhatsApp */}
          <div>
            <label
              htmlFor="sub-whatsapp"
              className="block text-xs font-semibold mb-1.5"
              style={{ color: 'var(--t-text-muted)' }}
            >
              رقم واتساب <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              id="sub-whatsapp"
              name="whatsapp"
              type="tel"
              required
              maxLength={30}
              autoComplete="tel"
              placeholder="مثال: 01012345678"
              value={values.whatsapp}
              onChange={handleChange}
              className="w-full rounded-xl px-4 py-3 text-sm border outline-none transition-all duration-200 focus:ring-2"
              style={inputStyle}
              dir="ltr"
            />
            <p className="text-[11px] mt-1.5" style={{ color: 'var(--t-text-subtle)' }}>
              للمتابعة من فريق الأكاديمية. أضف رمز الدولة إذا كان رقمك خارج مصر.
            </p>
          </div>

          {/* Error */}
          {error && (
            <p role="alert" className="text-xs text-center font-semibold" style={{ color: '#ef4444' }}>
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            id="subscribe-submit-btn"
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-xl py-3.5 font-bold text-base flex items-center justify-center gap-2 transition-all duration-300 hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
            style={{ backgroundColor: 'var(--t-primary)', color: '#ffffff' }}
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              /* WhatsApp icon */
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.122.555 4.116 1.528 5.847L.057 23.213a.75.75 0 0 0 .93.93l5.366-1.471A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.732 9.732 0 0 1-5.26-1.534l-.377-.224-3.912 1.072 1.072-3.912-.224-.377A9.732 9.732 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
              </svg>
            )}
            {loading ? 'جارٍ الإرسال…' : 'طلب اشتراك مع المعلم'}
          </button>
        </form>
      </div>
    </div>
  );
}
