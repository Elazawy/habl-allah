import { useEffect, useState } from 'react';
import { fetchAllTeachers, deleteTeacher } from '../../services/adminService';
import TeacherFormModal from './TeacherFormModal';
import { Plus, Pencil, Trash2, Search, Users, Images } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TeachersManagementPage() {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');
  const [modalState, setModalState] = useState({ open: false, teacher: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadTeachers = () => {
    setLoading(true);
    fetchAllTeachers()
      .then(setTeachers)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadTeachers(); }, []);

  const filtered = teachers.filter((t) => {
    const matchGender = genderFilter === 'all' || t.gender === genderFilter;
    const matchSearch = t.name.includes(search) || (t.bio ?? '').includes(search);
    return matchGender && matchSearch;
  });

  const openAdd = () => setModalState({ open: true, teacher: null });
  const openEdit = (teacher) => setModalState({ open: true, teacher });
  const closeModal = () => setModalState({ open: false, teacher: null });

  const handleSaved = (savedTeacher) => {
    setTeachers((prev) => {
      const idx = prev.findIndex((t) => t.id === savedTeacher.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...prev[idx], ...savedTeacher };
        return next;
      }
      return [...prev, savedTeacher];
    });
  };

  const confirmDelete = (teacher) => setDeleteTarget(teacher);
  const cancelDelete = () => setDeleteTarget(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTeacher(deleteTarget.id);
      setTeachers((prev) => prev.filter((t) => t.id !== deleteTarget.id));
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
          <h1 className="admin-page-title">إدارة المعلمين</h1>
          <p className="admin-page-desc">{teachers.length} معلم مسجّل</p>
        </div>
        <button
          id="admin-add-teacher-btn"
          className="admin-btn admin-btn--primary"
          onClick={openAdd}
        >
          <Plus size={18} />
          إضافة معلم
        </button>
      </div>

      {/* Filters */}
      <div className="admin-filters">
        <div className="admin-search-wrapper">
          <Search size={16} className="admin-search-icon" />
          <input
            id="admin-teacher-search"
            type="text"
            className="admin-input admin-search-input"
            placeholder="بحث بالاسم أو النبذة…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="admin-filter-tabs">
          {[
            { val: 'all', label: 'الكل' },
            { val: 'male', label: 'المعلمون' },
            { val: 'female', label: 'المعلمات' },
          ].map(({ val, label }) => (
            <button
              key={val}
              id={`admin-filter-${val}`}
              className={`admin-filter-tab ${genderFilter === val ? 'admin-filter-tab--active' : ''}`}
              onClick={() => setGenderFilter(val)}
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
      ) : filtered.length === 0 ? (
        <div className="admin-empty">
          <Users size={48} />
          <p>لا يوجد معلمون مطابقون</p>
        </div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table" id="teachers-table">
            <thead>
              <tr>
                <th>المعلم</th>
                <th>النوع</th>
                <th>التقييمات</th>
                <th>التلاوة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((teacher) => (
                <tr key={teacher.id} id={`teacher-row-${teacher.id}`}>
                  <td>
                    <div className="admin-teacher-cell">
                      {teacher.photo_url ? (
                        <img
                          src={teacher.photo_url}
                          alt={teacher.name}
                          className="admin-teacher-avatar"
                        />
                      ) : (
                        <div className="admin-teacher-avatar-fallback">
                          {teacher.name[0]}
                        </div>
                      )}
                      <div>
                        <div className="admin-teacher-name">{teacher.name}</div>
                        <div className="admin-teacher-bio-preview">
                          {teacher.bio?.slice(0, 60)}{teacher.bio?.length > 60 ? '…' : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`admin-badge admin-badge--${teacher.gender}`}>
                      {teacher.gender === 'male' ? 'معلم' : 'معلمة'}
                    </span>
                  </td>
                  <td className="admin-reviews-count">
                    {teacher.teacher_reviews?.length ?? 0}
                  </td>
                  <td>
                    {teacher.recitation_type ? (
                      <span className="admin-badge admin-badge--neutral">
                        {teacher.recitation_type === 'audio' ? '🔊 صوت' : '🎥 فيديو'}
                      </span>
                    ) : (
                      <span className="admin-muted">—</span>
                    )}
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <button
                        id={`manage-reviews-${teacher.id}`}
                        className="admin-icon-btn admin-icon-btn--neutral"
                        onClick={() => navigate(`/admin/quran/teachers/${teacher.id}/reviews`)}
                        aria-label={`إدارة مراجعات ${teacher.name}`}
                        title="إدارة المراجعات"
                      >
                        <Images size={15} />
                      </button>
                      <button
                        id={`edit-teacher-${teacher.id}`}
                        className="admin-icon-btn admin-icon-btn--edit"
                        onClick={() => openEdit(teacher)}
                        aria-label={`تعديل ${teacher.name}`}
                        title="تعديل"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        id={`delete-teacher-${teacher.id}`}
                        className="admin-icon-btn admin-icon-btn--delete"
                        onClick={() => confirmDelete(teacher)}
                        aria-label={`حذف ${teacher.name}`}
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

      {/* Teacher add/edit modal */}
      {modalState.open && (
        <TeacherFormModal
          teacher={modalState.teacher}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}

      {/* Delete confirmation dialog */}
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
              هل أنت متأكد من حذف <strong>{deleteTarget.name}</strong>؟
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
