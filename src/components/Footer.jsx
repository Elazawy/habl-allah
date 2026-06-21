import { HelpCircle, Phone, Shield, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import logoGold from '../assets/logo-gold.png';

export default function Footer() {
  const year = new Date().getFullYear();

  const links = [
    { icon: HelpCircle, label: 'الأسئلة الشائعة', href: '/faq', isRoute: true },
    { icon: Phone,      label: 'اتصل بنا', href: 'https://api.whatsapp.com/send?phone=201024744963' },
    { icon: Shield,     label: 'سياسة الخصوصية',  href: '/privacy-policy', isRoute: true },
    { icon: FileText,   label: 'شروط الاستخدام',  href: '/terms', isRoute: true },
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
            <img
              src={logoGold}
              alt="شعار حبل الله"
              className="w-11 h-11 rounded-xl object-contain"
            />
            <div>
              <div className="font-black text-lg text-white leading-none">أكاديمية حبل الله</div>
              <div className="text-emerald-400 text-xs mt-0.5">القرآنية</div>
            </div>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-6 flex-wrap justify-center">
            {links.map(({ icon: Icon, label, href, isRoute }) =>
              isRoute ? (
                <Link
                  key={label}
                  to={href}
                  className="flex items-center gap-1.5 text-emerald-300 hover:text-amber-400 text-sm transition-colors duration-200"
                >
                  <Icon size={14} />
                  {label}
                </Link>
              ) : (
                <a
                  key={label}
                  href={href}
                  className="flex items-center gap-1.5 text-emerald-300 hover:text-amber-400 text-sm transition-colors duration-200"
                >
                  <Icon size={14} />
                  {label}
                </a>
              )
            )}
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
