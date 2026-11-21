const TABS = [
  {
    code: 'ar',
    label: 'العربية',
    required: true,
    dir: 'rtl',
  },
  {
    code: 'en',
    label: 'English',
    required: false,
    dir: 'ltr',
    missingTitle: 'الترجمة الإنجليزية ناقصة',
  },
  {
    code: 'tr',
    label: 'Türkçe',
    required: false,
    dir: 'ltr',
    missingTitle: 'الترجمة التركية ناقصة',
  },
];

export function TranslationTabs({
  activeLang = 'ar',
  onChange,
  missingEn = false,
  missingTr = false,
}) {
  const missingByLang = {
    en: Boolean(missingEn),
    tr: Boolean(missingTr),
  };

  return (
    <div className="admin-lang-tabs-wrapper">
      <div
        className="admin-lang-tabs"
        role="tablist"
        aria-label="لغة المحتوى"
      >
        {TABS.map((tab) => {
          const isActive = activeLang === tab.code;
          const isMissing = Boolean(missingByLang[tab.code]);

          return (
            <button
              key={tab.code}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`admin-lang-tab${isActive ? ' admin-lang-tab--active' : ''}`}
              onClick={() => onChange?.(tab.code)}
            >
              <span dir={tab.dir}>{tab.label}</span>
              {tab.required && (
                <span
                  className="admin-lang-tab-required"
                  title="اللغة العربية مطلوبة"
                  aria-hidden="true"
                >
                  *
                </span>
              )}
              {isMissing && (
                <span
                  className="admin-lang-tab-dot"
                  title={tab.missingTitle}
                  aria-label={tab.missingTitle}
                />
              )}
            </button>
          );
        })}
      </div>

      {activeLang !== 'ar' && (
        <p className="admin-lang-hint">
          الحقول الفارغة ستعرض النص العربي تلقائياً
        </p>
      )}
    </div>
  );
}

export default TranslationTabs;
