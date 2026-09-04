import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Loader,
  Users,
  FileText,
  CheckCircle,
  Clock,
  MapPin,
  Calendar,
  Trash2,
  Trophy,
  UserPlus,
  KeyRound,
  RefreshCw,
  XCircle,
  ArrowLeftRight,
  Filter,
  GripVertical,
  Save,
  Award,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import {
  fetchCompetitionBySlugAdmin,
  fetchCompetitionStages,
  fetchPendingRegistrationRequests,
  fetchStudentStageAssignments,
  deleteRegistrationRequest,
  rejectRegistrationRequest,
  subscribeStudentToCompetition,
  assignStudentToStage,
  moveStudentToNextStage,
  markStudentFailed,
  markStudentCompleted,
  updateStudentLevel,
  updateStudentAssignment,
  bulkUpdateFinalRanks,
  fetchSubscribedStudents,
} from '../../services/competitionsService';
import {
  adminCreateStudent,
  fetchStudentByPhone,
  generatePassword,
  isValidStudentPhone,
  normalizeStudentPhone,
} from '../../services/studentsService';
import { fetchAllTeachers } from '../../services/adminService';
import { getCountryName } from '../../data/countries';

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    return date.toLocaleString('ar-EG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function calcAgeInYears(dateString) {
  if (!dateString) return null;
  const birthDate = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age;
}

function getGenderLabel(gender) {
  if (gender === 'male') return 'ذكر';
  if (gender === 'female') return 'أنثى';
  return null;
}

const ASSIGNMENT_STATUS_OPTIONS = [
  { value: 'active', label: 'مشارك في المرحلة', hint: 'الطالب ما زال في المسابقة ويتابع المرحلة المحددة.' },
  { value: 'failed', label: 'لم يجتاز المرحلة', hint: 'الطالب خرج من المسابقة عند المرحلة المحددة.' },
  { value: 'completed', label: 'اجتاز المسابقة', hint: 'الطالب أكمل المسابقة ويظهر في تبويب النتائج والترتيب.' },
];

