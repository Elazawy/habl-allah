import { BookOpen, HelpCircle, Phone, Shield } from 'lucide-react';

export default function Footer() {
  const year = new Date().getFullYear();

  const links = [
    { icon: HelpCircle, label: 'الأسئلة الشائعة', href: '#' },
    { icon: Phone,      label: 'اتصل بنا',        href: '#' },
    { icon: Shield,     label: 'سياسة الخصوصية',  href: '#' },
  ];

  return (
    <footer className="bg-gradient-to-br from-emerald-950 to-emerald-900 text-emerald-100">
      {/* Top wave divider */}
      <div className="w-full overflow-hidden leading-none">
        <svg
          viewBox="0 0 1200 60"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          className="w-full h-12"
          style={{ fill: 'var(--t-bg-card)' }}
        >
          <path d="M0,0 C300,60 900,0 1200,50 L1200,0 L0,0 Z" />
        </svg>
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-6 pb-10">
        {/* Brand row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-400/20 border border-amber-400/30 rounded-xl flex items-center justify-center">
              <BookOpen size={20} className="text-amber-400" />
            </div>
            <div>
              <div className="font-black text-lg text-white leading-none">أكاديمية حبل الله</div>
              <div className="text-emerald-400 text-xs mt-0.5">القرآنية</div>
            </div>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-6 flex-wrap justify-center">
            {links.map(({ icon: Icon, label, href }) => (
              <a
                key={label}
                href={href}
                className="flex items-center gap-1.5 text-emerald-300 hover:text-amber-400 text-sm transition-colors duration-200"
              >
                <Icon size={14} />
                {label}
              </a>
            ))}
          </nav>
        </div>

        {/* Divider */}
        <div className="border-t border-emerald-800 pt-6 text-center">
          <p className="text-emerald-400 text-sm">
            © {year} أكاديمية حبل الله القرآني. جميع الحقوق محفوظة.
          </p>
        </div>
      </div>
    </footer>
  );
}
