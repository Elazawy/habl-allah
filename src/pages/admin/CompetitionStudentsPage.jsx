import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Loader,
  Users,
  FileText,
  CheckCircle,
  Clock,
  Trash2,
  Trophy,
  XCircle,
  ArrowLeftRight,
  Filter,
  GripVertical,
  Save,
  RotateCcw,
  SlidersHorizontal,
  UserCheck,
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
  fetchGuestParticipants,
  acceptGuestParticipant,
  rejectGuestParticipant,
  deleteGuestParticipant,
  moveGuestParticipantToNextStage,
  markGuestParticipantFailed,
  markGuestParticipantCompleted,
  updateGuestParticipantAssignment,
  updateGuestParticipantLevel,
  bulkUpdateGuestFinalRanks,
  normalizeStudentParticipant,
  normalizeGuestParticipant,
} from '../../services/competitionsService';

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

const ASSIGNMENT_STATUS_OPTIONS = [
  { value: 'active', label: 'مشارك في المرحلة', hint: 'المشارك ما زال في المسابقة ويتابع المرحلة المحددة.' },
  { value: 'failed', label: 'لم يجتاز المرحلة', hint: 'المشارك خرج من المسابقة عند المرحلة المحددة.' },
  { value: 'completed', label: 'اجتاز المسابقة', hint: 'المشارك أكمل المسابقة ويظهر في تبويب النتائج والترتيب.' },
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
  const [guestParticipants, setGuestParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('requests');
  const [processingId, setProcessingId] = useState(null);
  const [levelFilter, setLevelFilter] = useState('');
  const [assignmentModal, setAssignmentModal] = useState(null);

  // Drag-and-drop state for results tab
  const [rankedParticipants, setRankedParticipants] = useState([]);
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

      const [
        stagesData,
        requestsData,
        assignmentsData,
        subscribersData,
        guestParticipantsData,
      ] = await Promise.all([
        fetchCompetitionStages(comp.id),
        fetchPendingRegistrationRequests(comp.id),
        fetchStudentStageAssignments(comp.id),
        fetchSubscribedStudents(comp.id),
        fetchGuestParticipants(comp.id),
      ]);

      setStages(stagesData);
      setRequests(requestsData);
      setAssignments(assignmentsData);
      setSubscribers(subscribersData);
      setGuestParticipants(guestParticipantsData);

      // Initialize ranked participants from completed students and guests
      const completed = [
        ...assignmentsData
          .filter((a) => a.status === 'completed')
          .map(normalizeStudentParticipant),
        ...guestParticipantsData
          .filter((g) => g.status === 'completed')
          .map(normalizeGuestParticipant),
      ].sort((a, b) => (a.finalRank ?? 999) - (b.finalRank ?? 999));
      setRankedParticipants(completed);
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
    // From requests (signed-in + guest)
    requests.forEach((r) => { if (r.level) levels.add(r.level); });
    // From assignments
    assignments.forEach((a) => { if (a.level) levels.add(a.level); });
    // From guest participants
    guestParticipants.forEach((g) => { if (g.level) levels.add(g.level); });
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

  // Unified participant lists for stage tabs (signed-in + guest merged).
  const getParticipantsForStage = (stageId) => {
    const students = assignments
      .filter((a) => a.current_stage_id === stageId && a.status === 'active')
      .map(normalizeStudentParticipant);
    const guests = guestParticipants
      .filter((g) => g.current_stage_id === stageId && g.status === 'active')
      .map(normalizeGuestParticipant);
    return filterByLevel([...students, ...guests]);
  };

  const getFailedForStage = (stageId) => {
    const students = assignments
      .filter((a) => a.current_stage_id === stageId && a.status === 'failed')
      .map(normalizeStudentParticipant);
    const guests = guestParticipants
      .filter((g) => g.current_stage_id === stageId && g.status === 'failed')
      .map(normalizeGuestParticipant);
    return [...students, ...guests];
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

  // ── Signed-in Student Request Handlers ──
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

  // ── Guest Request Handlers (no account creation) ──
  const handleApproveGuestParticipant = async (guest) => {
    if (!window.confirm(`هل تريد اعتماد ${guest.student_name} في هذه المسابقة؟`)) return;

    setProcessingId(guest.id);
    try {
      // Stages get the same first-stage ordering the UI uses; without stages
      // the guest simply becomes `accepted`.
      await acceptGuestParticipant(guest.id, {
        firstStageId: stages.length > 0 ? stages[0].id : null,
      });
      await loadData();
      alert('تم اعتماد طلب الزائر بنجاح.');
    } catch (err) {
      console.error(err);
      alert(`فشل اعتماد طلب الزائر: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectGuestParticipant = async (guest) => {
    if (!window.confirm(`هل أنت متأكد من رفض طلب ${guest.student_name}؟`)) return;
    setProcessingId(guest.id);
    try {
      await rejectGuestParticipant(guest.id);
      await loadData();
    } catch (err) {
      console.error(err);
      alert(`فشل رفض الطلب: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteGuestParticipant = async (guest) => {
    if (!window.confirm('هل أنت متأكد من حذف طلب الزائر نهائياً؟')) return;
    setProcessingId(guest.id);
    try {
      await deleteGuestParticipant(guest.id);
      await loadData();
    } catch (err) {
      console.error(err);
      alert(`فشل حذف الطلب: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  // ── Unified Participant Action Handlers (stage tabs) ──
  const handleMoveToNextStage = async (participant) => {
    const nextStage = getNextStage(participant.currentStageId);
    if (!nextStage) return;

    if (!window.confirm(`هل تريد نقل ${participant.displayName} إلى ${nextStage.name}؟`)) return;

    setProcessingId(participant.id);
    try {
      if (participant.participantType === 'guest') {
        await moveGuestParticipantToNextStage(participant.id, competition.id, nextStage.id);
      } else {
        await moveStudentToNextStage(participant.studentId, competition.id, nextStage.id);
      }
      await loadData();
    } catch (err) {
      console.error(err);
      alert(`فشل نقل المشارك: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkFailed = async (participant) => {
    const stageName =
      stages.find((s) => s.id === participant.currentStageId)?.name || 'هذه المرحلة';
    if (!window.confirm(`هل أنت متأكد أن ${participant.displayName} لم يجتز ${stageName}؟ يمكنك التراجع عن ذلك لاحقاً من زر "تعديل الحالة".`)) return;

    setProcessingId(participant.id);
    try {
      if (participant.participantType === 'guest') {
        await markGuestParticipantFailed(participant.id);
      } else {
        await markStudentFailed(participant.studentId, competition.id);
      }
      await loadData();
    } catch (err) {
      console.error(err);
      alert(`فشل تحديث حالة المشارك: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkCompleted = async (participant) => {
    if (!window.confirm(`هل تريد تأكيد أن ${participant.displayName} اجتاز المسابقة بنجاح؟`)) return;

    setProcessingId(participant.id);
    try {
      if (participant.participantType === 'guest') {
        await markGuestParticipantCompleted(participant.id);
      } else {
        await markStudentCompleted(participant.studentId, competition.id);
      }
      await loadData();
    } catch (err) {
      console.error(err);
      alert(`فشل تحديث حالة المشارك: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleUpdateLevel = async (participant, newLevel) => {
    if (!newLevel || newLevel === participant.level) return;
    try {
      if (participant.participantType === 'guest') {
        await updateGuestParticipantLevel(participant.id, newLevel);
        setGuestParticipants((prev) =>
          prev.map((g) => (g.id === participant.id ? { ...g, level: newLevel } : g))
        );
      } else {
        await updateStudentLevel(participant.studentId, competition.id, newLevel);
        setAssignments((prev) =>
          prev.map((a) => (a.id === participant.id ? { ...a, level: newLevel } : a))
        );
      }
    } catch (err) {
      console.error(err);
      alert(`فشل تعديل المستوى: ${err.message}`);
    }
  };

  // ── Undo / Correction Handlers ──
  // Ranks are stored per completed participant, so pulling one out of the
  // results list would leave a gap (1, 3, 4…). Re-number whoever is left
  // behind, calling the right bulk update for each participant type.
  const renumberRemainingRanks = async (removedParticipant) => {
    const remaining = rankedParticipants.filter(
      (p) => !(p.participantType === removedParticipant.participantType && p.id === removedParticipant.id)
    );
    if (remaining.length === 0) return;

    const rankedStudents = remaining
      .filter((p) => p.participantType === 'student')
      .map((p) => ({ student_id: p.studentId }));
    const rankedGuests = remaining
      .filter((p) => p.participantType === 'guest')
      .map((p) => ({ id: p.id }));

    if (rankedStudents.length > 0) {
      await bulkUpdateFinalRanks(competition.id, rankedStudents);
    }
    if (rankedGuests.length > 0) {
      await bulkUpdateGuestFinalRanks(competition.id, rankedGuests);
    }
  };

  const openAssignmentModal = (participant) => {
    setAssignmentModal({
      participant,
      stageId: participant.currentStageId,
      status: participant.status,
      error: '',
      saving: false,
    });
  };

  const closeAssignmentModal = () => setAssignmentModal(null);

  const handleAssignmentField = (field, value) => {
    setAssignmentModal((prev) => (prev ? { ...prev, [field]: value, error: '' } : prev));
  };

  const applyAssignmentChange = async ({ participant, stageId, status }) => {
    const stageChanged = stageId !== undefined && stageId !== participant.currentStageId;
    const statusChanged = status !== undefined && status !== participant.status;

    if (!stageChanged && !statusChanged) {
      return { changed: false };
    }

    if (participant.participantType === 'guest') {
      await updateGuestParticipantAssignment(participant.id, {
        ...(stageChanged ? { stageId } : {}),
        ...(statusChanged ? { status } : {}),
      });
    } else {
      await updateStudentAssignment(participant.studentId, competition.id, {
        ...(stageChanged ? { stageId } : {}),
        ...(statusChanged ? { status } : {}),
      });
    }

    // Leaving the completed list frees up a rank position.
    if (participant.status === 'completed' && statusChanged) {
      await renumberRemainingRanks(participant);
    }

    await loadData();
    return { changed: true };
  };

  const handleSaveAssignment = async (event) => {
    event.preventDefault();
    if (!assignmentModal) return;

    const { participant, stageId, status } = assignmentModal;

    if (!stageId) {
      handleAssignmentField('error', 'يجب تحديد المرحلة.');
      return;
    }

    setAssignmentModal((prev) => (prev ? { ...prev, saving: true, error: '' } : prev));

    try {
      const { changed } = await applyAssignmentChange({ participant, stageId, status });
      if (!changed) {
        handleAssignmentField('error', 'لم تقم بتغيير أي شيء.');
        setAssignmentModal((prev) => (prev ? { ...prev, saving: false } : prev));
        return;
      }
      closeAssignmentModal();
    } catch (err) {
      console.error(err);
      setAssignmentModal((prev) =>
        prev ? { ...prev, saving: false, error: err.message ?? 'فشل تحديث حالة المشارك.' } : prev
      );
    }
  };

  // One-click undo for the two mistakes admins make most often.
  const handleQuickRestoreToActive = async (participant) => {
    const stageName =
      stages.find((s) => s.id === participant.currentStageId)?.name || 'المرحلة الحالية';
    const question =
      participant.status === 'completed'
        ? `هل تريد التراجع عن اجتياز ${participant.displayName} للمسابقة وإعادته كمشارك في ${stageName}؟ سيتم حذف ترتيبه النهائي.`
        : `هل تريد التراجع وإعادة ${participant.displayName} كمشارك في ${stageName}؟`;

    if (!window.confirm(question)) return;

    setProcessingId(participant.id);
    try {
      await applyAssignmentChange({ participant, status: 'active' });
    } catch (err) {
      console.error(err);
      alert(`فشل التراجع عن حالة المشارك: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleMoveToPreviousStage = async (participant) => {
    const previousStage = getPreviousStage(participant.currentStageId);
    if (!previousStage) return;

    if (!window.confirm(`هل تريد إرجاع ${participant.displayName} إلى ${previousStage.name}؟`)) return;

    setProcessingId(participant.id);
    try {
      await applyAssignmentChange({
        participant,
        stageId: previousStage.id,
        status: 'active',
      });
    } catch (err) {
      console.error(err);
      alert(`فشل إرجاع المشارك: ${err.message}`);
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

    const items = [...rankedParticipants];
    const draggedItem = items.splice(dragItem.current, 1)[0];
    items.splice(dragOverItem.current, 0, draggedItem);

    dragItem.current = null;
    dragOverItem.current = null;

    setRankedParticipants(items);
    setRanksChanged(true);
  };

  const handleSaveRanks = async () => {
    setSavingRanks(true);
    try {
      const rankedStudents = rankedParticipants
        .filter((p) => p.participantType === 'student')
        .map((p) => ({ student_id: p.studentId }));
      const rankedGuests = rankedParticipants
        .filter((p) => p.participantType === 'guest')
        .map((p) => ({ id: p.id }));

      if (rankedStudents.length > 0) {
        await bulkUpdateFinalRanks(competition.id, rankedStudents);
      }
      if (rankedGuests.length > 0) {
        await bulkUpdateGuestFinalRanks(competition.id, rankedGuests);
      }

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

  // ── Participant type badge ──
  function renderParticipantTypeBadge(participantType) {
    if (participantType === 'guest') {
      return (
        <span className="admin-badge admin-badge--draft" style={{ fontSize: '0.7rem' }}>
          <Users size={10} /> زائر
        </span>
      );
    }
    return (
      <span className="admin-badge admin-badge--published" style={{ fontSize: '0.7rem' }}>
        <UserCheck size={10} /> طالب
      </span>
    );
  }

  // ── Determine tabs ──
  const hasStages = stages.length > 0;
  const pendingGuests = guestParticipants.filter((g) => g.status === 'pending');
  const totalPendingRequests = requests.length + pendingGuests.length;
  const tabs = [
    { id: 'requests', label: 'طلبات الاشتراك', count: totalPendingRequests, icon: FileText },
    ...(hasStages
      ? stages.map((stage) => ({
          id: `stage-${stage.id}`,
          label: stage.name,
          count: getParticipantsForStage(stage.id).length,
          icon: Users,
          stageId: stage.id,
        }))
      : [{ id: 'subscribers', label: 'المشتركون المعتمدون', count: subscribers.length, icon: Users }]),
    ...(hasStages
      ? [{ id: 'results', label: 'النتائج / الترتيب', count: rankedParticipants.length, icon: Trophy }]
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
        {/* ──── Requests Tab (signed-in + guest combined) ──── */}
        {activeTab === 'requests' && (
          <>
            {totalPendingRequests === 0 ? (
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
                      <th>المستوى</th>
                      <th>النوع</th>
                      <th>تاريخ التقديم</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Signed-in student pending requests */}
                    {filterByLevel(requests).map((request) => {
                      const isBusy = processingId === request.id;

                      return (
                        <tr key={`student-${request.id}`}>
                          <td>
                            <div>
                              <strong style={{ display: 'block' }}>{request.student_name}</strong>
                              <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }} dir="ltr">
                                {request.student_phone}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{request.level}</span>
                          </td>
                          <td>
                            <span className="admin-badge admin-badge--published" style={{ fontSize: '0.7rem' }}>
                              طالب مسجّل
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Clock size={11} /> {formatDateTime(request.created_at)}
                            </span>
                          </td>
                          <td>
                            <div className="admin-row-actions" style={{ gap: '0.4rem', flexWrap: 'wrap' }}>
                              <button
                                className="admin-btn admin-btn--primary admin-btn--sm"
                                onClick={() => handleApproveLinkedStudent(request)}
                                disabled={processingId !== null}
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                                title="اعتماد الطلب"
                              >
                                {isBusy ? <Loader size={12} className="admin-spin" /> : <CheckCircle size={12} />}
                                اعتماد
                              </button>
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
                    {/* Pending guest participants */}
                    {filterByLevel(pendingGuests).map((guest) => {
                      const isBusy = processingId === guest.id;

                      return (
                        <tr key={`guest-${guest.id}`}>
                          <td>
                            <div>
                              <strong style={{ display: 'block' }}>{guest.student_name}</strong>
                              <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }} dir="ltr">
                                {guest.student_phone}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{guest.level}</span>
                          </td>
                          <td>
                            <span className="admin-badge admin-badge--draft" style={{ fontSize: '0.7rem' }}>
                              طلب زائر
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Clock size={11} /> {formatDateTime(guest.created_at)}
                            </span>
                          </td>
                          <td>
                            <div className="admin-row-actions" style={{ gap: '0.4rem', flexWrap: 'wrap' }}>
                              <button
                                className="admin-btn admin-btn--primary admin-btn--sm"
                                onClick={() => handleApproveGuestParticipant(guest)}
                                disabled={processingId !== null}
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                                title="اعتماد طلب الزائر (بدون إنشاء حساب)"
                              >
                                {isBusy ? <Loader size={12} className="admin-spin" /> : <CheckCircle size={12} />}
                                اعتماد
                              </button>
                              <button
                                className="admin-btn admin-btn--sm"
                                onClick={() => handleRejectGuestParticipant(guest)}
                                disabled={processingId !== null}
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', background: 'var(--admin-bg-light)', color: '#dc2626', border: '1px solid #fecaca' }}
                                title="رفض الطلب"
                              >
                                <XCircle size={12} />
                                رفض
                              </button>
                              <button
                                className="admin-icon-btn admin-icon-btn--delete"
                                onClick={() => handleDeleteGuestParticipant(guest)}
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

        {/* ──── Stage Tabs (signed-in students + guests in one list) ──── */}
        {hasStages && stages.map((stage) => {
          if (activeTab !== `stage-${stage.id}`) return null;

          const stageParticipants = getParticipantsForStage(stage.id);
          const failedParticipants = getFailedForStage(stage.id);
          const isLast = isLastStage(stage.id);
          const nextStage = getNextStage(stage.id);
          const previousStage = getPreviousStage(stage.id);

          const renderActiveRow = (participant) => {
            const isBusy = processingId === participant.id;
            return (
              <tr key={`${participant.participantType}-${participant.id}`}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <strong>{participant.displayName || 'غير معروف'}</strong>
                    {renderParticipantTypeBadge(participant.participantType)}
                  </div>
                </td>
                <td dir="ltr" style={{ textAlign: 'right' }}>{participant.phone || '—'}</td>
                <td>
                  {Array.isArray(competition?.available_levels) && competition.available_levels.length > 0 ? (
                    <select
                      className="admin-input admin-select"
                      style={{ padding: '0.2rem 0.4rem', fontSize: '0.8rem', maxWidth: '160px' }}
                      value={participant.level || ''}
                      onChange={(e) => handleUpdateLevel(participant, e.target.value)}
                      title="تغيير مستوى المشارك"
                    >
                      {!participant.level && <option value="">--تحديد المستوى--</option>}
                      {competition.available_levels.map((lvl) => (
                        <option key={lvl} value={lvl}>{lvl}</option>
                      ))}
                      {participant.level && !competition.available_levels.includes(participant.level) && (
                        <option value={participant.level}>{participant.level}</option>
                      )}
                    </select>
                  ) : (
                    <button
                      type="button"
                      className="admin-btn admin-btn--ghost admin-btn--sm"
                      style={{ padding: '0.15rem 0.4rem', fontSize: '0.8rem', fontWeight: 'bold' }}
                      onClick={() => {
                        const val = window.prompt('أدخل المستوى الجديد للمشارك:', participant.level || '');
                        if (val !== null && val.trim() !== '') {
                          handleUpdateLevel(participant, val.trim());
                        }
                      }}
                      title="انقر لتعديل المستوى"
                    >
                      {participant.level || 'تحديد المستوى'}
                    </button>
                  )}
                </td>
                <td>
                  <div className="admin-row-actions" style={{ gap: '0.4rem', flexWrap: 'wrap' }}>
                    {isLast ? (
                      <button
                        className="admin-btn admin-btn--primary admin-btn--sm"
                        onClick={() => handleMarkCompleted(participant)}
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
                        onClick={() => handleMoveToNextStage(participant)}
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
                      onClick={() => handleMarkFailed(participant)}
                      disabled={processingId !== null}
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', background: 'var(--admin-bg-light)', color: '#dc2626', border: '1px solid #fecaca' }}
                      title="لم يجتز هذه المرحلة"
                    >
                      <XCircle size={12} />
                      لم يجتز
                    </button>
                    {previousStage && (
                      <button
                        className="admin-btn admin-btn--ghost admin-btn--sm"
                        onClick={() => handleMoveToPreviousStage(participant)}
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
                      onClick={() => openAssignmentModal(participant)}
                      disabled={processingId !== null}
                      title="تعديل الحالة أو نقل المشارك إلى أي مرحلة"
                      aria-label="تعديل الحالة والمرحلة"
                    >
                      <SlidersHorizontal size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          };

          const renderFailedRow = (participant) => {
            const isBusy = processingId === participant.id;
            return (
              <tr key={`${participant.participantType}-${participant.id}`}>
                <td style={{ opacity: 0.5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <strong>{participant.displayName || 'غير معروف'}</strong>
                    {renderParticipantTypeBadge(participant.participantType)}
                  </div>
                </td>
                <td dir="ltr" style={{ textAlign: 'right', opacity: 0.5 }}>{participant.phone || '—'}</td>
                <td style={{ opacity: 0.5 }}><span style={{ fontSize: '0.85rem' }}>{participant.level || '—'}</span></td>
                <td>
                  <div className="admin-row-actions" style={{ gap: '0.4rem', flexWrap: 'wrap' }}>
                    <span className="admin-badge" style={{ fontSize: '0.7rem', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                      <XCircle size={10} /> لم يجتز
                    </span>
                    <button
                      className="admin-btn admin-btn--ghost admin-btn--sm"
                      onClick={() => handleQuickRestoreToActive(participant)}
                      disabled={processingId !== null}
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                      title="التراجع وإعادة المشارك كمشارك في هذه المرحلة"
                    >
                      {isBusy ? <Loader size={12} className="admin-spin" /> : <RotateCcw size={12} />}
                      تراجع
                    </button>
                    <button
                      className="admin-icon-btn"
                      onClick={() => openAssignmentModal(participant)}
                      disabled={processingId !== null}
                      title="تعديل الحالة أو نقل المشارك إلى أي مرحلة"
                      aria-label="تعديل الحالة والمرحلة"
                    >
                      <SlidersHorizontal size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          };

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

              {stageParticipants.length === 0 && failedParticipants.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--admin-text-muted)' }}>
                  <Users size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                  <p>لا يوجد مشاركون في هذه المرحلة حالياً.</p>
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
                      {stageParticipants.map(renderActiveRow)}
                      {/* Failed participants: greyed out, but still correctable */}
                      {failedParticipants.map(renderFailedRow)}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}

        {/* ──── Results Tab (signed-in + guest combined) ──── */}
        {activeTab === 'results' && hasStages && (
          <>
            {rankedParticipants.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--admin-text-muted)' }}>
                <Trophy size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <p>لا يوجد مشاركون اجتازوا المسابقة بعد.</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
                    اسحب وأفلت الصفوف لتغيير ترتيب المشاركين
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
                      {filterByLevel(rankedParticipants).map((participant, index) => (
                        <tr
                          key={`${participant.participantType}-${participant.id}`}
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
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <strong>{participant.displayName || 'غير معروف'}</strong>
                              {renderParticipantTypeBadge(participant.participantType)}
                            </div>
                          </td>
                          <td dir="ltr" style={{ textAlign: 'right' }}>{participant.phone || '—'}</td>
                          <td><span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{participant.level || '—'}</span></td>
                          <td>
                            <div className="admin-row-actions" style={{ gap: '0.4rem', flexWrap: 'wrap' }}>
                              <button
                                className="admin-btn admin-btn--ghost admin-btn--sm"
                                onClick={() => handleQuickRestoreToActive(participant)}
                                disabled={processingId !== null}
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                                title="التراجع عن اجتياز المسابقة وإعادة المشارك كمشارك"
                              >
                                {processingId === participant.id ? <Loader size={12} className="admin-spin" /> : <RotateCcw size={12} />}
                                تراجع
                              </button>
                              <button
                                className="admin-icon-btn"
                                onClick={() => openAssignmentModal(participant)}
                                disabled={processingId !== null}
                                title="تعديل الحالة أو نقل المشارك إلى أي مرحلة"
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
          aria-label="تعديل حالة المشارك ومرحلته"
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
                  <span>تعديل حالة المشارك ومرحلته</span>
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', marginTop: '0.25rem' }}>
                  {assignmentModal.participant.displayName || 'غير معروف'}
                  {' — '}
                  الحالة الحالية: {getAssignmentStatusLabel(assignmentModal.participant.status)}
                  {' في '}
                  {stages.find((s) => s.id === assignmentModal.participant.currentStageId)?.name || 'مرحلة غير معروفة'}
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
                  يمكنك نقل المشارك إلى أي مرحلة، سابقة أو لاحقة.
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
              {assignmentModal.participant.status === 'completed' && assignmentModal.status !== 'completed' && (
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
                  سيتم حذف الترتيب النهائي لهذا المشارك وإعادة ترقيم بقية الفائزين تلقائياً.
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
    </div>
  );
}