function getAssignmentStatusLabel(status) {
  return ASSIGNMENT_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

export default function CompetitionStudentsPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [competition, setCompetition] = useState(null);
  const [stages, setStages] = useState([]);
  const [requests, setRequests] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('requests');
  const [processingId, setProcessingId] = useState(null);
  const [levelFilter, setLevelFilter] = useState('');
  const [accountModal, setAccountModal] = useState(null);
  const [assignmentModal, setAssignmentModal] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  // Drag-and-drop state for results tab
  const [rankedStudents, setRankedStudents] = useState([]);
  const [savingRanks, setSavingRanks] = useState(false);
  const [ranksChanged, setRanksChanged] = useState(false);
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const comp = await fetchCompetitionBySlugAdmin(slug);
      if (!comp) {
        setError('المسابقة غير موجودة.');
        setLoading(false);
        return;
      }
      setCompetition(comp);

      const [stagesData, requestsData, assignmentsData, subscribersData] = await Promise.all([
        fetchCompetitionStages(comp.id),
        fetchPendingRegistrationRequests(comp.id),
        fetchStudentStageAssignments(comp.id),
        fetchSubscribedStudents(comp.id),
      ]);

      setStages(stagesData);
      setRequests(requestsData);
      setAssignments(assignmentsData);
      setSubscribers(subscribersData);

      // Initialize ranked students from completed assignments
      const completed = assignmentsData
        .filter((a) => a.status === 'completed')
        .sort((a, b) => (a.final_rank ?? 999) - (b.final_rank ?? 999));
      setRankedStudents(completed);
      setRanksChanged(false);
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء تحميل بيانات المسابقة.');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Collect all unique levels for filter ──
  const allLevels = (() => {
    const levels = new Set();
    // From requests
    requests.forEach((r) => { if (r.level) levels.add(r.level); });
    // From assignments
    assignments.forEach((a) => { if (a.level) levels.add(a.level); });
    // From competition available_levels
    if (Array.isArray(competition?.available_levels)) {
      competition.available_levels.forEach((l) => levels.add(l));
    }
    return [...levels].sort();
  })();

  // ── Filter helpers ──
  const filterByLevel = (items, levelKey = 'level') => {
    if (!levelFilter) return items;
    return items.filter((item) => item[levelKey] === levelFilter);
  };

  const getStudentsForStage = (stageId) => {
    return filterByLevel(
      assignments.filter((a) => a.current_stage_id === stageId && a.status === 'active')
    );
  };

  const getFailedForStage = (stageId) => {
    return assignments.filter((a) => a.current_stage_id === stageId && a.status === 'failed');
  };

  const getNextStage = (currentStageId) => {
    const currentIndex = stages.findIndex((s) => s.id === currentStageId);
    if (currentIndex < 0 || currentIndex >= stages.length - 1) return null;
    return stages[currentIndex + 1];
  };

  const getPreviousStage = (currentStageId) => {
    const currentIndex = stages.findIndex((s) => s.id === currentStageId);
    if (currentIndex <= 0) return null;
    return stages[currentIndex - 1];
  };

  const isLastStage = (stageId) => {
    return stages.length > 0 && stages[stages.length - 1].id === stageId;
  };

  // ── Teachers lazy load ──
  const ensureTeachersLoaded = async () => {
    if (teachers.length > 0 || loadingTeachers) return;
    setLoadingTeachers(true);
    try {
      const data = await fetchAllTeachers();
      setTeachers(data);
    } catch (err) {
      console.error(err);
      setTeachers([]);
    } finally {
      setLoadingTeachers(false);
    }
  };

  // ── Request Handlers ──
  const approveRequestForStudent = async ({ request, studentId, successMessage }) => {
    await subscribeStudentToCompetition(studentId, competition.id);
    // If there are stages, assign to Stage 1
    if (stages.length > 0) {
      await assignStudentToStage(studentId, competition.id, stages[0].id, request.level);
    }
    await deleteRegistrationRequest(request.id);
    await loadData();
    if (successMessage) {
      alert(successMessage);
    }
  };

  const handleApproveLinkedStudent = async (request) => {
    if (!request.student_id) return;
    if (!window.confirm(`هل تريد اعتماد ${request.student_name} في هذه المسابقة؟`)) return;

    setProcessingId(request.id);
    try {
      await approveRequestForStudent({
        request,
        studentId: request.student_id,
        successMessage: 'تم اعتماد الطالب ونقله إلى قائمة المشتركين.',
      });
    } catch (err) {
      console.error(err);
      alert(`فشل اعتماد الطالب: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectRequest = async (request) => {
    if (!window.confirm(`هل أنت متأكد من رفض طلب ${request.student_name}؟`)) return;
    setProcessingId(request.id);
    try {
      await rejectRegistrationRequest(request.id);
      setRequests((prev) => prev.filter((r) => r.id !== request.id));
    } catch (err) {
      console.error(err);
      alert(`فشل رفض الطلب: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteRequest = async (requestId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الطلب نهائياً؟')) return;
    setProcessingId(requestId);
    try {
      await deleteRegistrationRequest(requestId);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      console.error(err);
      alert(`فشل حذف الطلب: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handlePrepareGuestApproval = async (request) => {
    setProcessingId(request.id);
    try {
      const existingStudent = await fetchStudentByPhone(request.student_phone);
      if (existingStudent) {
        const confirmed = window.confirm(
          `تم العثور على حساب طالب موجود بهذا الرقم (${existingStudent.full_name}). هل تريد اشتراك هذا الحساب في المسابقة؟`
        );
        if (!confirmed) return;
        await approveRequestForStudent({
          request,
          studentId: existingStudent.id,
          successMessage: 'تم اشتراك الحساب الموجود بنجاح.',
        });
        return;
      }
      await ensureTeachersLoaded();
      setAccountModal({
        request,
        fullName: request.student_name ?? '',
        phone: normalizeStudentPhone(request.student_phone),
        password: generatePassword(9),
        teacherId: '',
        gender: request.gender ?? '',
        country: request.country ?? '',
        birthDate: request.birth_date ?? '',
        error: '',
        saving: false,
      });
    } catch (err) {
      console.error(err);
      alert(`تعذر تجهيز عملية إنشاء الحساب: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleAccountField = (field, value) => {
    setAccountModal((prev) => prev ? { ...prev, [field]: value, error: '' } : prev);
  };

  const closeAccountModal = () => setAccountModal(null);

  const handleCreateAccountAndApprove = async (event) => {
    event.preventDefault();
    if (!accountModal?.request) return;

    const trimmedName = accountModal.fullName.trim();
    const normalizedPhone = normalizeStudentPhone(accountModal.phone);

    if (trimmedName.length < 2) {
      setAccountModal((prev) => prev ? { ...prev, error: 'الاسم الكامل يجب أن يحتوي على حرفين على الأقل.' } : prev);
      return;
    }
    if (!isValidStudentPhone(accountModal.phone)) {
      setAccountModal((prev) => prev ? { ...prev, error: 'رقم الهاتف يجب أن يتكوّن من 10 إلى 15 رقماً.' } : prev);
      return;
    }
    if (accountModal.password.length < 6 || accountModal.password.length > 10) {
      setAccountModal((prev) => prev ? { ...prev, error: 'كلمة المرور يجب أن تكون بين 6 و10 خانات.' } : prev);
      return;
    }

    setAccountModal((prev) => ({ ...prev, saving: true, error: '' }));
    let createdPassword = null;

    try {
      let targetStudent = await fetchStudentByPhone(normalizedPhone);
      if (!targetStudent) {
        try {
          const createdUser = await adminCreateStudent({
            fullName: trimmedName,
            phone: normalizedPhone,
            password: accountModal.password,
            teacherId: accountModal.teacherId || null,
            gender: accountModal.gender || null,
            country: accountModal.country || null,
            birthDate: accountModal.birthDate || null,
          });
          targetStudent = { id: createdUser.id, full_name: trimmedName, phone: normalizedPhone };
          createdPassword = accountModal.password;
        } catch (createError) {
          if (
            createError.message?.includes('already exists') ||
            createError.message?.includes('already registered') ||
            createError.message?.includes('مسجل بالفعل')
          ) {
            targetStudent = await fetchStudentByPhone(normalizedPhone);
          }
          if (!targetStudent) throw createError;
        }
      }

      await approveRequestForStudent({
        request: accountModal.request,
        studentId: targetStudent.id,
        successMessage: createdPassword
          ? `تم إنشاء حساب الطالب والاشتراك في المسابقة بنجاح. كلمة المرور: ${createdPassword}`
          : 'تم اشتراك الحساب الموجود في المسابقة بنجاح.',
      });
      closeAccountModal();
    } catch (err) {
      console.error(err);
      setAccountModal((prev) => prev ? {
        ...prev,
        saving: false,
        error: createdPassword
          ? `تم إنشاء الحساب، لكن تعذر إكمال الاعتماد: ${err.message}`
          : (err.message ?? 'حدث خطأ أثناء إنشاء الحساب.'),
      } : prev);
    }
  };

  // ── Stage Action Handlers ──
  const handleMoveToNextStage = async (assignment) => {
    const nextStage = getNextStage(assignment.current_stage_id);
    if (!nextStage) return;

    const studentName = assignment.student_profiles?.full_name || 'الطالب';
    if (!window.confirm(`هل تريد نقل ${studentName} إلى ${nextStage.name}؟`)) return;

    setProcessingId(assignment.id);
    try {
      await moveStudentToNextStage(assignment.student_id, competition.id, nextStage.id);
      await loadData();
    } catch (err) {
      console.error(err);
      alert(`فشل نقل الطالب: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkFailed = async (assignment) => {
    const studentName = assignment.student_profiles?.full_name || 'الطالب';
    const stageName =
      stages.find((s) => s.id === assignment.current_stage_id)?.name || 'هذه المرحلة';
    if (!window.confirm(`هل أنت متأكد أن ${studentName} لم يجتاز ${stageName}؟ يمكنك التراجع عن ذلك لاحقاً من زر "تعديل الحالة".`)) return;

    setProcessingId(assignment.id);
    try {
      await markStudentFailed(assignment.student_id, competition.id);
      await loadData();
    } catch (err) {
      console.error(err);
      alert(`فشل تحديث حالة الطالب: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkCompleted = async (assignment) => {
    const studentName = assignment.student_profiles?.full_name || 'الطالب';
    if (!window.confirm(`هل تريد تأكيد أن ${studentName} اجتاز المسابقة بنجاح؟`)) return;

    setProcessingId(assignment.id);
    try {
      await markStudentCompleted(assignment.student_id, competition.id);
      await loadData();
    } catch (err) {
      console.error(err);
      alert(`فشل تحديث حالة الطالب: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleUpdateLevel = async (assignment, newLevel) => {
    if (!newLevel || newLevel === assignment.level) return;
    try {
      await updateStudentLevel(assignment.student_id, competition.id, newLevel);
      setAssignments((prev) =>
        prev.map((a) => (a.id === assignment.id ? { ...a, level: newLevel } : a))
      );
    } catch (err) {
      console.error(err);
      alert(`فشل تعديل المستوى: ${err.message}`);
    }
  };

  // ── Undo / Correction Handlers ──
  // Ranks are stored per completed student, so pulling one out of the results
  // list would leave a gap (1, 3, 4…). Re-number whoever is left behind.
  const renumberRemainingRanks = async (removedStudentId) => {
    const remaining = rankedStudents.filter((a) => a.student_id !== removedStudentId);
    if (remaining.length === 0) return;
    await bulkUpdateFinalRanks(
      competition.id,
      remaining.map((a) => ({ student_id: a.student_id }))
    );
  };

  const openAssignmentModal = (assignment) => {
    setAssignmentModal({
      assignment,
      stageId: assignment.current_stage_id,
      status: assignment.status,
      error: '',
      saving: false,
    });
  };

  const closeAssignmentModal = () => setAssignmentModal(null);

  const handleAssignmentField = (field, value) => {
    setAssignmentModal((prev) => (prev ? { ...prev, [field]: value, error: '' } : prev));
  };

  const applyAssignmentChange = async ({ assignment, stageId, status }) => {
    const stageChanged = stageId !== undefined && stageId !== assignment.current_stage_id;
    const statusChanged = status !== undefined && status !== assignment.status;

    if (!stageChanged && !statusChanged) {
      return { changed: false };
    }

    await updateStudentAssignment(assignment.student_id, competition.id, {
      ...(stageChanged ? { stageId } : {}),
      ...(statusChanged ? { status } : {}),
    });

    // Leaving the completed list frees up a rank position.
    if (assignment.status === 'completed' && statusChanged) {
      await renumberRemainingRanks(assignment.student_id);
    }

    await loadData();
    return { changed: true };
  };

  const handleSaveAssignment = async (event) => {
    event.preventDefault();
    if (!assignmentModal) return;

    const { assignment, stageId, status } = assignmentModal;

    if (!stageId) {
      handleAssignmentField('error', 'يجب تحديد المرحلة.');
      return;
    }

    setAssignmentModal((prev) => (prev ? { ...prev, saving: true, error: '' } : prev));

    try {
      const { changed } = await applyAssignmentChange({ assignment, stageId, status });
      if (!changed) {
        handleAssignmentField('error', 'لم تقم بتغيير أي شيء.');
        setAssignmentModal((prev) => (prev ? { ...prev, saving: false } : prev));
        return;
      }
      closeAssignmentModal();
    } catch (err) {
      console.error(err);
      setAssignmentModal((prev) =>
        prev ? { ...prev, saving: false, error: err.message ?? 'فشل تحديث حالة الطالب.' } : prev
      );
    }
  };

  // One-click undo for the two mistakes admins make most often.
  const handleQuickRestoreToActive = async (assignment) => {
    const studentName = assignment.student_profiles?.full_name || 'الطالب';
    const stageName =
      stages.find((s) => s.id === assignment.current_stage_id)?.name || 'المرحلة الحالية';
    const question =
      assignment.status === 'completed'
        ? `هل تريد التراجع عن اجتياز ${studentName} للمسابقة وإعادته كمشارك في ${stageName}؟ سيتم حذف ترتيبه النهائي.`
        : `هل تريد التراجع وإعادة ${studentName} كمشارك في ${stageName}؟`;

    if (!window.confirm(question)) return;

    setProcessingId(assignment.id);
    try {
      await applyAssignmentChange({ assignment, status: 'active' });
    } catch (err) {
      console.error(err);
      alert(`فشل التراجع عن حالة الطالب: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleMoveToPreviousStage = async (assignment) => {
    const previousStage = getPreviousStage(assignment.current_stage_id);
    if (!previousStage) return;

    const studentName = assignment.student_profiles?.full_name || 'الطالب';
    if (!window.confirm(`هل تريد إرجاع ${studentName} إلى ${previousStage.name}؟`)) return;

    setProcessingId(assignment.id);
    try {
      await applyAssignmentChange({
        assignment,
        stageId: previousStage.id,
        status: 'active',
      });
    } catch (err) {
      console.error(err);
      alert(`فشل إرجاع الطالب: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  // ── Drag and Drop for Rankings ──
  const handleDragStart = (index) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) return;

    const items = [...rankedStudents];
    const draggedItem = items.splice(dragItem.current, 1)[0];
    items.splice(dragOverItem.current, 0, draggedItem);

    dragItem.current = null;
    dragOverItem.current = null;

    setRankedStudents(items);
    setRanksChanged(true);
  };

  const handleSaveRanks = async () => {
    setSavingRanks(true);
    try {
      await bulkUpdateFinalRanks(
        competition.id,
        rankedStudents.map((s) => ({ student_id: s.student_id }))
      );
      setRanksChanged(false);
      alert('تم حفظ الترتيب بنجاح.');
      await loadData();
    } catch (err) {
      console.error(err);
      alert(`فشل حفظ الترتيب: ${err.message}`);
    } finally {
      setSavingRanks(false);
    }
  };

  // ── Rank display helper ──
  function getRankLabel(rank) {
    if (rank === 1) return '🥇 المركز الأول';
    if (rank === 2) return '🥈 المركز الثاني';
    if (rank === 3) return '🥉 المركز الثالث';
    return `المركز ${rank}`;
  }

  // ── Determine tabs ──
  const hasStages = stages.length > 0;
  const tabs = [
    { id: 'requests', label: 'طلبات الاشتراك', count: requests.length, icon: FileText },
    ...(hasStages
      ? stages.map((stage) => ({
          id: `stage-${stage.id}`,
          label: stage.name,
          count: getStudentsForStage(stage.id).length,
          icon: Users,
          stageId: stage.id,
        }))
      : [{
          id: 'subscribers',
          label: 'المشتركون المعتمدون',
          count: subscribers.length,
          icon: Users,
        }]),
    ...(hasStages
      ? [{ id: 'results', label: 'النتائج / الترتيب', count: rankedStudents.length, icon: Trophy }]
      : []),
  ];

  if (loading) {
    return (
      <div className="admin-page">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 0' }}>
          <Loader size={36} className="admin-spin" style={{ color: 'var(--admin-accent)', marginBottom: '1rem' }} />
          <span className="admin-muted">جاري تحميل بيانات المسابقة...</span>
        </div>
      </div>
    );
  }

  if (error || !competition) {
    return (
      <div className="admin-page">
        <div className="admin-error-banner">{error || 'المسابقة غير موجودة.'}</div>
        <button className="admin-btn admin-btn--ghost" onClick={() => navigate('/admin/quran/competitions')} style={{ marginTop: '1rem' }}>
          <ArrowRight size={16} /> العودة للمسابقات
        </button>
      </div>
    );
  }

  return (
    <div className="admin-page">
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          className="admin-btn admin-btn--ghost"
          onClick={() => navigate('/admin/quran/competitions')}
          style={{ marginBottom: '0.75rem', fontSize: '0.85rem' }}
        >
          <ArrowRight size={14} /> العودة للمسابقات
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Trophy size={22} className="text-amber-500" />
          <h1 className="admin-page-title" style={{ margin: 0 }}>{competition.name}</h1>
          <span className="admin-muted" style={{ fontSize: '0.8rem' }}>({competition.slug})</span>
        </div>
      </div>

      {/* Level Filter */}
      {allLevels.length > 0 && (
        <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={16} className="admin-muted" />
          <select
            className="admin-input admin-select"
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            style={{ maxWidth: '280px', fontSize: '0.85rem' }}
          >
            <option value="">كل المستويات</option>
            {allLevels.map((level) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </div>
      )}

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid var(--admin-border)',
        background: 'var(--admin-bg)',
        overflowX: 'auto',
        gap: 0,
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.75rem 1.25rem',
              border: 'none',
              background: activeTab === tab.id ? 'var(--admin-bg-light)' : 'transparent',
              borderBottom: activeTab === tab.id ? '2px solid var(--admin-accent)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--admin-accent)' : 'var(--admin-text-muted)',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              whiteSpace: 'nowrap',
              fontSize: '0.85rem',
              marginBottom: '-2px',
            }}
          >
            <tab.icon size={15} />
            <span>{tab.label}</span>
            <span style={{
              background: activeTab === tab.id ? 'var(--admin-accent)' : 'var(--admin-border)',
              color: activeTab === tab.id ? '#fff' : 'var(--admin-text-muted)',
              borderRadius: '10px',
              padding: '0.1rem 0.5rem',
              fontSize: '0.7rem',
              fontWeight: 'bold',
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ padding: '1.5rem 0' }}>
        {/* ──── Requests Tab ──── */}
        {activeTab === 'requests' && (
          <>
            {filterByLevel(requests).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--admin-text-muted)' }}>
                <FileText size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <p>{levelFilter ? 'لا توجد طلبات معلقة لهذا المستوى.' : 'لا توجد طلبات معلقة لهذه المسابقة.'}</p>
              </div>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>مقدم الطلب</th>
                      <th>الدولة / الجنس / العمر</th>
                      <th>المستوى</th>
                      <th>الحساب</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filterByLevel(requests).map((request) => {
                      const isLinkedStudent = Boolean(request.student_id);
                      const isBusy = processingId === request.id;
                      const requestAge = calcAgeInYears(request.birth_date);
                      const requestGender = getGenderLabel(request.gender);

                      return (
                        <tr key={request.id}>
                          <td>
                            <div>
                              <strong style={{ display: 'block' }}>{request.student_name}</strong>
                              <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }} dir="ltr">
                                {request.student_phone}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', fontSize: '0.8rem' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                <MapPin size={11} className="text-amber-500" /> {getCountryName(request.country)}
                              </span>
                              {requestGender && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <Users size={11} className="text-amber-500" /> {requestGender}
                                </span>
                              )}
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Calendar size={11} className="text-amber-500" />{' '}
                                {requestAge !== null ? `${requestAge} سنة` : '—'}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{request.level}</span>
                          </td>
                          <td>
                            {isLinkedStudent ? (
                              <span className="admin-badge admin-badge--published" style={{ fontSize: '0.7rem' }}>
                                طالب مسجّل
                              </span>
                            ) : (
                              <span className="admin-badge admin-badge--draft" style={{ fontSize: '0.7rem' }}>
                                طلب زائر
                              </span>
                            )}
                          </td>
                          <td>
                            <div className="admin-row-actions" style={{ gap: '0.4rem', flexWrap: 'wrap' }}>
                              {isLinkedStudent ? (
                                <button
                                  className="admin-btn admin-btn--primary admin-btn--sm"
                                  onClick={() => handleApproveLinkedStudent(request)}
                                  disabled={processingId !== null}
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                                  title="اعتماد الطلب"
                                >
                                  {isBusy ? <Loader size={12} className="admin-spin" /> : null}
                                  اعتماد
                                </button>
                              ) : (
                                <button
                                  className="admin-btn admin-btn--primary admin-btn--sm"
                                  onClick={() => handlePrepareGuestApproval(request)}
                                  disabled={processingId !== null}
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                                  title="إنشاء حساب طالب ثم اعتماد الاشتراك"
                                >
                                  {isBusy ? <Loader size={12} className="admin-spin" /> : <UserPlus size={12} />}
                                  إنشاء حساب + اعتماد
                                </button>
                              )}
                              <button
                                className="admin-btn admin-btn--sm"
                                onClick={() => handleRejectRequest(request)}
                                disabled={processingId !== null}
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', background: 'var(--admin-bg-light)', color: '#dc2626', border: '1px solid #fecaca' }}
                                title="رفض الطلب"
                              >
                                <XCircle size={12} />
                                رفض
                              </button>
                              <button
                                className="admin-icon-btn admin-icon-btn--delete"
                                onClick={() => handleDeleteRequest(request.id)}
                                disabled={processingId !== null}
                                title="حذف الطلب نهائياً"
                                aria-label="حذف"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ──── Subscribers Tab (no stages) ──── */}
        {activeTab === 'subscribers' && !hasStages && (
          <>
            {subscribers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--admin-text-muted)' }}>
                <Users size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <p>لا يوجد طلاب مشتركون معتمدون حتى الآن.</p>
              </div>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>الاسم</th>
                      <th>رقم الهاتف</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscribers.map((sub) => (
                      <tr key={sub.id}>
                        <td><strong>{sub.student_profiles?.full_name || 'طالب غير معروف'}</strong></td>
                        <td dir="ltr" style={{ textAlign: 'right' }}>{sub.student_profiles?.phone || '—'}</td>
                        <td>
                          <span className="admin-badge admin-badge--published" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <CheckCircle size={10} /> نشط
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ──── Stage Tabs ──── */}
        {hasStages && stages.map((stage) => {
          if (activeTab !== `stage-${stage.id}`) return null;

          const stageStudents = getStudentsForStage(stage.id);
          const failedStudents = getFailedForStage(stage.id);
          const isLast = isLastStage(stage.id);
          const nextStage = getNextStage(stage.id);
          const previousStage = getPreviousStage(stage.id);

          return (
            <div key={stage.id}>
              {/* Stage info header */}
              {stage.description && (
                <div style={{
                  padding: '0.75rem 1rem',
                  marginBottom: '1rem',
                  background: 'var(--admin-bg-light)',
                  borderRadius: 'var(--admin-radius)',
                  border: '1px solid var(--admin-border)',
                  fontSize: '0.85rem',
                  color: 'var(--admin-text-muted)',
                }}>
                  {stage.description}
                  {stage.deadline && (
                    <span style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.8rem' }}>
                      <Clock size={12} style={{ verticalAlign: 'middle', marginLeft: '0.25rem' }} />
                      الموعد النهائي: {new Date(stage.deadline).toLocaleDateString('ar-EG')}
                    </span>
                  )}
                </div>
              )}

              {stageStudents.length === 0 && failedStudents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--admin-text-muted)' }}>
                  <Users size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                  <p>لا يوجد طلاب في هذه المرحلة حالياً.</p>
                </div>
              ) : (
                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>الاسم</th>
                        <th>الرقم</th>
                        <th>المستوى</th>
                        <th>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stageStudents.map((assignment) => {
                        const isBusy = processingId === assignment.id;
                        return (
                          <tr key={assignment.id}>
                            <td><strong>{assignment.student_profiles?.full_name || 'طالب غير معروف'}</strong></td>
                            <td dir="ltr" style={{ textAlign: 'right' }}>{assignment.student_profiles?.phone || '—'}</td>
                            <td>
                              {Array.isArray(competition?.available_levels) && competition.available_levels.length > 0 ? (
                                <select
                                  className="admin-input admin-select"
                                  style={{ padding: '0.2rem 0.4rem', fontSize: '0.8rem', maxWidth: '160px' }}
                                  value={assignment.level || ''}
                                  onChange={(e) => handleUpdateLevel(assignment, e.target.value)}
                                  title="تغيير مستوى الطالب"
                                >
                                  {!assignment.level && <option value="">--تحديد المستوى--</option>}
                                  {competition.available_levels.map((lvl) => (
                                    <option key={lvl} value={lvl}>{lvl}</option>
                                  ))}
                                  {assignment.level && !competition.available_levels.includes(assignment.level) && (
                                    <option value={assignment.level}>{assignment.level}</option>
                                  )}
                                </select>
                              ) : (
                                <button
                                  type="button"
                                  className="admin-btn admin-btn--ghost admin-btn--sm"
                                  style={{ padding: '0.15rem 0.4rem', fontSize: '0.8rem', fontWeight: 'bold' }}
                                  onClick={() => {
                                    const val = window.prompt('أدخل المستوى الجديد للطالب:', assignment.level || '');
                                    if (val !== null && val.trim() !== '') {
                                      handleUpdateLevel(assignment, val.trim());
                                    }
                                  }}
                                  title="انقر لتعديل المستوى"
                                >
                                  {assignment.level || 'تحديد المستوى'}
                                </button>
                              )}
                            </td>
                            <td>
                              <div className="admin-row-actions" style={{ gap: '0.4rem', flexWrap: 'wrap' }}>
                                {isLast ? (
                                  <button
                                    className="admin-btn admin-btn--primary admin-btn--sm"
                                    onClick={() => handleMarkCompleted(assignment)}
                                    disabled={processingId !== null}
                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                                    title="اجتاز المسابقة بنجاح"
                                  >
                                    {isBusy ? <Loader size={12} className="admin-spin" /> : <Trophy size={12} />}
                                    اجتاز المسابقة
                                  </button>
                                ) : (
                                  <button
                                    className="admin-btn admin-btn--primary admin-btn--sm"
                                    onClick={() => handleMoveToNextStage(assignment)}
                                    disabled={processingId !== null}
                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                                    title={`نقل إلى ${nextStage?.name || 'المرحلة التالية'}`}
                                  >
                                    {isBusy ? <Loader size={12} className="admin-spin" /> : <ArrowLeftRight size={12} />}
                                    نقل للمرحلة التالية
                                  </button>
                                )}
                                <button
                                  className="admin-btn admin-btn--sm"
                                  onClick={() => handleMarkFailed(assignment)}
                                  disabled={processingId !== null}
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', background: 'var(--admin-bg-light)', color: '#dc2626', border: '1px solid #fecaca' }}
                                  title="لم يجتاز هذه المرحلة"
                                >
                                  <XCircle size={12} />
                                  لم يجتاز
                                </button>
                                {previousStage && (
                                  <button
                                    className="admin-btn admin-btn--ghost admin-btn--sm"
                                    onClick={() => handleMoveToPreviousStage(assignment)}
                                    disabled={processingId !== null}
                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                                    title={`إرجاع إلى ${previousStage.name}`}
                                  >
                                    {isBusy ? <Loader size={12} className="admin-spin" /> : <RotateCcw size={12} />}
                                    إرجاع للمرحلة السابقة
                                  </button>
                                )}
                                <button
                                  className="admin-icon-btn"
                                  onClick={() => openAssignmentModal(assignment)}
                                  disabled={processingId !== null}
                                  title="تعديل الحالة أو نقل الطالب إلى أي مرحلة"
                                  aria-label="تعديل الحالة والمرحلة"
                                >
                                  <SlidersHorizontal size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {/* Failed students: greyed out, but still correctable */}
                      {failedStudents.map((assignment) => {
                        const isBusy = processingId === assignment.id;
                        return (
                          <tr key={assignment.id}>
                            <td style={{ opacity: 0.5 }}><strong>{assignment.student_profiles?.full_name || 'طالب غير معروف'}</strong></td>
                            <td dir="ltr" style={{ textAlign: 'right', opacity: 0.5 }}>{assignment.student_profiles?.phone || '—'}</td>
                            <td style={{ opacity: 0.5 }}><span style={{ fontSize: '0.85rem' }}>{assignment.level || '—'}</span></td>
                            <td>
                              <div className="admin-row-actions" style={{ gap: '0.4rem', flexWrap: 'wrap' }}>
                                <span className="admin-badge" style={{ fontSize: '0.7rem', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                                  <XCircle size={10} /> لم يجتاز
                                </span>
                                <button
                                  className="admin-btn admin-btn--ghost admin-btn--sm"
                                  onClick={() => handleQuickRestoreToActive(assignment)}
                                  disabled={processingId !== null}
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                                  title="التراجع وإعادة الطالب كمشارك في هذه المرحلة"
                                >
                                  {isBusy ? <Loader size={12} className="admin-spin" /> : <RotateCcw size={12} />}
                                  تراجع
                                </button>
                                <button
                                  className="admin-icon-btn"
                                  onClick={() => openAssignmentModal(assignment)}
                                  disabled={processingId !== null}
                                  title="تعديل الحالة أو نقل الطالب إلى أي مرحلة"
                                  aria-label="تعديل الحالة والمرحلة"
                                >
                                  <SlidersHorizontal size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}

        {/* ──── Results Tab ──── */}
        {activeTab === 'results' && hasStages && (
          <>
            {rankedStudents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--admin-text-muted)' }}>
                <Trophy size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <p>لا يوجد طلاب اجتازوا المسابقة بعد.</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
                    اسحب وأفلت الصفوف لتغيير ترتيب الطلاب
                  </p>
                  <button
                    className="admin-btn admin-btn--primary admin-btn--sm"
                    onClick={handleSaveRanks}
                    disabled={savingRanks || !ranksChanged}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    {savingRanks ? <Loader size={14} className="admin-spin" /> : <Save size={14} />}
                    {savingRanks ? 'جاري الحفظ...' : 'حفظ الترتيب'}
                  </button>
                </div>

                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}></th>
                        <th>الترتيب</th>
                        <th>الاسم</th>
                        <th>الرقم</th>
                        <th>المستوى</th>
                        <th>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filterByLevel(rankedStudents).map((assignment, index) => (
                        <tr
                          key={assignment.id}
                          draggable
                          onDragStart={() => handleDragStart(index)}
                          onDragEnter={() => handleDragEnter(index)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => e.preventDefault()}
                          style={{ cursor: 'grab' }}
                        >
                          <td style={{ textAlign: 'center' }}>
                            <GripVertical size={16} className="admin-muted" />
                          </td>
                          <td>
                            <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                              {getRankLabel(index + 1)}
                            </span>
                          </td>
                          <td><strong>{assignment.student_profiles?.full_name || 'طالب غير معروف'}</strong></td>
                          <td dir="ltr" style={{ textAlign: 'right' }}>{assignment.student_profiles?.phone || '—'}</td>
                          <td><span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{assignment.level || '—'}</span></td>
                          <td>
                            <div className="admin-row-actions" style={{ gap: '0.4rem', flexWrap: 'wrap' }}>
                              <button
                                className="admin-btn admin-btn--ghost admin-btn--sm"
                                onClick={() => handleQuickRestoreToActive(assignment)}
                                disabled={processingId !== null}
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                                title="التراجع عن اجتياز المسابقة وإعادة الطالب كمشارك"
                              >
                                {processingId === assignment.id ? <Loader size={12} className="admin-spin" /> : <RotateCcw size={12} />}
                                تراجع
                              </button>
                              <button
                                className="admin-icon-btn"
                                onClick={() => openAssignmentModal(assignment)}
                                disabled={processingId !== null}
                                title="تعديل الحالة أو نقل الطالب إلى أي مرحلة"
                                aria-label="تعديل الحالة والمرحلة"
                              >
                                <SlidersHorizontal size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* ──── Undo / Correct Assignment Modal ──── */}
      {assignmentModal && (
        <div
          className="admin-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="تعديل حالة الطالب ومرحلته"
          onClick={(event) => {
            if (event.target === event.currentTarget && !assignmentModal.saving) {
              closeAssignmentModal();
            }
          }}
        >
          <div className="admin-modal" style={{ maxWidth: '520px' }}>
            <div className="admin-modal-header">
              <div>
                <h2 className="admin-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <SlidersHorizontal size={18} />
                  <span>تعديل حالة الطالب ومرحلته</span>
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', marginTop: '0.25rem' }}>
                  {assignmentModal.assignment.student_profiles?.full_name || 'طالب غير معروف'}
                  {' — '}
                  الحالة الحالية: {getAssignmentStatusLabel(assignmentModal.assignment.status)}
                  {' في '}
                  {stages.find((s) => s.id === assignmentModal.assignment.current_stage_id)?.name || 'مرحلة غير معروفة'}
                </p>
              </div>
              <button
                className="admin-modal-close"
                onClick={closeAssignmentModal}
                disabled={assignmentModal.saving}
                aria-label="إغلاق"
              >
                <XCircle size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveAssignment} className="admin-modal-body" style={{ display: 'grid', gap: '1rem' }}>
              <div className="admin-field-group">
                <label htmlFor="csp-assignment-stage" className="admin-label">المرحلة</label>
                <select
                  id="csp-assignment-stage"
                  className="admin-input admin-select"
                  value={assignmentModal.stageId}
                  onChange={(event) => handleAssignmentField('stageId', event.target.value)}
                  disabled={assignmentModal.saving}
                >
                  {stages.map((stage, index) => (
                    <option key={stage.id} value={stage.id}>
                      {index + 1}. {stage.name}
                    </option>
                  ))}
                </select>
                <p style={{ fontSize: '0.75rem', color: 'var(--admin-muted)', marginTop: '0.2rem' }}>
                  يمكنك نقل الطالب إلى أي مرحلة، سابقة أو لاحقة.
                </p>
              </div>

              <div className="admin-field-group">
                <span className="admin-label">الحالة</span>
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {ASSIGNMENT_STATUS_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.5rem',
                        padding: '0.6rem 0.75rem',
                        borderRadius: 'var(--admin-radius)',
                        border: `1px solid ${assignmentModal.status === option.value ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
                        background: assignmentModal.status === option.value ? 'var(--admin-bg-light)' : 'transparent',
                        cursor: assignmentModal.saving ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="csp-assignment-status"
                        value={option.value}
                        checked={assignmentModal.status === option.value}
                        onChange={() => handleAssignmentField('status', option.value)}
                        disabled={assignmentModal.saving}
                        style={{ marginTop: '0.2rem' }}
                      />
                      <span>
                        <strong style={{ fontSize: '0.85rem' }}>{option.label}</strong>
                        <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>
                          {option.hint}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              {assignmentModal.assignment.status === 'completed' && assignmentModal.status !== 'completed' && (
                <div
                  role="note"
                  style={{
                    fontSize: '0.78rem',
                    padding: '0.6rem 0.75rem',
                    borderRadius: 'var(--admin-radius)',
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                    color: '#92400e',
                  }}
                >
                  سيتم حذف الترتيب النهائي لهذا الطالب وإعادة ترقيم بقية الفائزين تلقائياً.
                </div>
              )}

              {assignmentModal.error && (
                <div className="admin-error-banner" role="alert">
                  {assignmentModal.error}
                </div>
              )}

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn--ghost"
                  onClick={closeAssignmentModal}
                  disabled={assignmentModal.saving}
                >
                  إلغاء
                </button>
                <button type="submit" className="admin-btn admin-btn--primary" disabled={assignmentModal.saving}>
                  {assignmentModal.saving ? <Loader size={16} className="admin-spin" /> : <Save size={16} />}
                  {assignmentModal.saving ? 'جارٍ الحفظ...' : 'حفظ التعديل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──── Guest Account Creation Modal ──── */}
      {accountModal && (
        <div
          className="admin-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="إنشاء حساب طالب"
          onClick={(event) => {
            if (event.target === event.currentTarget && !accountModal.saving) {
              closeAccountModal();
            }
          }}
        >
          <div className="admin-modal" style={{ maxWidth: '560px' }}>
            <div className="admin-modal-header">
              <div>
                <h2 className="admin-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <UserPlus size={18} />
                  <span>إنشاء حساب طالب واعتماد الطلب</span>
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', marginTop: '0.25rem' }}>
                  سيتم إنشاء الحساب أولاً، ثم اشتراكه تلقائياً في هذه المسابقة.
                </p>
              </div>
              <button className="admin-modal-close" onClick={closeAccountModal} disabled={accountModal.saving} aria-label="إغلاق">
                <XCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateAccountAndApprove} className="admin-modal-body" style={{ display: 'grid', gap: '1rem' }}>
              <div className="admin-card" style={{ padding: '1rem', border: '1px solid var(--admin-border)', borderRadius: 'var(--admin-radius)', background: 'var(--admin-bg-light)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--admin-text)', marginBottom: '0.35rem' }}>ملخص الطلب المعلق</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', lineHeight: 1.8 }}>
                  <div><strong>الاسم:</strong> {accountModal.request.student_name}</div>
                  <div><strong>رقم الهاتف:</strong> <span dir="ltr">{accountModal.request.student_phone}</span></div>
                  <div><strong>الدولة:</strong> {getCountryName(accountModal.request.country)}</div>
                  <div><strong>الجنس:</strong> {getGenderLabel(accountModal.request.gender) ?? '—'}</div>
                  <div>
                    <strong>تاريخ الميلاد:</strong>{' '}
                    {accountModal.request.birth_date
                      ? new Date(accountModal.request.birth_date).toLocaleDateString('ar-EG')
                      : '—'}
                  </div>
                  <div><strong>المستوى:</strong> {accountModal.request.level}</div>
                </div>
              </div>

              <div className="admin-field-group">
                <label htmlFor="csp-fullname" className="admin-label">الاسم الكامل *</label>
                <input id="csp-fullname" type="text" required className="admin-input" value={accountModal.fullName} onChange={(e) => handleAccountField('fullName', e.target.value)} disabled={accountModal.saving} />
              </div>

              <div className="admin-field-group">
                <label htmlFor="csp-phone" className="admin-label">رقم الهاتف *</label>
                <input id="csp-phone" type="tel" required className="admin-input" dir="ltr" value={accountModal.phone} onChange={(e) => handleAccountField('phone', e.target.value)} disabled={accountModal.saving} />
              </div>

              <div className="admin-field-group">
                <label htmlFor="csp-password" className="admin-label">كلمة المرور *</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input id="csp-password" type="text" required className="admin-input" dir="ltr" value={accountModal.password} onChange={(e) => handleAccountField('password', e.target.value)} disabled={accountModal.saving} />
                  <button type="button" className="admin-btn admin-btn--ghost" onClick={() => handleAccountField('password', generatePassword(9))} disabled={accountModal.saving} style={{ whiteSpace: 'nowrap' }}>
                    <RefreshCw size={14} /> توليد جديد
                  </button>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--admin-muted)', marginTop: '0.2rem' }}>سلّم كلمة المرور هذه للطالب بعد الاعتماد.</p>
              </div>

              <div className="admin-field-group">
                <label htmlFor="csp-teacher" className="admin-label">المعلم المتابع (اختياري)</label>
                <select id="csp-teacher" className="admin-input admin-select" value={accountModal.teacherId} onChange={(e) => handleAccountField('teacherId', e.target.value)} disabled={accountModal.saving || loadingTeachers}>
                  <option value="">--بدون معلم</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>{teacher.name} ({teacher.gender === 'male' ? 'معلم' : 'معلمة'})</option>
                  ))}
                </select>
                {loadingTeachers && <p style={{ fontSize: '0.75rem', color: 'var(--admin-muted)' }}>جاري تحميل المعلمين...</p>}
              </div>

              {accountModal.error && (
                <div className="admin-error-banner" role="alert" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <KeyRound size={14} />
                  <span>{accountModal.error}</span>
                </div>
              )}

              <div className="admin-modal-actions">
                <button type="button" className="admin-btn admin-btn--ghost" onClick={closeAccountModal} disabled={accountModal.saving}>إلغاء</button>
                <button type="submit" className="admin-btn admin-btn--primary" disabled={accountModal.saving}>
                  {accountModal.saving ? <Loader size={16} className="admin-spin" /> : <UserPlus size={16} />}
                  {accountModal.saving ? 'جارٍ إنشاء الحساب واعتماد الطلب...' : 'إنشاء حساب + اعتماد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
