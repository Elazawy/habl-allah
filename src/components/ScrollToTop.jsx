import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // الكود ده بيخلي المتصفح يطلع لأول الشاشة بسلاسة
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant' // أو ممكن تخليها 'smooth' لو حاببها تطلع ببطء
    });
  }, [pathname]); // هيتنفذ كل ما المسار (الرابط) يتغير

  return null; // المكون ده ملوش واجهة، شغال في الخلفية بس
}