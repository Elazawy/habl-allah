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
    <footer style={{ backgroundColor: '#f9faf7', borderTop: '1px solid rgba(192,201,195,0.4)' }}>
      <div className="max-w-5xl mx-auto py-16 px-5 md:px-8">
        {/* Top row */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-10 mb-12">
          {/* Brand */}
          <div className="text-center md:text-right">
            <Link
              to="/quran"
              className="block text-3xl font-black mb-3"
              style={{ color: '#1B4D3E' }}
            >
              حبل الله
            </Link>
            <p className="text-sm leading-relaxed max-w-xs" style={{ color: '#404945' }}>
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
                style={{ color: '#191c1b' }}
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>

        {/* Bottom row */}
        <div
          className="border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4"
          style={{ borderColor: 'rgba(192,201,195,0.25)' }}
        >
          <p className="text-xs opacity-60" style={{ color: '#191c1b' }}>
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
                  borderColor: 'rgba(192,201,195,0.4)',
                  color: '#404945',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#1B4D3E'; e.currentTarget.style.borderColor = '#1B4D3E'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#404945'; e.currentTarget.style.borderColor = 'rgba(192,201,195,0.4)'; }}
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
