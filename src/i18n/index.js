import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_DIR,
  SUPPORTED_LANGUAGES,
} from './config.js';
import { getLanguageFromPath } from './routing.js';

let localeModules;
try {
  localeModules = import.meta.glob('../locales/*/*.json', { eager: true });
} catch {
  localeModules = {};
}

const resources = {};
const namespacesSet = new Set(['common']);

for (const [filePath, module] of Object.entries(localeModules)) {
  const match = filePath.match(/\.\.\/locales\/([^/]+)\/([^/]+)\.json$/);
  if (!match) continue;
  const [, lang, namespace] = match;
  if (!resources[lang]) {
    resources[lang] = {};
  }
  resources[lang][namespace] = module.default ?? module;
  namespacesSet.add(namespace);
}

const namespaces = Array.from(namespacesSet);

const initialLanguage =
  typeof window !== 'undefined'
    ? getLanguageFromPath(window.location.pathname)
    : DEFAULT_LANGUAGE;

if (typeof document !== 'undefined') {
  document.documentElement.lang = initialLanguage;
  document.documentElement.dir = LANGUAGE_DIR[initialLanguage] || 'rtl';
}

i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: SUPPORTED_LANGUAGES,
  ns: namespaces,
  defaultNS: 'common',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export default i18n;

export * from './config.js';
export * from './routing.js';
export * from './content.js';
export * from './seo.js';
export * from './hooks.js';
export { default as LanguageSync } from './LanguageSync.jsx';
export { default as SeoHead } from './SeoHead.jsx';
