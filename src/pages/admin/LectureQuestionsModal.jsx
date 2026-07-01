import { useEffect, useState, useCallback } from 'react';
import { X, Loader, MessageSquare, Send } from 'lucide-react';
import { fetchLectureQuestions, replyToQuestion } from '../../services/lectureQuestionsService';

export default function LectureQuestionsModal({ lectureId, lectureTitle, onClose }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyTexts, setReplyTexts] = useState({});
  const [savingId, setSavingId] = useState(null);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchLectureQuestions(lectureId);
      setQuestions(data);
      
      // Initialize replies state
      const initialReplies = {};
      data.forEach((q) => {
        initialReplies[q.id] = q.admin_reply ?? '';
      });
      setReplyTexts(initialReplies);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [lectureId]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const handleReplyChange = (questionId, val) => {
    setReplyTexts((prev) => ({ ...prev, [questionId]: val }));
  };

  const handleSaveReply = async (questionId) => {
    const text = replyTexts[questionId]?.trim();
    if (!text) return;

    setSavingId(questionId);
    try {
      await replyToQuestion(questionId, text);
      alert('تم حفظ الإجابة بنجاح.');
      loadQuestions(); // reload
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء حفظ الإجابة: ' + err.message);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div
      className="admin-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="الأسئلة والأجوبة للمحاضرة"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="admin-modal" style={{ maxWidth: '650px', width: '90%' }}>
        <div className="admin-modal-header">
          <div>
            <h2 className="admin-modal-title">الأسئلة والأجوبة المطروحة</h2>
            <p className="admin-field-hint" style={{ marginTop: '0.2rem' }}>
              المحاضرة: <strong>{lectureTitle}</strong>
            </p>
          </div>
          <button
            id="admin-modal-close-btn"
            className="admin-modal-close"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <div className="admin-modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
          {loading ? (
            <div className="admin-loading" style={{ padding: '2rem' }}>
              <div className="admin-spinner" />
              <span>جارٍ تحميل الأسئلة…</span>
            </div>
          ) : questions.length === 0 ? (
            <div className="admin-empty" style={{ padding: '2rem' }}>
              <MessageSquare size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
              <p>لا توجد أسئلة مطروحة من الطلاب على هذه المحاضرة بعد.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {questions.map((q) => (
                <div
                  key={q.id}
                  style={{
                    background: 'var(--admin-surface2)',
                    border: '1px solid var(--admin-border)',
                    borderRadius: '12px',
                    padding: '1rem',
                  }}
                >
                  {/* Header metadata */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.78rem',
                      color: 'var(--admin-muted)',
                      borderBottom: '1px solid var(--admin-border)',
                      paddingBottom: '0.5rem',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <span>طرحه الطالب: <strong>{q.student_profiles?.full_name}</strong></span>
                    <span>بتاريخ {new Date(q.created_at).toLocaleDateString('ar-EG')}</span>
                  </div>

                  {/* Question title */}
                  <h4 style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--admin-text)', marginBottom: '1rem' }}>
                    {q.question_title}
                  </h4>

                  {/* Reply Form */}
                  <div className="admin-field-group">
                    <label htmlFor={`reply-to-${q.id}`} className="admin-label">إجابة الشيخ / الإدارة:</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <textarea
                        id={`reply-to-${q.id}`}
                        rows={2}
                        className="admin-input"
                        placeholder="اكتب إجابتك الواضحة هنا لحفظها للطالب..."
                        value={replyTexts[q.id] || ''}
                        onChange={(e) => handleReplyChange(q.id, e.target.value)}
                      />
                      <button
                        type="button"
                        className="admin-btn admin-btn--primary"
                        onClick={() => handleSaveReply(q.id)}
                        disabled={savingId === q.id || !replyTexts[q.id]?.trim()}
                        style={{ height: 'fit-content', padding: '0.75rem 1rem' }}
                        title="حفظ الإجابة"
                      >
                        {savingId === q.id ? (
                          <Loader size={16} className="admin-spin" />
                        ) : (
                          <Send size={15} className="-rotate-45" />
                        )}
                      </button>
                    </div>
                  </div>

                  {q.is_answered && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--admin-accent)' }}>
                      ✓ تم الرد في {new Date(q.replied_at).toLocaleDateString('ar-EG')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
