import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CompetitionStudentsPage from '../src/pages/admin/CompetitionStudentsPage';
import CompetitionDetailsPage from '../src/pages/quran/CompetitionDetailsPage';
import StudentDashboard from '../src/pages/student/StudentDashboard';
import '../src/index.css';

// Pick which page to preview with the hash: #details, #dashboard, or default admin.
const ENTRIES = {
  '#details': '/quran/competition/preview-competition',
  '#dashboard': '/quran/student/dashboard',
};
const initialEntry = ENTRIES[window.location.hash] || '/admin/quran/competitions/preview-competition/students';

createRoot(document.getElementById('root')).render(
  <MemoryRouter initialEntries={[initialEntry]}>
    <Routes>
      <Route path="/admin/quran/competitions/:slug/students" element={<CompetitionStudentsPage />} />
      <Route path="/quran/competition/:slug" element={<CompetitionDetailsPage />} />
      <Route path="/quran/student/dashboard" element={<StudentDashboard />} />
      <Route path="*" element={<div>fallback</div>} />
    </Routes>
  </MemoryRouter>
);
