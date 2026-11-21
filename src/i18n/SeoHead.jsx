import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLanguage } from './hooks.js';
import {
  applyDocumentMeta,
  buildAlternateLinks,
  buildCanonicalUrl,
  getOgLocale,
  isNoIndexPath,
  matchRouteSeoKey,
} from './seo.js';

/**
 * Synchronizes route-level <title>, meta description, Open Graph tags,
 * canonical URL, hreflang alternates, and robots directives on navigation
 * and language changes. Must be mounted inside <BrowserRouter>.
 */
export default function SeoHead() {
  const { pathname } = useLocation();
  const { language } = useLanguage();
  const { t } = useTranslation('seo');

  useEffect(() => {
    const routeKey = matchRouteSeoKey(pathname);
    const noIndex = isNoIndexPath(pathname);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const canonicalUrl = noIndex ? null : buildCanonicalUrl(pathname, origin);
    const alternateLinks = noIndex ? [] : buildAlternateLinks(pathname, origin);
    const ogLocale = getOgLocale(language);

    const title = t(`routes.${routeKey}.title`, {
      defaultValue: t('routes.default.title'),
    });
    const description = t(`routes.${routeKey}.description`, {
      defaultValue: t('routes.default.description'),
    });

    applyDocumentMeta({
      title,
      description,
      canonicalUrl,
      alternateLinks,
      ogLocale,
      noIndex,
    });
  }, [pathname, language, t]);

  return null;
}
