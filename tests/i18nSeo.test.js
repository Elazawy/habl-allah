import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  OG_LOCALE,
  applyDocumentMeta,
  buildAlternateLinks,
  buildCanonicalUrl,
  extractMetaDescriptionFromMarkdown,
  getOgLocale,
  isNoIndexPath,
  matchRouteSeoKey,
  truncateMetaDescription,
} from '../src/i18n/seo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

test('OG_LOCALE and getOgLocale map supported languages and normalize variants', () => {
  assert.deepEqual(OG_LOCALE, {
    ar: 'ar_EG',
    en: 'en_GB',
    tr: 'tr_TR',
  });
  assert.equal(getOgLocale('ar'), 'ar_EG');
  assert.equal(getOgLocale('en-US'), 'en_GB');
  assert.equal(getOgLocale('tr-TR'), 'tr_TR');
  assert.equal(getOgLocale('fr'), 'ar_EG');
  assert.equal(getOgLocale(undefined), 'ar_EG');
});

test('isNoIndexPath identifies admin and private student routes across prefixes', () => {
  // Admin routes
  assert.equal(isNoIndexPath('/admin'), true);
  assert.equal(isNoIndexPath('/admin/login'), true);
  assert.equal(isNoIndexPath('/admin/quran/courses'), true);
  assert.equal(isNoIndexPath('/en/admin'), true);
  assert.equal(isNoIndexPath('/tr/admin/quran'), true);

  // Private student routes
  assert.equal(isNoIndexPath('/quran/student/dashboard'), true);
  assert.equal(isNoIndexPath('/quran/student/dashbaord'), true);
  assert.equal(isNoIndexPath('/quran/student/lessons'), true);
  assert.equal(isNoIndexPath('/quran/student/profile'), true);
  assert.equal(isNoIndexPath('/en/quran/student/dashboard/'), true);
  assert.equal(isNoIndexPath('/tr/quran/student/lessons'), true);
  assert.equal(isNoIndexPath('/tr/quran/student/profile?tab=1'), true);

  // Public routes (including student auth pages)
  assert.equal(isNoIndexPath('/'), false);
  assert.equal(isNoIndexPath('/en'), false);
  assert.equal(isNoIndexPath('/tr/quran'), false);
  assert.equal(isNoIndexPath('/quran/courses'), false);
  assert.equal(isNoIndexPath('/quran/student/login'), false);
  assert.equal(isNoIndexPath('/en/quran/student/signup'), false);
  assert.equal(isNoIndexPath('/administrator'), false);
  assert.equal(isNoIndexPath(''), false);
});

test('buildCanonicalUrl normalizes trailing slashes, joins origin, and returns null for noindex paths', () => {
  assert.equal(buildCanonicalUrl('/', 'https://hablallah.com'), 'https://hablallah.com/');
  assert.equal(buildCanonicalUrl('/', 'https://hablallah.com/'), 'https://hablallah.com/');
  assert.equal(buildCanonicalUrl('/en', 'https://hablallah.com'), 'https://hablallah.com/en');
  assert.equal(buildCanonicalUrl('/en/', 'https://hablallah.com'), 'https://hablallah.com/en');
  assert.equal(
    buildCanonicalUrl('/tr/quran/courses/', 'https://hablallah.com/'),
    'https://hablallah.com/tr/quran/courses',
  );
  assert.equal(buildCanonicalUrl('/quran/faq?x=1#top', 'https://hablallah.com'), 'https://hablallah.com/quran/faq');
  assert.equal(buildCanonicalUrl('/quran/courses/'), '/quran/courses');

  // Admin & private student paths return null
  assert.equal(buildCanonicalUrl('/admin/login', 'https://hablallah.com'), null);
  assert.equal(buildCanonicalUrl('/en/admin/quran', 'https://hablallah.com'), null);
  assert.equal(buildCanonicalUrl('/quran/student/dashboard', 'https://hablallah.com'), null);
  assert.equal(buildCanonicalUrl('/tr/quran/student/profile', 'https://hablallah.com'), null);
});

