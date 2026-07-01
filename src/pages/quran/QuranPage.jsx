import QuranNav from './QuranNav';
import QuranHero from './QuranHero';
import TeacherPortals from './TeacherPortals';
import HowItWorks from './HowItWorks';
import WhyChooseUs from './WhyChooseUs';
import Testimonials from './Testimonials';
import Competitions from './Competitions';
import FeaturedCourses from './FeaturedCourses';
import Newsletter from './Newsletter';
import QuranFooter from './QuranFooter';
import { useAuth } from '../../context/AuthContext';

export default function QuranPage() {
  const { isStudent, studentProfile } = useAuth();

  // If logged in as student but has no assigned teacher, hide courses, competitions, and newsletter.
  const isStudentWithoutTeacher = isStudent && studentProfile && !studentProfile.teacher_id;

  return (
    <div dir="rtl" className="min-h-screen" style={{ backgroundColor: 'var(--t-bg-page)', color: 'var(--t-text)' }}>
      <QuranNav />
      <main>
        <QuranHero />
        <TeacherPortals />
        <HowItWorks />
        <WhyChooseUs />
        <Testimonials />
        {!isStudentWithoutTeacher && (
          <>
            <Competitions />
            <FeaturedCourses />
            <Newsletter />
          </>
        )}
      </main>
      <QuranFooter />
    </div>
  );
}
