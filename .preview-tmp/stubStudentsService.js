// Dev-only stub of studentsService for the StudentDashboard preview.
const FAILED_COMPETITION = {
  id: 'sub-1',
  competition_id: 'comp-1',
  is_active: true,
  quran_competitions: {
    id: 'comp-1',
    slug: 'preview-competition',
    name: 'مسابقة المعاينة',
    short_description: 'مسابقة لعرض حالات الطالب',
    start_date: '2026-01-10',
  },
  student_stage_assignments: {
    status: 'failed',
    level: 'خمسة أجزاء',
    current_stage_id: 'stage-2',
    final_rank: null,
    competition_id: 'comp-1',
    competition_stages: { name: 'المرحلة الثانية' },
  },
};

const ACTIVE_COMPETITION = {
  id: 'sub-2',
  competition_id: 'comp-2',
  is_active: true,
  quran_competitions: {
    id: 'comp-2',
    slug: 'preview-competition-active',
    name: 'مسابقة جارية',
    short_description: null,
    start_date: '2026-02-01',
  },
  student_stage_assignments: {
    status: 'active',
    level: 'جزء واحد',
    current_stage_id: 'stage-1',
    final_rank: null,
    competition_id: 'comp-2',
    competition_stages: { name: 'المرحلة الأولى' },
  },
};

export async function fetchMySubscribedCourses() { return []; }
export async function fetchMySubscribedCompetitions() {
  return [FAILED_COMPETITION, ACTIVE_COMPETITION];
}

export * from '../src/services/studentsService.js';
