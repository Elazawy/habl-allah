import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function DarkModeToggle({ className = '' }) {
  const { dark, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      aria-label={dark ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'}
      title={dark ? 'الوضع الفاتح' : 'الوضع الداكن'}
      className={`relative inline-flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 ${className}`}
      style={{
        backgroundColor: dark ? 'rgba(78,173,136,0.15)' : 'rgba(27,77,62,0.08)',
        color: dark ? '#4ead88' : '#1B4D3E',
        border: `1.5px solid ${dark ? 'rgba(78,173,136,0.3)' : 'rgba(27,77,62,0.15)'}`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = dark
          ? 'rgba(78,173,136,0.25)'
          : 'rgba(27,77,62,0.15)';
        e.currentTarget.style.transform = 'scale(1.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = dark
          ? 'rgba(78,173,136,0.15)'
          : 'rgba(27,77,62,0.08)';
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      <span
        className="absolute inset-0 flex items-center justify-center transition-all duration-300"
        style={{
          opacity: dark ? 0 : 1,
          transform: dark ? 'rotate(90deg) scale(0.5)' : 'rotate(0deg) scale(1)',
        }}
      >
        <Moon size={18} />
      </span>
      <span
        className="absolute inset-0 flex items-center justify-center transition-all duration-300"
        style={{
          opacity: dark ? 1 : 0,
          transform: dark ? 'rotate(0deg) scale(1)' : 'rotate(-90deg) scale(0.5)',
        }}
      >
        <Sun size={18} />
      </span>
    </button>
  );
}