test('buildAlternateLinks returns ar, en, tr, and x-default for public routes and [] for admin/private routes', () => {
  const origin = 'https://hablallah.com';

  assert.deepEqual(buildAlternateLinks('/', origin), [
    { hrefLang: 'ar', href: 'https://hablallah.com/' },
    { hrefLang: 'en', href: 'https://hablallah.com/en' },
    { hrefLang: 'tr', href: 'https://hablallah.com/tr' },
    { hrefLang: 'x-default', href: 'https://hablallah.com/' },
  ]);

  assert.deepEqual(buildAlternateLinks('/en/', origin), [
    { hrefLang: 'ar', href: 'https://hablallah.com/' },
    { hrefLang: 'en', href: 'https://hablallah.com/en' },
    { hrefLang: 'tr', href: 'https://hablallah.com/tr' },
    { hrefLang: 'x-default', href: 'https://hablallah.com/' },
  ]);

  assert.deepEqual(buildAlternateLinks('/tr/quran/courses/tajweed/', origin), [
    { hrefLang: 'ar', href: 'https://hablallah.com/quran/courses/tajweed' },
    { hrefLang: 'en', href: 'https://hablallah.com/en/quran/courses/tajweed' },
    { hrefLang: 'tr', href: 'https://hablallah.com/tr/quran/courses/tajweed' },
    { hrefLang: 'x-default', href: 'https://hablallah.com/quran/courses/tajweed' },
  ]);

  // Admin and private student pages must not emit alternate links
  assert.deepEqual(buildAlternateLinks('/admin', origin), []);
  assert.deepEqual(buildAlternateLinks('/admin/quran/courses', origin), []);
  assert.deepEqual(buildAlternateLinks('/en/admin/login', origin), []);
  assert.deepEqual(buildAlternateLinks('/quran/student/dashboard', origin), []);
  assert.deepEqual(buildAlternateLinks('/en/quran/student/dashbaord', origin), []);
  assert.deepEqual(buildAlternateLinks('/tr/quran/student/lessons', origin), []);
  assert.deepEqual(buildAlternateLinks('/quran/student/profile', origin), []);
});

test('matchRouteSeoKey resolves static, parameterized, localized, and admin routes', () => {
  assert.equal(matchRouteSeoKey('/'), 'home');
  assert.equal(matchRouteSeoKey('/en'), 'home');
  assert.equal(matchRouteSeoKey('/tr/'), 'home');
  assert.equal(matchRouteSeoKey('/faq'), 'faq');
  assert.equal(matchRouteSeoKey('/en/privacy-policy/'), 'privacy');
  assert.equal(matchRouteSeoKey('/tr/terms'), 'terms');

  assert.equal(matchRouteSeoKey('/quran'), 'quranHome');
  assert.equal(matchRouteSeoKey('/en/quran/faq'), 'quranFaq');
  assert.equal(matchRouteSeoKey('/quran/teachers'), 'chooseTeacher');
  assert.equal(matchRouteSeoKey('/tr/quran/teachers/male'), 'teachersMale');
  assert.equal(matchRouteSeoKey('/en/quran/teachers/female/'), 'teachersFemale');
  assert.equal(matchRouteSeoKey('/quran/teachers/male/42'), 'teacherProfile');
  assert.equal(matchRouteSeoKey('/tr/quran/teachers/female/19'), 'teacherProfile');

  assert.equal(matchRouteSeoKey('/quran/competitions'), 'competitions');
  assert.equal(matchRouteSeoKey('/en/quran/competition/ramadan-2026'), 'competitionDetail');

  assert.equal(matchRouteSeoKey('/quran/courses'), 'courses');
  assert.equal(matchRouteSeoKey('/en/quran/courses/tajweed-basics'), 'courseDetail');
  assert.equal(matchRouteSeoKey('/quran/courses/tajweed-basics/watch'), 'courseWatch');
  assert.equal(matchRouteSeoKey('/tr/quran/courses/tajweed-basics/watch/lesson-1'), 'courseWatch');

  assert.equal(matchRouteSeoKey('/quran/student/login'), 'studentLogin');
  assert.equal(matchRouteSeoKey('/en/quran/student/signup'), 'studentSignup');
  assert.equal(matchRouteSeoKey('/quran/student/dashboard'), 'studentDashboard');
  assert.equal(matchRouteSeoKey('/quran/student/dashbaord'), 'studentDashboard');
  assert.equal(matchRouteSeoKey('/tr/quran/student/lessons'), 'studentLessons');
  assert.equal(matchRouteSeoKey('/en/quran/student/profile'), 'studentProfile');

  assert.equal(matchRouteSeoKey('/admin'), 'admin');
  assert.equal(matchRouteSeoKey('/admin/quran/users/1'), 'admin');
  assert.equal(matchRouteSeoKey('/en/admin/login'), 'admin');

  assert.equal(matchRouteSeoKey('/unknown/route/here'), 'default');
});

