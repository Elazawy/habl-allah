import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

const navLinks = [
  { label: 'اتصل بنا', href: '#' },
  { label: 'شروط الاستخدام', href: '#' },
  { label: 'سياسة الخصوصية', href: '#' },
  { label: 'عن المنصة', href: '#' },
];

const socials = [
  { icon: <ExternalLink size={18} />, href: '#', label: 'تويتر' },
  { icon: <ExternalLink size={18} />, href: '#', label: 'إنستغرام' },
  { icon: <ExternalLink size={18} />, href: '#', label: 'فيسبوك' },
];

export default function QuranFooter() {
  return (
    <footer
      style={{
        backgroundColor: 'var(--t-footer-bg)',
        borderTop: '1px solid var(--t-border)',
      }}
    >
      <div className="max-w-5xl mx-auto py-16 px-5 md:px-8">
        {/* Top row */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-10 mb-12">
          {/* Brand */}
          <div className="text-center md:text-right">
            <Link
              to="/quran"
              className="block text-3xl font-black mb-3"
              style={{ color: 'var(--t-primary)' }}
            >
              حبل الله
            </Link>
            <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'var(--t-text-muted)' }}>
              منصة رائدة تهدف لتقديم تعليم قرآني متميز يجمع بين الأصالة والتقنية الحديثة.
            </p>
          </div>

          {/* Nav links */}
          <nav className="flex flex-wrap justify-center gap-x-8 gap-y-3">
            {navLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="text-sm font-medium transition-colors duration-200 hover:opacity-100 opacity-60"
                style={{ color: 'var(--t-text)' }}
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>

        {/* Bottom row */}
        <div
          className="border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4"
          style={{ borderColor: 'var(--t-border)' }}
        >
          <p className="text-xs opacity-60" style={{ color: 'var(--t-text)' }}>
            © ٢٠٢٤ حبل الله . جميع الحقوق محفوظة.
          </p>

          {/* Social icons */}
          <div className="flex gap-4">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                aria-label={s.label}
                className="w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-200 hover:scale-110"
                style={{
                  borderColor: 'var(--t-border)',
                  color: 'var(--t-text-muted)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--t-primary)';
                  e.currentTarget.style.borderColor = 'var(--t-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--t-text-muted)';
                  e.currentTarget.style.borderColor = 'var(--t-border)';
                }}
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
