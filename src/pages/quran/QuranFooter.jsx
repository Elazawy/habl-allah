import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

// WhatsApp SVG icon
function WhatsAppIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.886 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

const navLinks = [
  { label: 'اتصل بنا', href: '#' },
  { label: 'شروط الاستخدام', href: '#' },
  { label: 'سياسة الخصوصية', href: '#' },
  { label: 'عن المنصة', href: '#' },
];

const socials = [
  { icon: <WhatsAppIcon size={18} />, href: 'https://api.whatsapp.com/send?phone=201101452585&text=السلام عليكم ورحمة الله وبركاته، ارغب في الاشتراك في حفظ القرآن الكريم، ارغب في معرفة التفاصيل', label: 'واتساب' },
];

export default function QuranFooter() {
  return (
    <footer style={{ backgroundColor: 'var(--t-footer-surface)', borderTop: '1px solid var(--t-footer-border)' }}>
      <div className="max-w-5xl mx-auto py-16 px-5 md:px-8">
        {/* Top row */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-10 mb-12">
          {/* Brand */}
          <div className="text-center md:text-right">
            <Link
              to="/quran"
              className="block text-3xl font-black mb-3"
              style={{ color: 'var(--t-footer-brand)' }}
            >
              حبل الله
            </Link>
            <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'var(--t-footer-text)' }}>
              منصة رائدة تهدف لتقديم تعليم قرآني متميز يجمع بين الأصالة والتقنية الحديثة.
            </p>
          </div>

          {/* Nav links */}
          <nav className="flex flex-wrap justify-center gap-x-8 gap-y-3">
            {navLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="text-sm font-medium transition-opacity duration-200 hover:opacity-100"
                style={{ color: 'var(--t-footer-link)', opacity: 0.7 }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>

        {/* Divider */}
        <div style={{ height: 1, backgroundColor: 'var(--t-footer-border)', marginBottom: '2rem' }} />

        {/* Bottom row */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* WhatsApp icon */}
          <div className="flex gap-4">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                aria-label={s.label}
                className="w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-200 hover:scale-110"
                style={{
                  borderColor: 'var(--t-footer-border)',
                  color: 'var(--t-footer-text)',
                  backgroundColor: 'var(--t-footer-icon-bg)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#25D366';
                  e.currentTarget.style.borderColor = '#25D366';
                  e.currentTarget.style.backgroundColor = 'rgba(37,211,102,0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--t-footer-text)';
                  e.currentTarget.style.borderColor = 'var(--t-footer-border)';
                  e.currentTarget.style.backgroundColor = 'var(--t-footer-icon-bg)';
                }}
              >
                {s.icon}
              </a>
            ))}
          </div>

          <p className="text-xs" style={{ color: 'var(--t-footer-text)', opacity: 0.55 }}>
            © ٢٠٢٤ حبل الله . جميع الحقوق محفوظة.
          </p>
        </div>
      </div>
    </footer>
  );
}