test('truncateMetaDescription collapses whitespace and truncates cleanly at word boundary', () => {
  assert.equal(truncateMetaDescription(''), '');
  assert.equal(truncateMetaDescription('   \n\t  '), '');
  assert.equal(truncateMetaDescription(null), '');

  assert.equal(
    truncateMetaDescription('  Hello\n  world   from\tHabl Allah  ', 100),
    'Hello world from Habl Allah',
  );

  // Word boundary with space right at limit
  assert.equal(truncateMetaDescription('Hello world foo bar', 12), 'Hello world…');

  // Word boundary before limit
  assert.equal(truncateMetaDescription('Hello world foo bar', 11), 'Hello…');

  // Single long word without spaces
  assert.equal(truncateMetaDescription('Supercalifragilistic', 10), 'Supercali…');

  // Default 160-char ceiling
  const longSentence = Array.from({ length: 40 }, () => 'word').join(' ');
  const truncated = truncateMetaDescription(longSentence);
  assert.ok(truncated.length <= 160);
  assert.ok(truncated.endsWith('…'));
  assert.ok(!truncated.endsWith(' …'));
});

test('extractMetaDescriptionFromMarkdown strips markdown formatting before truncating', () => {
  const md = '# Privacy Policy\n\n## Data Collection\n- **Email** and [name](https://example.com) are protected.\n';
  assert.equal(
    extractMetaDescriptionFromMarkdown(md, 160),
    'Privacy Policy Data Collection Email and name are protected.',
  );
  assert.equal(extractMetaDescriptionFromMarkdown(null), '');
});

