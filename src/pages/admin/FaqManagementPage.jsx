import { useEffect, useState, useCallback } from 'react';
import { fetchAllFaqs, createFaq, updateFaq, deleteFaq } from '../../services/faqService';
import { Plus, Pencil, Trash2, Search, HelpCircle, Eye, EyeOff, X, Loader } from 'lucide-react';

const EMPTY_FORM = { question: '', answer: '', sort_order: 0, is_published: true };

function FaqFormModal({ faq, platform, onClose, onSaved }) {
  const isEdit = Boolean(faq);
  const [form, setForm] = useState(
    faq
      ? { question: faq.question, answer: faq.answer, sort_order: faq.sort_order, is_published: faq.is_published }
      : { ...EMPTY_FORM }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = { ...form, platform };
      const saved = isEdit
        ? await updateFaq(faq.id, payload)
        : await createFaq(payload);
      onSaved(saved);
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message ?? 'حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="admin-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'تعديل سؤال' : 'إضافة سؤال جديد'}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="admin-modal">
        <div className="admin-modal-header">
          <h2 className="admin-modal-title">
            {isEdit ? 'تعديل السؤال' : 'إضافة سؤال جديد'}
          </h2>
          <button className="admin-modal-close" onClick={onClose} aria-label="إغلاق">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="admin-modal-body" id="faq-form">
          <div className="admin-field-group">
            <label htmlFor="faq-question" className="admin-label">السؤال *</label>
            <textarea
              id="faq-question"
              className="admin-input admin-textarea"
              value={form.question}
              onChange={(e) => handleField('question', e.target.value)}
              placeholder="اكتب السؤال…"
              rows={3}
              required
            />
          </div>

          <div className="admin-field-group">
            <label htmlFor="faq-answer" className="admin-label">الإجابة *</label>
            <textarea
              id="faq-answer"
              className="admin-input admin-textarea"
              value={form.answer}
              onChange={(e) => handleField('answer', e.target.value)}
              placeholder="اكتب الإجابة…"
              rows={5}
              required
            />
          </div>

          <div className="admin-field-row">
            <div className="admin-field-group" style={{ flex: 1 }}>
              <label htmlFor="faq-sort" className="admin-label">الترتيب</label>
              <input
                id="faq-sort"
                type="number"
                className="admin-input"
                value={form.sort_order}
                onChange={(e) => handleField('sort_order', parseInt(e.target.value) || 0)}
                min={0}
              />
            </div>
            <div className="admin-field-group" style={{ flex: 1 }}>
              <label className="admin-label">الحالة</label>
              <label className="admin-checkbox-label">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) => handleField('is_published', e.target.checked)}
                  className="admin-checkbox"
                  id="faq-published"
                />
                <span>منشور</span>
              </label>
            </div>
          </div>

          {error && (
            <div className="admin-error-banner" role="alert">⚠️ {error}</div>
          )}

          <div className="admin-modal-actions">
            <button
              type="button"
              className="admin-btn admin-btn--ghost"
              onClick={onClose}
              disabled={saving}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="admin-btn admin-btn--primary"
              disabled={saving}
            >
              {saving ? <Loader size={16} className="admin-spin" /> : null}
              {saving ? 'جارٍ الحفظ…' : isEdit ? 'حفظ التعديلات' : 'إضافة السؤال'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FaqManagementPage({ platform = 'general' }) {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalState, setModalState] = useState({ open: false, faq: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const platformLabel = platform === 'quran' ? 'منصة القرآن' : 'المنصة الرئيسية';

  const loadFaqs = useCallback(() => {
    setLoading(true);
    fetchAllFaqs(platform)
      .then(setFaqs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [platform]);

  useEffect(() => { loadFaqs(); }, [loadFaqs]);

  const filtered = faqs.filter((f) => {
    return f.question.includes(search) || f.answer.includes(search);
  });

  const openAdd = () => setModalState({ open: true, faq: null });
  const openEdit = (faq) => setModalState({ open: true, faq });
  const closeModal = () => setModalState({ open: false, faq: null });

  const handleSaved = (saved) => {
    setFaqs((prev) => {
      const idx = prev.findIndex((f) => f.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...prev[idx], ...saved };
        return next;
      }
      return [...prev, saved];
    });
  };

  const togglePublished = async (faq) => {
    try {
      const updated = await updateFaq(faq.id, { is_published: !faq.is_published });
      handleSaved(updated);
    } catch (err) {
      console.error(err);
      alert('فشل تحديث الحالة: ' + err.message);
    }
  };

  const confirmDelete = (faq) => setDeleteTarget(faq);
  const cancelDelete = () => setDeleteTarget(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteFaq(deleteTarget.id);
      setFaqs((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      alert('فشل الحذف: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">إدارة الأسئلة الشائعة</h1>
          <p className="admin-page-desc">{platformLabel} — {faqs.length} سؤال</p>
        </div>
        <button
          id="admin-add-faq-btn"
          className="admin-btn admin-btn--primary"
          onClick={openAdd}
        >
          <Plus size={18} />
          إضافة سؤال
        </button>
      </div>

      {/* Search */}
      <div className="admin-filters">
        <div className="admin-search-wrapper">
          <Search size={16} className="admin-search-icon" />
          <input
            id="admin-faq-search"
            type="text"
            className="admin-input admin-search-input"
            placeholder="بحث في الأسئلة…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="admin-loading">
          <div className="admin-spinner-lg" />
          <span>جارٍ التحميل…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="admin-empty">
          <HelpCircle size={48} />
          <p>لا توجد أسئلة شائعة</p>
        </div>
      ) : (
        <div className="admin-table-wrapper admin-faq-table-wrapper">
          <table className="admin-table" id="faqs-table">
            <thead>
              <tr>
                <th>السؤال</th>
                <th>الترتيب</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((faq) => (
                <tr key={faq.id} id={`faq-row-${faq.id}`}>
                  <td data-label="السؤال">
                    <div className="admin-faq-cell">
                      <div className="admin-faq-question">{faq.question}</div>
                      <div className="admin-faq-answer-preview">
                        {faq.answer?.slice(0, 80)}{faq.answer?.length > 80 ? '…' : ''}
                      </div>
                    </div>
                  </td>
                  <td className="admin-reviews-count" data-label="الترتيب">{faq.sort_order}</td>
                  <td data-label="الحالة">
                    <button
                      className={`admin-badge ${faq.is_published ? 'admin-badge--published' : 'admin-badge--draft'}`}
                      onClick={() => togglePublished(faq)}
                      title={faq.is_published ? 'إخفاء' : 'نشر'}
                    >
                      {faq.is_published ? (
                        <><Eye size={12} /> منشور</>
                      ) : (
                        <><EyeOff size={12} /> مخفي</>
                      )}
                    </button>
                  </td>
                  <td data-label="الإجراءات">
                    <div className="admin-row-actions">
                      <button
                        className="admin-icon-btn admin-icon-btn--edit"
                        onClick={() => openEdit(faq)}
                        aria-label={`تعديل: ${faq.question.slice(0, 30)}`}
                        title="تعديل"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="admin-icon-btn admin-icon-btn--delete"
                        onClick={() => confirmDelete(faq)}
                        aria-label="حذف"
                        title="حذف"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalState.open && (
        <FaqFormModal
          faq={modalState.faq}
          platform={platform}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true" aria-label="تأكيد الحذف">
          <div className="admin-confirm-dialog">
            <div className="admin-confirm-icon">🗑️</div>
            <h3 className="admin-confirm-title">تأكيد الحذف</h3>
            <p className="admin-confirm-text">
              هل أنت متأكد من حذف هذا السؤال؟
              <br />
              <strong>{deleteTarget.question.slice(0, 60)}</strong>
              <br />
              لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="admin-modal-actions">
              <button className="admin-btn admin-btn--ghost" onClick={cancelDelete} disabled={deleting}>
                إلغاء
              </button>
              <button className="admin-btn admin-btn--danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'جارٍ الحذف…' : 'نعم، احذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
