import { Eye, Send, Award } from 'lucide-react';

function InfoBlock({ icon: Icon, title, text }) {
  return (
    <div
      className="flex gap-4 p-5 rounded-2xl border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
      style={{
        backgroundColor: 'var(--t-bg-card)',
        borderColor: 'var(--t-border)',
      }}
    >
      <div
        className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center mt-0.5"
        style={{ backgroundColor: 'var(--t-primary-light)' }}
      >
        <Icon size={20} style={{ color: 'var(--t-primary)' }} />
      </div>
      <div>
        <h4 className="font-bold text-base mb-1" style={{ color: 'var(--t-primary)' }}>{title}</h4>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--t-text-muted)' }}>{text}</p>
      </div>
    </div>
  );
}

export default function About() {
  return (
    <section id="about" className="py-24 px-6" style={{ backgroundColor: 'var(--t-bg-card)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span
            className="inline-block text-sm font-semibold px-4 py-1.5 rounded-full"
            style={{ backgroundColor: 'var(--t-primary-light)', color: 'var(--t-primary)' }}
          >
            تعرّف علينا
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Right: Text */}
          <div className="space-y-8">
            <div>
              <h2 className="text-4xl font-black leading-tight mb-5" style={{ color: 'var(--t-primary)' }}>
                من نحن
              </h2>
              <p className="text-lg leading-relaxed" style={{ color: 'var(--t-text-muted)' }}>
                أكاديمية حبل الله القرآنية هي مؤسسة تعليمية رائدة تهدف إلى نشر علوم القرآن الكريم
                وتعليم تلاوته وأحكام تجويده بأعلى معايير الجودة. نؤمن بأن التعليم القرآني حق
                للجميع، ونسعى إلى تيسيره بأحدث الوسائل التقنية.
              </p>
            </div>
            <div className="space-y-4">
              <InfoBlock
                icon={Eye}
                title="رؤيتنا"
                text="أن نكون المرجع الأول في التعليم القرآني الرقمي في العالم العربي والإسلامي."
              />
              <InfoBlock
                icon={Send}
                title="رسالتنا"
                text="تقديم تعليم قرآني أصيل وميسّر يجمع بين الكفاءة العلمية والتفاعلية الحديثة."
              />
            </div>
          </div>

          {/* Left: Image + Badge */}
          <div className="relative flex items-center justify-center">
            <div
              className="absolute inset-0 m-auto w-[90%] h-[90%] rounded-3xl rotate-3 pointer-events-none"
              style={{ background: 'linear-gradient(to bottom right, var(--t-primary-light), var(--t-bg-surface-low))' }}
            />

            <div className="relative z-10 w-full aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950 flex flex-col items-center justify-center gap-4">
                <div className="text-center">
                  <div className="mb-4 flex justify-center">
                    <div className="relative">
                      <div className="w-24 h-32 bg-amber-400/20 border-2 border-amber-400/40 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-amber-300 text-3xl mb-1">القرآن</div>
                          <div className="w-12 h-px bg-amber-400/60 mx-auto mb-1" />
                          <div className="text-amber-200/60 text-xs">الكريم</div>
                        </div>
                      </div>
                      <div className="absolute inset-y-0 right-0 w-3 bg-amber-500/30 rounded-r-lg border-r border-amber-400/30" />
                    </div>
                  </div>
                  <p className="text-emerald-200/60 text-sm font-light">مسجد ومصحف</p>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/60 via-transparent to-transparent" />
            </div>

            {/* Gold badge */}
            <div className="absolute -bottom-6 -right-6 z-20 bg-gradient-to-br from-amber-400 to-amber-500 rounded-2xl px-6 py-5 shadow-xl shadow-amber-400/30 text-center min-w-[130px]">
              <Award size={22} className="text-amber-900 mx-auto mb-1" />
              <div className="text-3xl font-black text-amber-900 leading-none">+١٠</div>
              <div className="text-amber-900/80 text-xs font-semibold mt-1">سنوات من العطاء</div>
            </div>

            {/* Secondary badge */}
            <div
              className="absolute -top-4 -left-4 z-20 rounded-xl px-4 py-3 shadow-lg text-center border"
              style={{
                backgroundColor: 'var(--t-bg-card)',
                borderColor: 'var(--t-border)',
              }}
            >
              <div className="font-black text-xl leading-none" style={{ color: 'var(--t-primary)' }}>٪٩٨</div>
              <div className="text-xs mt-1" style={{ color: 'var(--t-text-subtle)' }}>رضا الطلاب</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
