import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { localizePath, normalizeLanguage } from './routing.js';

function resolveLocalizedTo(to, lang) {
  if (typeof to === 'string') {
    return localizePath(to, lang);
  }
  if (to && typeof to === 'object' && typeof to.pathname === 'string') {
    return {
      ...to,
      pathname: localizePath(to.pathname, lang),
    };
  }
  return to;
}

/**
 * Drop-in wrapper around react-router-dom's Link that prefixes internal paths
 * with the active language (/en, /tr) while leaving Arabic, /admin, hashes,
 * and external URLs unchanged.
 */
export function LocalizedLink({ to, ...props }) {
  const { i18n } = useTranslation();
  const lang = normalizeLanguage(i18n.language);
  return <Link to={resolveLocalizedTo(to, lang)} {...props} />;
}

/**
 * Drop-in wrapper around react-router-dom's NavLink with localized `to`.
 */
export function LocalizedNavLink({ to, ...props }) {
  const { i18n } = useTranslation();
  const lang = normalizeLanguage(i18n.language);
  return <NavLink to={resolveLocalizedTo(to, lang)} {...props} />;
}

/**
 * Mirrors directional Lucide icons (ArrowLeft/Right, ChevronLeft/Right, LogIn/Out, etc.)
 * automatically based on document reading direction.
 *
 * By default `flipIn="rtl"`: pass the LTR-oriented icon (e.g. ArrowRight for "forward",
 * ArrowLeft for "back") and it flips horizontally in RTL. Pass `flipIn="ltr"` when
 * wrapping an icon already chosen for RTL orientation.
 */
export function DirectionalIcon({
  icon: Icon,
  flipIn = 'rtl',
  className = '',
  ...props
}) {
  const flipClass = flipIn === 'ltr' ? 'ltr:-scale-x-100' : 'rtl:-scale-x-100';
  return <Icon className={`${flipClass} ${className}`.trim()} {...props} />;
}