test('applyDocumentMeta is a safe no-op without document and manages head tags cleanly with DOM', () => {
  // No document in Node environment: must not throw
  assert.doesNotThrow(() => {
    applyDocumentMeta({
      title: 'Test',
      description: 'Desc',
      canonicalUrl: 'https://hablallah.com/',
      alternateLinks: [{ hrefLang: 'ar', href: 'https://hablallah.com/' }],
      ogLocale: 'ar_EG',
      noIndex: false,
    });
  });

  // Minimal DOM mock to verify idempotency and partial updates
  function createMockElement(tagName) {
    const attrs = new Map();
    return {
      tagName: tagName.toUpperCase(),
      attrs,
      setAttribute(name, value) {
        attrs.set(name, String(value));
      },
      getAttribute(name) {
        return attrs.get(name) ?? null;
      },
      remove() {
        const idx = headChildren.indexOf(this);
        if (idx !== -1) headChildren.splice(idx, 1);
      },
    };
  }

  function matchesSelector(el, selector) {
    const tagMatch = selector.match(/^([a-z]+)/i);
    if (tagMatch && el.tagName !== tagMatch[1].toUpperCase()) return false;
    for (const [, attr, val] of selector.matchAll(/\[([^=\]]+)="([^"]+)"\]/g)) {
      if (el.getAttribute(attr) !== val) return false;
    }
    return true;
  }

  const headChildren = [
    (() => {
      const el = createMockElement('meta');
      el.setAttribute('name', 'description');
      el.setAttribute('content', 'Initial');
      return el;
    })(),
  ];

  const mockDocument = {
    title: 'Initial',
    head: {
      appendChild(el) {
        headChildren.push(el);
      },
      querySelector(selector) {
        return headChildren.find((el) => matchesSelector(el, selector)) ?? null;
      },
      querySelectorAll(selector) {
        return headChildren.filter((el) => matchesSelector(el, selector));
      },
    },
    createElement: createMockElement,
  };

  const prevDocument = globalThis.document;
  globalThis.document = mockDocument;
  try {
    // 1. Public route update
    applyDocumentMeta({
      title: 'Courses — Habl Allah',
      description: 'Explore Quran courses.',
      canonicalUrl: 'https://hablallah.com/en/quran/courses',
      alternateLinks: buildAlternateLinks('/en/quran/courses', 'https://hablallah.com'),
      ogLocale: 'en_GB',
      noIndex: false,
    });

    assert.equal(mockDocument.title, 'Courses — Habl Allah');
    assert.equal(
      mockDocument.head.querySelector('meta[name="description"]').getAttribute('content'),
      'Explore Quran courses.',
    );
    assert.equal(
      mockDocument.head.querySelector('meta[property="og:locale"]').getAttribute('content'),
      'en_GB',
    );
    assert.equal(
      mockDocument.head.querySelector('meta[property="og:url"]').getAttribute('content'),
      'https://hablallah.com/en/quran/courses',
    );
    assert.equal(mockDocument.head.querySelectorAll('link[rel="canonical"]').length, 1);
    assert.equal(mockDocument.head.querySelectorAll('link[rel="alternate"]').length, 4);
    assert.equal(mockDocument.head.querySelector('meta[name="robots"]'), null);

    // 2. Partial override (usePageMeta) preserves canonical, alternates, and og:locale
    applyDocumentMeta({
      title: 'Tajweed 101 — Habl Allah Academy',
      description: 'Master Tajweed rules.',
    });
    assert.equal(mockDocument.title, 'Tajweed 101 — Habl Allah Academy');
    assert.equal(
      mockDocument.head.querySelector('meta[property="og:title"]').getAttribute('content'),
      'Tajweed 101 — Habl Allah Academy',
    );
    assert.equal(
      mockDocument.head.querySelector('meta[property="og:description"]').getAttribute('content'),
      'Master Tajweed rules.',
    );
    assert.equal(mockDocument.head.querySelectorAll('link[rel="canonical"]').length, 1);
    assert.equal(mockDocument.head.querySelectorAll('link[rel="alternate"]').length, 4);

    // 3. Navigating to admin removes canonical, og:url, alternates, and adds noindex, nofollow
    applyDocumentMeta({
      title: 'Admin — Habl Allah',
      description: 'Admin portal',
      canonicalUrl: null,
      alternateLinks: [],
      ogLocale: 'ar_EG',
      noIndex: true,
    });
    assert.equal(mockDocument.head.querySelectorAll('link[rel="canonical"]').length, 0);
    assert.equal(mockDocument.head.querySelectorAll('link[rel="alternate"]').length, 0);
    assert.equal(mockDocument.head.querySelector('meta[property="og:url"]'), null);
    assert.equal(
      mockDocument.head.querySelector('meta[name="robots"]').getAttribute('content'),
      'noindex, nofollow',
    );

    // 4. Navigating back to public removes robots noindex and avoids duplicate tags
    applyDocumentMeta({
      title: 'Home',
      description: 'Home desc',
      canonicalUrl: 'https://hablallah.com/',
      alternateLinks: buildAlternateLinks('/', 'https://hablallah.com'),
      ogLocale: 'ar_EG',
      noIndex: false,
    });
    assert.equal(mockDocument.head.querySelector('meta[name="robots"]'), null);
    assert.equal(mockDocument.head.querySelectorAll('link[rel="canonical"]').length, 1);
    assert.equal(mockDocument.head.querySelectorAll('link[rel="alternate"]').length, 4);
  } finally {
    globalThis.document = prevDocument;
  }
});

test('all route keys produced by matchRouteSeoKey exist in ar, en, and tr seo.json', () => {
  const samplePaths = [
    '/unknown',
    '/admin',
    '/',
    '/faq',
    '/privacy-policy',
    '/terms',
    '/quran',
    '/quran/faq',
    '/quran/teachers',
    '/quran/teachers/male',
    '/quran/teachers/female',
    '/quran/teachers/male/1',
    '/quran/competitions',
    '/quran/competition/slug',
    '/quran/courses',
    '/quran/courses/slug',
    '/quran/courses/slug/watch',
    '/quran/student/login',
    '/quran/student/signup',
    '/quran/student/dashboard',
    '/quran/student/lessons',
    '/quran/student/profile',
  ];

  const routeKeys = [...new Set(samplePaths.map((p) => matchRouteSeoKey(p)))];
  for (const lang of ['ar', 'en', 'tr']) {
    const seoJson = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, 'src/locales', lang, 'seo.json'), 'utf8'),
    );
    for (const key of routeKeys) {
      assert.ok(seoJson.routes?.[key]?.title, `Missing ${lang}/seo.json routes.${key}.title`);
      assert.ok(
        seoJson.routes?.[key]?.description,
        `Missing ${lang}/seo.json routes.${key}.description`,
      );
    }
  }
});
