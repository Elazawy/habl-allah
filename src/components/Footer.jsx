import { HelpCircle, Phone, Shield, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import logoGold from '../assets/logo-gold.png';
import LanguageSwitcher from './LanguageSwitcher';
import { LocalizedLink } from '../i18n';

export default function Footer() {
  const { t } = useTranslation('common');
  const year = new Date().getFullYear();

  const links = [
    { icon: HelpCircle, label: t('footer.faq'), href: '/faq', isRoute: true },
    { icon: Phone, label: t('footer.contactUs'), href: 'https://api.whatsapp.com/send?phone=201024744963' },
    { icon: Shield, label: t('footer.privacyPolicy'), href: '/privacy-policy', isRoute: true },
    { icon: FileText, label: t('footer.termsOfUse'), href: '/terms', isRoute: true },
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
              alt={t('brand.logoAlt')}
              className="w-11 h-11 rounded-xl object-contain"
            />
            <div>
              <div className="font-black text-lg text-white leading-none">
                {t('brand.academyName')}
              </div>
              <div className="text-emerald-400 text-xs mt-0.5">
                {t('brand.quranicSubtitle')}
              </div>
            </div>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-6 flex-wrap justify-center">
            {links.map(({ icon: Icon, label, href, isRoute }) =>
              isRoute ? (
                <LocalizedLink
                  key={href}
                  to={href}
                  className="flex items-center gap-1.5 text-emerald-300 hover:text-amber-400 text-sm transition-colors duration-200"
                >
                  <Icon size={14} />
                  {label}
                </LocalizedLink>
              ) : (
                <a
                  key={href}
                  href={href}
                  className="flex items-center gap-1.5 text-emerald-300 hover:text-amber-400 text-sm transition-colors duration-200"
                >
                  <Icon size={14} />
                  {label}
                </a>
              ),
            )}
          </nav>
        </div>

        {/* Divider */}
        <div className="border-t border-emerald-800 pt-6 flex flex-col items-center gap-3 text-center">
          <LanguageSwitcher variant="compact" tone="emerald" />
          <p className="text-emerald-400 text-sm">
            {t('footer.copyright', { year })}
          </p>
        </div>
      </div>
    </footer>
  );
}
