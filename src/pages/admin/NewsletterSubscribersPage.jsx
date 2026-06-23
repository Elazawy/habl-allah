import { useEffect, useState } from 'react';
import { Trash2, Phone, User, Loader2, Search, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function NewsletterSubscribersPage() {
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState(null);

  async function loadSubscribers() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('newsletter_subscribers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSubscribers(data ?? []);
    } catch (err) {
      console.error('[newsletter] fetch error', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSubscribers();
  }, []);

  async function handleDelete(id) {
    if (!confirm('هل أنت متأكد من حذف هذا المشترك؟')) return;
    setDeleting(id);
    try {
      const { error } = await supabase
        .from('newsletter_subscribers')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setSubscribers((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error('[newsletter] delete error', err);
    } finally {
      setDeleting(null);
    }
  }

  function handleExportCSV() {
    const header = 'الاسم,رقم التواصل,تاريخ التسجيل\n';
    const rows = filtered
      .map((s) => `"${s.full_name}","${s.phone}","${new Date(s.created_at).toLocaleDateString('ar-EG')}"`)
      .join('\n');
    const csv = '\uFEFF' + header + rows; // BOM for Arabic support
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `newsletter_subscribers_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = subscribers.filter(
    (s) =>
      s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.phone?.includes(search)
  );

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">الأرقام المسجلة</h1>
        <p className="admin-page-desc">
          المشتركون في نشرة «كن أول من يعرف» — {subscribers.length} مشترك
        </p>
      </div>

      {loading ? (
        <div className="admin-loading">
          <div className="admin-spinner-lg" />
          <span>جارٍ التحميل…</span>
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="admin-toolbar" style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 280px' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  right: '0.875rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--admin-text-muted)',
                  pointerEvents: 'none',
                }}
              />
              <input
                id="newsletter-search"
                type="text"
                placeholder="بحث بالاسم أو الرقم…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="admin-input"
                style={{
                  width: '100%',
                  paddingRight: '2.5rem',
                }}
              />
            </div>
            <button
              id="newsletter-export-csv"
              className="admin-btn admin-btn--ghost"
              onClick={handleExportCSV}
              disabled={filtered.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
            >
              <Download size={16} />
              تصدير CSV
            </button>
          </div>

          {filtered.length === 0 ? (
            <div className="admin-empty-state">
              <Phone size={48} style={{ color: 'var(--admin-text-muted)', marginBottom: '1rem' }} />
              <p style={{ color: 'var(--admin-text-muted)', fontSize: '1rem' }}>
                {search ? 'لا توجد نتائج لهذا البحث' : 'لا يوجد مشتركون بعد'}
              </p>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th><User size={14} style={{ display: 'inline', marginLeft: '0.25rem', verticalAlign: 'middle' }} /> الاسم</th>
                    <th><Phone size={14} style={{ display: 'inline', marginLeft: '0.25rem', verticalAlign: 'middle' }} /> رقم التواصل</th>
                    <th>تاريخ التسجيل</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((sub, i) => (
                    <tr key={sub.id}>
                      <td style={{ color: 'var(--admin-text-muted)', fontSize: '0.8rem' }}>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{sub.full_name}</td>
                      <td dir="ltr" style={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}>{sub.phone}</td>
                      <td style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>
                        {new Date(sub.created_at).toLocaleDateString('ar-EG', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td>
                        <button
                          id={`newsletter-delete-${sub.id}`}
                          className="admin-btn admin-btn--danger admin-btn--sm"
                          onClick={() => handleDelete(sub.id)}
                          disabled={deleting === sub.id}
                          title="حذف"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          {deleting === sub.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
