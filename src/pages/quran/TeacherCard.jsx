import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/** Extract first Arabic character from a name string */
function getMonogram(name) {
  if (!name) return '؟';
  return name.trim().split(/\s+/)[0]?.[0] ?? '؟';
}

/** Gradient monogram for female teachers (no photo) */
export function FemaleMonogram({ name, size = 'md' }) {
  const letter = getMonogram(name);
  const sizeClass = size === 'lg'
    ? 'w-28 h-28 text-4xl'
    : 'w-20 h-20 text-3xl';

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-black select-none relative overflow-hidden flex-shrink-0`}
      style={{
        background: 'linear-gradient(135deg, #1B4D3E 0%, #2d7a5f 50%, #CFA767 100%)',
        boxShadow: '0 4px 20px rgba(27,77,62,0.25)',
      }}
    >
      {/* Islamic geometric overlay */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0l2.598 10h5.196L20 5 12.206 10h5.196L20 0zm0 40l-2.598-10h-5.196L20 35l7.794-5h-5.196L20 40zM0 20l10-2.598v-5.196L5 20l5 7.794v-5.196L0 20zm40 0l-10 2.598v5.196L35 20l-5-7.794v5.196L40 20z' fill='%23ffffff' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          backgroundSize: '40px 40px',
        }}
      />
      <span className="relative z-10 text-white leading-none">{letter}</span>
    </div>
  );
}

/** Circular photo for male teachers */
export function MalePhoto({ photoUrl, name, size = 'md' }) {
  const sizeClass = size === 'lg'
    ? 'w-28 h-28 text-4xl'
    : 'w-20 h-20 text-3xl';

  const letter = getMonogram(name);

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0`}
        style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
      />
    );
  }

  // Fallback monogram if photo_url is null
  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-black select-none flex-shrink-0`}
      style={{
        background: 'linear-gradient(135deg, #1B4D3E 0%, #4ead88 100%)',
        boxShadow: '0 4px 16px rgba(27,77,62,0.25)',
        color: '#ffffff',
      }}
    >
      {letter}
    </div>
  );
}

/**
 * TeacherCard — used in the teacher list grid.
 * Shows photo (male) or monogram (female) + name only.
 * NOTE: No reveal-scale here — cards are loaded async so we animate
 * them with a staggered CSS animation applied from the parent grid.
 */
export default function TeacherCard({ teacher, index = 0 }) {
  const { id, name, gender } = teacher;
  const path = `/quran/teachers/${gender}/${id}`;

  return (
    <Link
      to={path}
      id={`card-${id}`}
      className="group flex flex-col items-center text-center rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl border relative overflow-hidden"
      style={{
        backgroundColor: 'var(--t-bg-card)',
        borderColor: 'var(--t-border)',
        boxShadow: '0 2px 12px var(--t-shadow-card)',
        animation: `cardFadeIn 0.5s cubic-bezier(0.22,1,0.36,1) ${index * 0.07}s both`,
      }}
    >
      {/* Female pattern background */}
      {gender === 'female' && (
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l2.598 15h5.196L30 7.5 22.206 15h5.196L30 0zm0 60l-2.598-15h-5.196L30 52.5 37.794 45h-5.196L30 60zM0 30l15-2.598v-5.196L7.5 30 15 37.794v-5.196L0 30zm60 0l-15 2.598v5.196L52.5 30 45 22.206v5.196L60 30z' fill='%23CFA767' fill-rule='evenodd'/%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px',
          }}
        />
      )}

      {/* Avatar */}
      <div className="mb-4 transition-transform duration-300 group-hover:scale-105 relative z-10">
        {gender === 'female' ? (
          <FemaleMonogram name={name} size="md" />
        ) : (
          <MalePhoto photoUrl={teacher.photo_url} name={name} size="md" />
        )}
      </div>

      {/* Name only */}
      <h3
        className="text-base font-bold leading-snug relative z-10"
        style={{ color: 'var(--t-text)' }}
      >
        {name}
      </h3>

      {/* CTA indicator */}
      <span
        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold transition-all duration-300 group-hover:gap-2 relative z-10"
        style={{ color: 'var(--t-primary)' }}
      >
        عرض الملف
        <ArrowLeft size={12} className="transition-transform duration-300 group-hover:-translate-x-0.5" />
      </span>
    </Link>
  );
}
