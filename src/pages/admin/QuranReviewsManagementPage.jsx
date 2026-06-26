import { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Eye,
  EyeOff,
  Image as ImageIcon,
} from 'lucide-react';
import {
  fetchAllQuranReviews,
  createQuranReview,
  updateQuranReview,
  deleteQuranReview,
  uploadQuranReviewImage,
  deleteReviewImage,
} from '../../services/adminService';
import ReviewImageFormModal from './ReviewImageFormModal';

function sortReviews(items = []) {
  return [...items].sort((a, b) => {
    const aSort = a?.sort_order ?? 0;
    const bSort = b?.sort_order ?? 0;
    if (aSort !== bSort) return aSort - bSort;
    return new Date(a?.created_at ?? 0).getTime() - new Date(b?.created_at ?? 0).getTime();
  });
}

export default function QuranReviewsManagementPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [modalState, setModalState] = useState({ open: false, review: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;

    const loadReviews = async () => {
      try {
        const data = await fetchAllQuranReviews();
        if (!active) return;
        setReviews(sortReviews(data));
        setError('');
      } catch (loadError) {
        console.error(loadError);
        if (!active) return;
        setReviews([]);
        setError('تعذر تحميل مراجعات صفحة القرآن حالياً. حاول مرة أخرى بعد قليل.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadReviews();

    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    return reviews.filter((review) => {
      const q = search.trim();
      if (!q) return true;
      return (review.image_url ?? '').includes(q) || String(review.sort_order ?? 0).includes(q);
    });
  }, [reviews, search]);

  const openAdd = () => setModalState({ open: true, review: null });
  const openEdit = (review) => setModalState({ open: true, review });
  const closeModal = () => setModalState({ open: false, review: null });

  const handleSaved = (saved) => {
    setReviews((prev) => {
      const idx = prev.findIndex((r) => r.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...prev[idx], ...saved };
        return sortReviews(next);
      }
      return sortReviews([...prev, saved]);
    });
  };

  const togglePublished = async (review) => {
    try {
      const updated = await updateQuranReview(review.id, { is_published: !review.is_published });
      handleSaved(updated);
    } catch (error) {
      console.error(error);
      alert(`فشل تحديث الحالة: ${error.message}`);
    }
  };

  const confirmDelete = (review) => setDeleteTarget(review);
  const cancelDelete = () => setDeleteTarget(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const removed = await deleteQuranReview(deleteTarget.id);
      setReviews((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);

      if (removed?.image_path) {
        deleteReviewImage(removed.image_path).catch((cleanupError) => {
          console.error('[cleanup quran review image failed]', cleanupError);
        });
      }
    } catch (error) {
      console.error(error);
      alert(`فشل الحذف: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">مراجعات صفحة القرآن</h1>
          <p className="admin-page-desc">صور مراجعات عامة للأكاديمية — {reviews.length} مراجعة</p>
        </div>
        <button
          id="admin-add-quran-review-btn"
          className="admin-btn admin-btn--primary"
          onClick={openAdd}
        >
          <Plus size={18} />
          إضافة مراجعة
        </button>
      </div>

      <div className="admin-filters">
        <div className="admin-search-wrapper">
          <Search size={16} className="admin-search-icon" />
          <input
            id="admin-quran-reviews-search"
            type="text"
            className="admin-input admin-search-input"
            placeholder="بحث في الرابط أو الترتيب…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="admin-loading">
          <div className="admin-spinner-lg" />
          <span>جارٍ التحميل…</span>
        </div>
      ) : error ? (
        <div className="admin-empty">
          <ImageIcon size={48} />
          <p>{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="admin-empty">
          <ImageIcon size={48} />
          <p>
            {reviews.length === 0
              ? 'لا توجد مراجعات عامة لصفحة القرآن'
              : 'لا توجد نتائج مطابقة للبحث'}
          </p>
          {reviews.length === 0 && (
            <button className="admin-btn admin-btn--primary" onClick={openAdd}>
              <Plus size={16} />
              إضافة أول مراجعة
            </button>
          )}
        </div>
      ) : (
        <div className="admin-table-wrapper admin-table-wrapper--cards">
          <table className="admin-table admin-table--cards" id="quran-reviews-table">
            <thead>
              <tr>
                <th>الصورة</th>
                <th>الترتيب</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((review) => (
                <tr key={review.id} id={`quran-review-row-${review.id}`}>
                  <td data-label="الصورة">
                    <img
                      src={review.image_url}
                      alt="صورة مراجعة"
                      className="admin-review-thumb"
                    />
                  </td>
                  <td className="admin-reviews-count" data-label="الترتيب">{review.sort_order ?? 0}</td>
                  <td data-label="الحالة">
                    <button
                      className={`admin-badge ${review.is_published ? 'admin-badge--published' : 'admin-badge--draft'}`}
                      onClick={() => togglePublished(review)}
                      title={review.is_published ? 'إخفاء' : 'نشر'}
                    >
                      {review.is_published ? <><Eye size={12} /> منشور</> : <><EyeOff size={12} /> مخفي</>}
                    </button>
                  </td>
                  <td data-label="الإجراءات">
                    <div className="admin-row-actions">
                      <button
                        className="admin-icon-btn admin-icon-btn--edit"
                        onClick={() => openEdit(review)}
                        aria-label="تعديل المراجعة"
                        title="تعديل"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="admin-icon-btn admin-icon-btn--delete"
                        onClick={() => confirmDelete(review)}
                        aria-label="حذف المراجعة"
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

      {modalState.open && (
        <ReviewImageFormModal
          review={modalState.review}
          onClose={closeModal}
          onSaved={handleSaved}
          onUploadImage={uploadQuranReviewImage}
          onDeleteImage={deleteReviewImage}
          onCreate={createQuranReview}
          onUpdate={updateQuranReview}
          titleAdd="إضافة مراجعة لصفحة القرآن"
          titleEdit="تعديل مراجعة صفحة القرآن"
        />
      )}

      {deleteTarget && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true" aria-label="تأكيد الحذف">
          <div className="admin-confirm-dialog">
            <div className="admin-confirm-icon">🗑️</div>
            <h3 className="admin-confirm-title">تأكيد حذف المراجعة</h3>
            <p className="admin-confirm-text">
              هل أنت متأكد من حذف هذه المراجعة؟
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
