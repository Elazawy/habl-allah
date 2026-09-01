import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..');
const previewDir = path.resolve(projectRoot, '.preview-tmp');
const stubFor = (file) => path.resolve(previewDir, file);

// Dev-only: swap the real Supabase-backed modules for in-memory stubs so the
// admin and student pages can be rendered without a database.
const STUBS = [
  ['services/competitionsService', stubFor('stubService.js')],
  ['services/studentsService', stubFor('stubStudentsService.js')],
  ['services/quranLessonsService', stubFor('stubLessonsService.js')],
  ['services/coursesService', stubFor('stubCoursesService.js')],
  ['context/AuthContext', stubFor('stubAuth.js')],
  ['hooks/useCompetitionRegistrationStatus', stubFor('stubRegistrationStatus.js')],
];

function stubSupabaseModules() {
  return {
    name: 'stub-supabase-modules',
    enforce: 'pre',
    resolveId(source, importer) {
      // Stubs re-export the real module, so never rewrite their own imports.
      if (importer && importer.startsWith(previewDir)) return null;
      for (const [suffix, target] of STUBS) {
        if (source.endsWith(suffix) || source.endsWith(`${suffix}.js`) || source.endsWith(`${suffix}.jsx`)) {
          return target;
        }
      }
      return null;
    },
  };
}

export default defineConfig({
  root: projectRoot,
  plugins: [stubSupabaseModules(), react(), tailwindcss()],
  server: { port: 5199, strictPort: true },
});
