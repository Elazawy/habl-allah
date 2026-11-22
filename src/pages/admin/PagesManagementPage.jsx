import { useEffect, useState } from 'react';
import { fetchAllPages, updatePage } from '../../services/pagesService';
import { FileText, Pencil, Shield, Save, X, Loader } from 'lucide-react';
import {
  PAGE_TRANSLATION_SPECS,
  getMissingTranslations,
} from '../../i18n/content.js';
import TranslationTabs from './components/TranslationTabs';
import TranslationStatusBadge from './components/TranslationStatusBadge';

const EMPTY_EDIT_FORM = {
  title: '',
  title_en: '',
  title_tr: '',
  content: '',
  content_en: '',
  content_tr: '',
};

export default function PagesManagementPage() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPage, setEditingPage] = useState(null);
  const [editForm, setEditForm] = useState({ ...EMPTY_EDIT_FORM });
  const [activeLang, setActiveLang] = useState('ar');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAllPages()
      .then(setPages)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const pageIcon = (slug) => {
    if (slug === 'privacy-policy') return Shield;
    return FileText;
  };

  const openEditor = (page) => {
    setEditingPage(page);
    setEditForm({
      title: page.title ?? '',
      title_en: page.title_en ?? '',
      title_tr: page.title_tr ?? '',
      content: page.content ?? '',
      content_en: page.content_en ?? '',
      content_tr: page.content_tr ?? '',
    });
    setActiveLang('ar');
    setError('');
  };

  const closeEditor = () => {
    setEditingPage(null);
    setEditForm({ ...EMPTY_EDIT_FORM });
    setActiveLang('ar');
    setError('');
  };

  const handleSave = async () => {
    if (!editingPage) return;
    setError('');

    if (!editForm.title.trim()) {
      setActiveLang('ar');
      setError('يرجى إدخال عنوان الصفحة باللغة العربية.');
      return;
    }

    if (!editForm.content.trim()) {
      setActiveLang('ar');
      setError('يرجى إدخال محتوى الصفحة باللغة العربية.');
      return;
    }

    setSaving(true);
    try {
      const updated = await updatePage(editingPage.slug, {
        title: editForm.title.trim(),
        title_en: editForm.title_en.trim() || null,
        title_tr: editForm.title_tr.trim() || null,
        content: editForm.content,
        content_en: editForm.content_en.trim() ? editForm.content_en : null,
        content_tr: editForm.content_tr.trim() ? editForm.content_tr : null,
      });
      setPages((prev) =>
        prev.map((p) => (p.slug === updated.slug ? { ...p, ...updated } : p))
      );
      closeEditor();
    } catch (err) {
      console.error(err);
      setError(err.message ?? 'حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (editingPage) {
      const handleKey = (e) => { if (e.key === 'Escape') closeEditor(); };
      document.addEventListener('keydown', handleKey);
      return () => document.removeEventListener('keydown', handleKey);
    }
  }, [editingPage]);

  const { missingEn, missingTr } = getMissingTranslations(editForm, PAGE_TRANSLATION_SPECS);
  const langSuffix = activeLang === 'ar' ? '' : `_${activeLang}`;
  const langLabel = activeLang === 'en' ? 'English' : 'Türkçe';

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">إدارة الصفحات</h1>
          <p className="admin-page-desc">سياسة الخصوصية وشروط الاستخدام</p>
        </div>
      </div>

      {loading ? (
        <div className="admin-loading">
          <div className="admin-spinner-lg" />
          <span>جارٍ التحميل…</span>
        </div>
      ) : pages.length === 0 ? (
        <div className="admin-empty">
          <FileText size={48} />
          <p>لا توجد صفحات</p>
        </div>
      ) : (
        <div className="admin-pages-grid">
          {pages.map((page) => {
            const Icon = pageIcon(page.slug);
            return (
              <div key={page.slug} className="admin-page-card" id={`page-card-${page.slug}`}>
                <div className="admin-page-card-header">
                  <div className="admin-page-card-icon">
                    <Icon size={28} />
                  </div>
                  <div>
                    <h3 className="admin-page-card-title">{page.title}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                      <span className="admin-badge admin-badge--neutral">/{page.slug}</span>
                      <TranslationStatusBadge
                        record={page}
                        specs={PAGE_TRANSLATION_SPECS}
                      />
                    </div>
                  </div>
                </div>
                <div className="admin-page-card-meta">
                  <span>آخر تحديث: {new Date(page.updated_at).toLocaleDateString('ar-EG')}</span>
                  <span>{page.content?.length ?? 0} حرف</span>
                </div>
                <div className="admin-page-card-preview">
                  {page.content?.slice(0, 150)}…
                </div>
                <button
                  className="admin-btn admin-btn--primary admin-page-card-edit-btn"
                  onClick={() => openEditor(page)}
                >
                  <Pencil size={16} />
                  تعديل المحتوى
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Full-screen Editor Modal */}
      {editingPage && (
        <div
          className="admin-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={`تعديل ${editingPage.title}`}
          onClick={(e) => { if (e.target === e.currentTarget) closeEditor(); }}
        >
          <div className="admin-modal admin-modal--wide">
            <div className="admin-modal-header">
              <h2 className="admin-modal-title">
                تعديل: {editingPage.title}
              </h2>
              <button className="admin-modal-close" onClick={closeEditor} aria-label="إغلاق">
                <X size={20} />
              </button>
            </div>

            <div className="admin-modal-body">
              <TranslationTabs
                activeLang={activeLang}
                onChange={setActiveLang}
                missingEn={missingEn}
                missingTr={missingTr}
              />

              {activeLang === 'ar' ? (
                <>
                  <div className="admin-field-group">
                    <label htmlFor="page-title" className="admin-label">عنوان الصفحة *</label>
                    <input
                      id="page-title"
                      type="text"
                      className="admin-input"
                      value={editForm.title}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="admin-field-group">
                    <label htmlFor="page-content" className="admin-label">
                      المحتوى (Markdown) *
                    </label>
                    <textarea
                      id="page-content"
                      className="admin-input admin-textarea page-editor-textarea"
                      value={editForm.content}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, content: e.target.value }))}
                      rows={18}
                      dir="rtl"
                      required
                    />
                    <p className="admin-field-hint">
                      يدعم: # عنوان، ## عنوان فرعي، - قائمة، **نص عريض**
                    </p>
                  </div>
                </>
              ) : (
                <div dir="ltr" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="admin-field-group">
                    <label htmlFor={`page-title-${activeLang}`} className="admin-label" dir="rtl">
                      عنوان الصفحة ({langLabel})
                    </label>
                    {editForm.title.trim() && (
                      <p className="admin-field-hint" dir="rtl">العنوان العربي: {editForm.title}</p>
                    )}
                    <input
                      id={`page-title-${activeLang}`}
                      type="text"
                      className="admin-input"
                      value={editForm[`title${langSuffix}`]}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, [`title${langSuffix}`]: e.target.value }))
                      }
                      placeholder={activeLang === 'en' ? 'Page title in English...' : 'Sayfa başlığı...'}
                    />
                  </div>

                  <div className="admin-field-group">
                    <label htmlFor={`page-content-${activeLang}`} className="admin-label" dir="rtl">
                      المحتوى (Markdown - {langLabel})
                    </label>
                    <textarea
                      id={`page-content-${activeLang}`}
                      className="admin-input admin-textarea page-editor-textarea"
                      value={editForm[`content${langSuffix}`]}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, [`content${langSuffix}`]: e.target.value }))
                      }
                      placeholder={activeLang === 'en' ? 'Write Markdown content in English...' : 'Türkçe Markdown içeriği yazın...'}
                      rows={18}
                      dir="ltr"
                    />
                    <p className="admin-field-hint" dir="rtl">
                      يدعم: # عنوان، ## عنوان فرعي، - قائمة، **نص عريض**
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="admin-error-banner" role="alert">⚠️ {error}</div>
              )}

              <div className="admin-modal-actions">
                <button
                  className="admin-btn admin-btn--ghost"
                  onClick={closeEditor}
                  disabled={saving}
                >
                  إلغاء
                </button>
                <button
                  className="admin-btn admin-btn--primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? <Loader size={16} className="admin-spin" /> : <Save size={16} />}
                  {saving ? 'جارٍ الحفظ…' : 'حفظ التعديلات'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
