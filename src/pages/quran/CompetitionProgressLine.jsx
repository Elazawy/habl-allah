import { Check, XCircle } from 'lucide-react';

// How each stage renders given the participant status.
// preview/pending → all neutral; active → past green, current highlighted;
// failed → past green, current red; completed → all green/check-marked.
function getStageVisual(status, stageIndex, currentIndex) {
  if (status === 'completed') {
    return { tone: 'completed', icon: <Check size={14} strokeWidth={3} /> };
  }

  if (status === 'failed') {
    if (stageIndex < currentIndex) return { tone: 'completed', icon: <Check size={14} strokeWidth={3} /> };
    if (stageIndex === currentIndex) return { tone: 'failed', icon: <XCircle size={14} /> };
    return { tone: 'upcoming', icon: null };
  }

  if (status === 'active') {
    if (stageIndex < currentIndex) return { tone: 'completed', icon: <Check size={14} strokeWidth={3} /> };
    // Current stage: highlighted with the glow ring but shows the stage
    // number — a check would read as "passed" while the participant is
    // still competing in it.
    if (stageIndex === currentIndex) return { tone: 'current', icon: null };
    return { tone: 'upcoming', icon: null };
  }

  // preview / pending / accepted-with-stages / rejected: neutral line
  return { tone: 'neutral', icon: null };
}

const TONE_STYLES = {
  completed: {
    circleBackground: 'var(--t-primary)',
    circleBorder: 'var(--t-primary)',
    circleColor: '#ffffff',
    labelColor: 'var(--t-primary)',
  },
  current: {
    circleBackground: 'var(--t-primary)',
    circleBorder: 'var(--t-primary)',
    circleColor: '#ffffff',
    labelColor: 'var(--t-primary)',
  },
  failed: {
    circleBackground: '#fef2f2',
    circleBorder: '#ef4444',
    circleColor: '#ef4444',
    labelColor: '#b91c1c',
  },
  upcoming: {
    circleBackground: 'var(--t-bg-card)',
    circleBorder: 'var(--t-border)',
    circleColor: 'var(--t-text-muted)',
    labelColor: 'var(--t-text-muted)',
  },
  neutral: {
    circleBackground: 'var(--t-bg-surface-low)',
    circleBorder: 'var(--t-border)',
    circleColor: 'var(--t-text-muted)',
    labelColor: 'var(--t-text-muted)',
  },
};

// status: preview | pending | accepted | active | rejected | failed | completed
export default function CompetitionProgressLine({ stages, currentStageId, status = 'preview' }) {
  if (!Array.isArray(stages) || stages.length === 0) {
    return null;
  }

  // For preview/pending/accepted-without-match, every stage is neutral.
  const currentIndex = currentStageId
    ? stages.findIndex((stage) => stage.id === currentStageId)
    : -1;

  return (
    <div
      className="mb-8 pb-2 -mx-1 px-1 overflow-x-auto"
      role="list"
      aria-label="مراحل المسابقة"
      data-status={status}
    >
      <div
        className="flex items-start min-w-max max-w-full"
        style={{ padding: '0.25rem 0.5rem' }}
      >
        {stages.map((stage, index) => {
          const visual = getStageVisual(status, index, currentIndex);
          const tone = TONE_STYLES[visual.tone] ?? TONE_STYLES.neutral;
          const isCurrent = status === 'active' && index === currentIndex;
          const isLast = index === stages.length - 1;

          return (
            <div key={stage.id} role="listitem" className="flex items-start" style={{ flex: isLast ? '0 0 auto' : '1 1 0' }}>
              {/* Circle + label column. Fixed dimensions so hover/state
                  changes never shift the layout. */}
              <div
                className="flex flex-col items-center"
                style={{ width: '5.5rem', flexShrink: 0 }}
              >
                <div
                  className="flex items-center justify-center rounded-full font-bold"
                  style={{
                    width: isCurrent ? '2.25rem' : '2rem',
                    height: isCurrent ? '2.25rem' : '2rem',
                    // Keep the layout box stable while the circle itself scales.
                    margin: isCurrent ? 0 : '0.125rem',
                    backgroundColor: tone.circleBackground,
                    border: `2px solid ${tone.circleBorder}`,
                    color: tone.circleColor,
                    boxShadow: isCurrent ? '0 0 0 4px var(--t-primary-light)' : 'none',
                    transition: 'box-shadow 200ms ease',
                  }}
                >
                  {visual.icon}
                  {!visual.icon && <span className="text-xs">{index + 1}</span>}
                </div>
                <span
                  className="mt-2 text-center font-semibold leading-snug"
                  style={{
                    fontSize: '0.7rem',
                    color: tone.labelColor,
                    maxWidth: '5.5rem',
                    overflowWrap: 'break-word',
                  }}
                >
                  {stage.name}
                </span>
              </div>

              {/* Connector line to the next stage */}
              {!isLast && (
                <div
                  aria-hidden="true"
                  className="rounded-full"
                  style={{
                    height: '4px',
                    marginTop: '0.9rem',
                    flexGrow: 1,
                    minWidth: '1rem',
                    // Green only for progress already earned: the whole line
                    // when completed, or segments before the current stage.
                    // The segment after the current stage stays neutral —
                    // that progress hasn't been earned yet.
                    backgroundColor: status === 'completed' || (index < currentIndex && (status === 'active' || status === 'failed'))
                      ? 'var(--t-primary)'
                      : 'var(--t-border)',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
