import { ShieldCheck, Clock, TrendingUp, BadgeCheck } from 'lucide-react';
import studentTablet from '../../assets/student-tablet.png';

const features = [
  {
    icon: <BadgeCheck size={22} />,
    title: 'نخبة المعلمين',
    desc: 'معلمون معتمدون ومجازون في القراءات العشر مع خبرة سنوات.',
  },
  {
    icon: <ShieldCheck size={22} />,
    title: 'بيئة آمنة',
    desc: 'خصوصية كاملة للطلاب والطالبات في بيئة تعليمية وقورة.',
  },
  {
    icon: <Clock size={22} />,
    title: 'أوقات مرنة',
    desc: 'اختر المواعيد التي تناسب جدول يومك، متاحون على مدار الساعة.',
  },
  {
    icon: <TrendingUp size={22} />,
    title: 'متابعة التقدم',
    desc: 'تقارير دورية وشاملة لمستوى الطالب وتطوره في الحفظ والتجويد.',
  },
];

export default function WhyChooseUs() {
  return (
    <section className="py-24 px-5 md:px-8" style={{ backgroundColor: 'var(--t-bg-surface-low)' }}>
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-14">

        {/* Image */}
        <div className="w-full md:w-5/12 order-2 md:order-1">
          <div className="rounded-[2.5rem] overflow-hidden shadow-2xl">
            <img
              src={studentTablet}
              alt="طالب يتعلم القرآن الكريم على الجهاز اللوحي"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Features */}
        <div className="w-full md:w-7/12 order-1 md:order-2">
          <h2 className="text-4xl font-black mb-12" style={{ color: 'var(--t-primary)' }}>
            لماذا يختار الدارسون أكاديميتنا؟
          </h2>
          <div className="space-y-8">
            {features.map((f) => (
              <div key={f.title} className="flex items-start gap-5 group">
                {/* Icon badge */}
                <div
                  className="p-3 rounded-2xl text-white shrink-0 transition-transform duration-300 group-hover:scale-110 shadow-md"
                  style={{ backgroundColor: 'var(--t-primary)' }}
                >
                  {f.icon}
                </div>
                <div>
                  <h4 className="text-xl font-black mb-1" style={{ color: 'var(--t-primary)' }}>
                    {f.title}
                  </h4>
                  <p className="text-base leading-relaxed" style={{ color: 'var(--t-text-muted)' }}>
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
