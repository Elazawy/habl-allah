import { useEffect, useState } from 'react';
import { Trash2, Phone, User, Loader2, Search, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function NewsletterSubscribersPage() {
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    let active = true;

    const loadSubscribers = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('newsletter_subscribers')
          .select('*')
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;
        if (!active) return;

        setSubscribers(data ?? []);
        setError('');
      } catch (err) {
        console.error('[newsletter] fetch error', err);
        if (!active) return;
        setSubscribers([]);
        setError('تعذر تحميل الأرقام المسجلة حالياً. حاول مرة أخرى بعد قليل.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadSubscribers();

    return () => {
      active = false;
    };
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
      ) : error ? (
        <div className="admin-empty">
          <Phone size={48} />
          <p>{error}</p>
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="admin-filters">
            <div className="admin-search-wrapper" style={{ flex: '1 1 280px' }}>
              <Search size={16} className="admin-search-icon" />
              <input
                id="newsletter-search"
                type="text"
                placeholder="بحث بالاسم أو الرقم…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="admin-input admin-search-input"
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
            <div className="admin-empty">
              <Phone size={48} style={{ color: 'var(--admin-text-muted)', marginBottom: '1rem' }} />
              <p style={{ color: 'var(--admin-text-muted)', fontSize: '1rem' }}>
                {search ? 'لا توجد نتائج لهذا البحث' : 'لا يوجد مشتركون بعد'}
              </p>
            </div>
          ) : (
            <div className="admin-table-wrapper admin-table-wrapper--cards">
              <table className="admin-table admin-table--cards" id="newsletter-subscribers-table">
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
                      <td data-label="#" style={{ color: 'var(--admin-text-muted)', fontSize: '0.8rem' }}>{i + 1}</td>
                      <td data-label="الاسم" style={{ fontWeight: 600 }}>{sub.full_name}</td>
                      <td data-label="رقم التواصل" dir="ltr" style={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}>{sub.phone}</td>
                      <td data-label="تاريخ التسجيل" style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>
                        {new Date(sub.created_at).toLocaleDateString('ar-EG', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td data-label="إجراءات">
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
