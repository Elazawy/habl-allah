// Temporary dev-only stub of competitionsService, used to render
// CompetitionStudentsPage without a live Supabase instance.
const COMP = {
  id: 'comp-1',
  slug: 'preview-competition',
  name: 'مسابقة المعاينة',
  available_levels: ['جزء واحد', 'خمسة أجزاء'],
};

const STAGES = [
  { id: 'stage-1', name: 'المرحلة الأولى', sort_order: 0, description: 'تصفية أولية', deadline: null },
  { id: 'stage-2', name: 'المرحلة الثانية', sort_order: 1, description: null, deadline: null },
  { id: 'stage-3', name: 'المرحلة النهائية', sort_order: 2, description: null, deadline: null },
];

let ASSIGNMENTS = [
  { id: 'a1', student_id: 's1', competition_id: 'comp-1', current_stage_id: 'stage-2', status: 'active', level: 'جزء واحد', final_rank: null, student_profiles: { id: 's1', full_name: 'أحمد المشارك', phone: '01000000001' } },
  { id: 'a2', student_id: 's2', competition_id: 'comp-1', current_stage_id: 'stage-2', status: 'failed', level: 'خمسة أجزاء', final_rank: null, student_profiles: { id: 's2', full_name: 'محمود الراسب بالخطأ', phone: '01000000002' } },
  { id: 'a3', student_id: 's3', competition_id: 'comp-1', current_stage_id: 'stage-3', status: 'completed', level: 'جزء واحد', final_rank: 1, student_profiles: { id: 's3', full_name: 'سعيد الفائز', phone: '01000000003' } },
  { id: 'a4', student_id: 's4', competition_id: 'comp-1', current_stage_id: 'stage-3', status: 'completed', level: 'خمسة أجزاء', final_rank: 2, student_profiles: { id: 's4', full_name: 'خالد الفائز', phone: '01000000004' } },
];

export const STUDENT_ASSIGNMENT_STATUSES = ['active', 'failed', 'completed'];

export async function fetchCompetitionBySlugAdmin() { return COMP; }
export async function fetchCompetitionStages() { return STAGES; }
export async function fetchPendingRegistrationRequests() { return []; }
export async function fetchSubscribedStudents() { return []; }
export async function fetchStudentStageAssignments() { return ASSIGNMENTS.map((a) => ({ ...a })); }

export async function updateStudentAssignment(studentId, competitionId, { stageId, status } = {}) {
  const row = ASSIGNMENTS.find((a) => a.student_id === studentId);
  if (!row) throw new Error('no row');
  if (stageId !== undefined) row.current_stage_id = stageId;
  if (status !== undefined) {
    row.status = status;
    if (status !== 'completed') row.final_rank = null;
  }
  console.log('[stub] updateStudentAssignment', studentId, { stageId, status }, '→', JSON.stringify(row));
  return row;
}

export async function bulkUpdateFinalRanks(competitionId, ranked) {
  ranked.forEach(({ student_id }, i) => {
    const row = ASSIGNMENTS.find((a) => a.student_id === student_id);
    if (row && row.status === 'completed') row.final_rank = i + 1;
  });
  console.log('[stub] bulkUpdateFinalRanks', JSON.stringify(ranked));
}

export async function moveStudentToNextStage(sid, cid, stageId) { return updateStudentAssignment(sid, cid, { stageId }); }
export async function markStudentFailed(sid, cid) { return updateStudentAssignment(sid, cid, { status: 'failed' }); }
export async function markStudentCompleted(sid, cid) { return updateStudentAssignment(sid, cid, { status: 'completed' }); }
export async function updateStudentLevel(sid, cid, level) {
  const row = ASSIGNMENTS.find((a) => a.student_id === sid);
  if (row) row.level = level;
  return row;
}

// ── Student-facing reads (CompetitionDetailsPage / StudentDashboard preview) ──
// The previewed student is 's2', who was marked failed at "المرحلة الثانية".
export async function fetchCompetitionBySlug() {
  return {
    ...COMP,
    short_description: 'مسابقة لعرض حالة الطالب في المعاينة',
    description: 'وصف تفصيلي للمسابقة.',
    start_date: '2026-01-10',
    end_date: '2026-03-10',
    registration_deadline: '2026-01-05',
    is_published: true,
  };
}

export async function fetchPublishedCompetitions() { return []; }

export async function fetchMyStageAssignment() {
  const row = ASSIGNMENTS.find((a) => a.student_id === 's2');
  const stage = STAGES.find((s) => s.id === row.current_stage_id);
  return { ...row, competition_stages: stage ? { id: stage.id, name: stage.name, sort_order: stage.sort_order } : null };
}

export async function fetchMyRejectedRequest() { return null; }

// Anything not stubbed above falls through to the real module. Explicit local
// exports win, so the stubs stay in effect.
export * from '../src/services/competitionsService.js';

