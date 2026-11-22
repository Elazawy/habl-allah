import {
  DEFAULT_LANGUAGE,
  LANGUAGE_LOCALE,
  SUPPORTED_LANGUAGES,
} from './config.js';
import {
  isAdminPath,
  normalizeLanguage,
  replaceLanguageInPath,
  stripLanguagePrefix,
} from './routing.js';

export const OG_LOCALE = Object.fromEntries(
  Object.entries(LANGUAGE_LOCALE).map(([lang, locale]) => [
    lang,
    locale.replace('-', '_'),
  ]),
);

const PRIVATE_STUDENT_PATHS = [
  '/quran/student/dashboard',
  '/quran/student/dashbaord',
  '/quran/student/lessons',
  '/quran/student/profile',
];

const MANAGED_ATTR = 'data-seo-managed';

function stripQueryAndHash(pathname = '/') {
  if (typeof pathname !== 'string' || !pathname) return '/';
  const [pathOnly] = pathname.split(/[?#]/);
  return pathOnly || '/';
}

function normalizePathname(pathname = '/') {
  const pathOnly = stripQueryAndHash(pathname);
  const withLeadingSlash = pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;
  if (withLeadingSlash === '/') return '/';
  const trimmed = withLeadingSlash.replace(/\/+$/, '');
  return trimmed || '/';
}

/**
 * Returns the Open Graph locale string (e.g. ar_EG, en_GB, tr_TR) for a language.
 */
export function getOgLocale(lang = DEFAULT_LANGUAGE) {
  const normalized = normalizeLanguage(lang);
  return OG_LOCALE[normalized] || OG_LOCALE[DEFAULT_LANGUAGE];
}

/**
 * Returns true if the pathname should be excluded from search engine indexing
 * (admin routes and private authenticated student routes).
 */
export function isNoIndexPath(pathname = '/') {
  if (typeof pathname !== 'string' || !pathname) return false;
  if (isAdminPath(pathname)) return true;

  const normalized = normalizePathname(stripLanguagePrefix(stripQueryAndHash(pathname)));
  return PRIVATE_STUDENT_PATHS.some(
    (privatePath) =>
      normalized === privatePath || normalized.startsWith(`${privatePath}/`),
  );
}

/**
 * Builds the canonical URL for indexable routes, stripping trailing slashes
 * (except root '/'). Returns null for admin or private noindex routes.
 */
export function buildCanonicalUrl(pathname = '/', origin = '') {
  if (isNoIndexPath(pathname)) return null;

  const cleanOrigin =
    typeof origin === 'string' ? origin.replace(/\/+$/, '') : '';
  const cleanPath = normalizePathname(pathname);
  return `${cleanOrigin}${cleanPath}`;
}

/**
 * Builds hreflang alternate link descriptors (ar, en, tr, x-default) for indexable
 * routes. Returns an empty array for admin or private noindex routes.
 */
export function buildAlternateLinks(pathname = '/', origin = '') {
  if (isNoIndexPath(pathname)) return [];

  const cleanOrigin =
    typeof origin === 'string' ? origin.replace(/\/+$/, '') : '';
  const cleanPath = normalizePathname(pathname);

  const links = SUPPORTED_LANGUAGES.map((lang) => {
    const localized = normalizePathname(replaceLanguageInPath(cleanPath, lang));
    return {
      hrefLang: lang,
      href: `${cleanOrigin}${localized}`,
    };
  });

  const defaultHref =
    links.find((link) => link.hrefLang === DEFAULT_LANGUAGE)?.href ||
    `${cleanOrigin}/`;

  return [
    ...links,
    {
      hrefLang: 'x-default',
      href: defaultHref,
    },
  ];
}

/**
 * Maps a URL pathname to its route key in the `seo` locale namespace (`routes.<key>`).
 */
export function matchRouteSeoKey(pathname = '/') {
  if (isAdminPath(pathname)) return 'admin';

  const normalized = normalizePathname(stripLanguagePrefix(stripQueryAndHash(pathname)));

  switch (normalized) {
    case '/':
      return 'home';
    case '/faq':
      return 'faq';
    case '/privacy-policy':
      return 'privacy';
    case '/terms':
      return 'terms';
    case '/quran':
      return 'quranHome';
    case '/quran/faq':
      return 'quranFaq';
    case '/quran/teachers':
      return 'chooseTeacher';
    case '/quran/teachers/male':
      return 'teachersMale';
    case '/quran/teachers/female':
      return 'teachersFemale';
    case '/quran/competitions':
      return 'competitions';
    case '/quran/courses':
      return 'courses';
    case '/quran/student/login':
      return 'studentLogin';
    case '/quran/student/signup':
      return 'studentSignup';
    case '/quran/student/dashboard':
    case '/quran/student/dashbaord':
      return 'studentDashboard';
    case '/quran/student/lessons':
      return 'studentLessons';
    case '/quran/student/profile':
      return 'studentProfile';
    default:
      break;
  }

  if (/^\/quran\/teachers\/[^/]+\/[^/]+$/.test(normalized)) {
    return 'teacherProfile';
  }
  if (/^\/quran\/competition\/[^/]+$/.test(normalized)) {
    return 'competitionDetail';
  }
  if (/^\/quran\/courses\/[^/]+\/watch(?:\/[^/]+)?$/.test(normalized)) {
    return 'courseWatch';
  }
  if (/^\/quran\/courses\/[^/]+$/.test(normalized)) {
    return 'courseDetail';
  }

  return 'default';
}

/**
 * Collapses whitespace/newlines and truncates text cleanly at a word boundary
 * with '…' when longer than maxLength.
 */
export function truncateMetaDescription(text, maxLength = 160) {
  if (typeof text !== 'string') return '';
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  if (maxLength <= 0) return '';
  if (normalized.length <= maxLength) return normalized;
  if (maxLength === 1) return '…';

  const limit = maxLength - 1;
  const slice = normalized.slice(0, limit + 1);
  const lastSpace = slice.lastIndexOf(' ');

  if (lastSpace > 0) {
    const truncated = normalized.slice(0, lastSpace).trimEnd();
    if (truncated) {
      return `${truncated}…`;
    }
  }

  return `${normalized.slice(0, limit).trimEnd()}…`;
}

/**
 * Strips basic Markdown syntax (headings, list bullets, bold, links) and
 * truncates the resulting prose for use in a meta description.
 */
export function extractMetaDescriptionFromMarkdown(markdown, maxLength = 160) {
  if (typeof markdown !== 'string') return '';
  const plain = markdown
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  return truncateMetaDescription(plain, maxLength);
}

function upsertMeta(attrName, attrValue, content) {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attrName}="${attrValue}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function removeManagedElements(selector) {
  const existing = document.head.querySelectorAll(selector);
  for (const el of existing) {
    el.remove();
  }
}

/**
 * Applies SEO metadata tags to document.head safely without creating duplicates.
 * Fields left undefined are preserved as-is so dynamic pages can override only
 * title and description without clearing canonical/alternate/locale tags.
 */
export function applyDocumentMeta({
  title,
  description,
  canonicalUrl,
  alternateLinks,
  ogLocale,
  noIndex,
} = {}) {
  if (typeof document === 'undefined' || !document.head) return;

  if (typeof title === 'string' && title.trim()) {
    const cleanTitle = title.trim();
    document.title = cleanTitle;
    upsertMeta('property', 'og:title', cleanTitle);
  }

  if (typeof description === 'string' && description.trim()) {
    const cleanDescription = description.trim();
    upsertMeta('name', 'description', cleanDescription);
    upsertMeta('property', 'og:description', cleanDescription);
  }

  if (typeof ogLocale === 'string' && ogLocale.trim()) {
    upsertMeta('property', 'og:locale', ogLocale.trim());
  }

  if (canonicalUrl !== undefined) {
    removeManagedElements(`link[rel="canonical"][${MANAGED_ATTR}="true"]`);
    if (canonicalUrl) {
      const canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      canonical.setAttribute('href', canonicalUrl);
      canonical.setAttribute(MANAGED_ATTR, 'true');
      document.head.appendChild(canonical);
      upsertMeta('property', 'og:url', canonicalUrl);
    } else {
      removeManagedElements('meta[property="og:url"]');
    }
  }

  if (alternateLinks !== undefined) {
    removeManagedElements(`link[rel="alternate"][${MANAGED_ATTR}="true"]`);
    if (Array.isArray(alternateLinks)) {
      for (const item of alternateLinks) {
        if (!item || !item.hrefLang || !item.href) continue;
        const link = document.createElement('link');
        link.setAttribute('rel', 'alternate');
        link.setAttribute('hreflang', item.hrefLang);
        link.setAttribute('href', item.href);
        link.setAttribute(MANAGED_ATTR, 'true');
        document.head.appendChild(link);
      }
    }
  }

  if (noIndex !== undefined) {
    if (noIndex) {
      let robots = document.head.querySelector(
        `meta[name="robots"][${MANAGED_ATTR}="true"]`,
      );
      if (!robots) {
        robots = document.createElement('meta');
        robots.setAttribute('name', 'robots');
        robots.setAttribute(MANAGED_ATTR, 'true');
        document.head.appendChild(robots);
      }
      robots.setAttribute('content', 'noindex, nofollow');
    } else {
      removeManagedElements(`meta[name="robots"][${MANAGED_ATTR}="true"]`);
    }
  }
}
