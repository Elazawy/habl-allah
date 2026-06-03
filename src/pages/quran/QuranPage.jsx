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

export default function QuranPage() {
  return (
    <div dir="rtl" className="min-h-screen" style={{ backgroundColor: '#f9faf7', color: '#191c1b' }}>
      <QuranNav />
      <main>
        <QuranHero />
        <TeacherPortals />
        <HowItWorks />
        <WhyChooseUs />
        <Testimonials />
        <Competitions />
        <FeaturedCourses />
        <Newsletter />
      </main>
      <QuranFooter />
    </div>
  );
}
