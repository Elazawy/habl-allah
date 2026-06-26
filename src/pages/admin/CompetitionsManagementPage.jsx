import { useEffect, useState } from 'react';
import { fetchAllCompetitions, deleteCompetition, updateCompetition } from '../../services/competitionsService';
import CompetitionFormModal from './CompetitionFormModal';
import { Plus, Pencil, Trash2, Search, Trophy, Eye, EyeOff, Calendar, Clock, RefreshCcw } from 'lucide-react';

function getLoadErrorMessage(error) {
  if (error?.message?.includes('Supabase is not configured')) {
    return 'تعذر تحميل المسابقات لأن إعدادات قاعدة البيانات غير مكتملة.';
  }

  return 'تعذر تحميل قائمة المسابقات حالياً. حاول مرة أخرى بعد قليل.';
}

export default function CompetitionsManagementPage() {
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalState, setModalState] = useState({ open: false, competition: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadCompetitions = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await fetchAllCompetitions();
      setCompetitions(data);
    } catch (err) {
      console.error(err);
      setCompetitions([]);
      setError(getLoadErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      try {
        const data = await fetchAllCompetitions();
        if (!active) return;
        setCompetitions(data);
        setError('');
      } catch (err) {
        console.error(err);
        if (!active) return;
        setCompetitions([]);
        setError(getLoadErrorMessage(err));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      active = false;
    };
  }, []);

  const handleSaved = (saved) => {
    setCompetitions((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id);
      let next = [...prev];
      if (idx >= 0) {
        next[idx] = { ...prev[idx], ...saved };
      } else {
        next.push(saved);
      }
      // Sort: sort_order asc, start_date asc, created_at asc
      return next.sort((a, b) => {
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
        const aDate = new Date(a.start_date);
        const bDate = new Date(b.start_date);
        if (aDate.getTime() !== bDate.getTime()) return aDate.getTime() - bDate.getTime();
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
    });
  };

  const togglePublished = async (competition) => {
    try {
      const updated = await updateCompetition(competition.id, {
        is_published: !competition.is_published,
      });
      handleSaved(updated);
    } catch (err) {
      console.error(err);
      alert('فشل تحديث الحالة: ' + err.message);
    }
  };

  const confirmDelete = (comp) => setDeleteTarget(comp);
  const cancelDelete = () => setDeleteTarget(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCompetition(deleteTarget.id);
      setCompetitions((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      alert('فشل الحذف: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const filtered = competitions.filter((c) => {
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'published' && c.is_published) ||
      (statusFilter === 'draft' && !c.is_published);
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.short_description.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const openAdd = () => setModalState({ open: true, competition: null });
  const openEdit = (comp) => setModalState({ open: true, competition: comp });
  const closeModal = () => setModalState({ open: false, competition: null });

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('ar-EG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">إدارة المسابقات</h1>
          <p className="admin-page-desc">لوحة التحكم لإضافة وتعديل وحذف مسابقات القرآن الكريم — {competitions.length} مسابقة</p>
        </div>
        <button
          id="admin-add-competition-btn"
          className="admin-btn admin-btn--primary"
          onClick={openAdd}
        >
          <Plus size={18} />
          إضافة مسابقة
        </button>
      </div>

      {/* Filters */}
      <div className="admin-filters">
        <div className="admin-search-wrapper">
          <Search size={16} className="admin-search-icon" />
          <input
            id="admin-competition-search"
            type="text"
            className="admin-input admin-search-input"
            placeholder="بحث بالاسم أو الرابط أو الوصف…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="admin-filter-tabs">
          {[
            { val: 'all', label: 'الكل' },
            { val: 'published', label: 'المنشورة' },
            { val: 'draft', label: 'المسودات' },
          ].map(({ val, label }) => (
            <button
              key={val}
              id={`admin-filter-${val}`}
              className={`admin-filter-tab ${statusFilter === val ? 'admin-filter-tab--active' : ''}`}
              onClick={() => setStatusFilter(val)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="admin-loading">
          <div className="admin-spinner-lg" />
          <span>جارٍ التحميل…</span>
        </div>
      ) : error ? (
        <div className="admin-empty" style={{ minHeight: '300px' }}>
          <Trophy size={48} className="mb-4 text-amber-500 opacity-40" />
          <h3 className="text-xl font-bold mb-2">تعذر تحميل المسابقات</h3>
          <p style={{ color: 'var(--admin-text-muted)' }}>{error}</p>
          <button className="admin-btn admin-btn--ghost" onClick={loadCompetitions}>
            <RefreshCcw size={16} />
            إعادة المحاولة
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="admin-empty" style={{ minHeight: '300px' }}>
          <Trophy size={48} className="mb-4 text-amber-500 opacity-40" />
          <h3 className="text-xl font-bold mb-2">لا توجد مسابقات مطابقة</h3>
          <p style={{ color: 'var(--admin-text-muted)' }}>أضف مسابقة جديدة أو غيّر معايير البحث.</p>
        </div>
      ) : (
        <div className="admin-table-wrapper admin-table-wrapper--cards">
          <table className="admin-table admin-table--cards" id="competitions-table">
            <thead>
              <tr>
                <th>المسابقة</th>
                <th>التواريخ</th>
                <th>الجوائز (مختصر)</th>
                <th>الترتيب</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} id={`competition-row-${c.id}`}>
                  <td data-label="المسابقة">
                    <div>
                      <div className="admin-teacher-name">{c.name}</div>
                      <div className="admin-muted" style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                        {c.slug}
                      </div>
                    </div>
                  </td>
                  <td data-label="التواريخ">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8rem' }}>
                      <div className="flex items-center gap-1.5" style={{ color: 'var(--admin-text)' }}>
                        <Calendar size={12} className="text-amber-500" />
                        <span>البدء: {formatDate(c.start_date)}</span>
                      </div>
                      <div className="flex items-center gap-1.5" style={{ color: 'var(--admin-text-muted)' }}>
                        <Clock size={12} className="text-amber-500" />
                        <span>التسجيل: {formatDate(c.registration_deadline)}</span>
                      </div>
                    </div>
                  </td>
                  <td data-label="الجوائز (مختصر)">
                    {c.awards_short_description ? (
                      <span style={{ fontSize: '0.85rem' }}>{c.awards_short_description}</span>
                    ) : (
                      <span className="admin-muted">—</span>
                    )}
                  </td>
                  <td data-label="الترتيب">{c.sort_order}</td>
                  <td data-label="الحالة">
                    <button
                      className={`admin-badge ${c.is_published ? 'admin-badge--published' : 'admin-badge--draft'}`}
                      onClick={() => togglePublished(c)}
                      title={c.is_published ? 'تغيير إلى مسودة' : 'نشر المسابقة'}
                    >
                      {c.is_published ? (
                        <><Eye size={12} /> منشورة</>
                      ) : (
                        <><EyeOff size={12} /> مسودة</>
                      )}
                    </button>
                  </td>
                  <td data-label="الإجراءات">
                    <div className="admin-row-actions">
                      <button
                        id={`edit-competition-${c.id}`}
                        className="admin-icon-btn admin-icon-btn--edit"
                        onClick={() => openEdit(c)}
                        aria-label={`تعديل ${c.name}`}
                        title="تعديل"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        id={`delete-competition-${c.id}`}
                        className="admin-icon-btn admin-icon-btn--delete"
                        onClick={() => confirmDelete(c)}
                        aria-label={`حذف ${c.name}`}
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
        <CompetitionFormModal
          competition={modalState.competition}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div
          className="admin-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="تأكيد الحذف"
        >
          <div className="admin-confirm-dialog">
            <div className="admin-confirm-icon">🗑️</div>
            <h3 className="admin-confirm-title">تأكيد الحذف</h3>
            <p className="admin-confirm-text">
              هل أنت متأكد من حذف مسابقة <strong>{deleteTarget.name}</strong>؟
              <br />
              لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="admin-modal-actions">
              <button
                id="admin-cancel-delete-btn"
                className="admin-btn admin-btn--ghost"
                onClick={cancelDelete}
                disabled={deleting}
              >
                إلغاء
              </button>
              <button
                id="admin-confirm-delete-btn"
                className="admin-btn admin-btn--danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'جارٍ الحذف…' : 'نعم، احذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
