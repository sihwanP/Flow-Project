import { useTheme } from "../context/ThemeContext";

interface ThemeToggleProps {
  className?: string;
  transparent?: boolean;
}

export default function ThemeToggle({ className = "", transparent = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`flex items-center justify-center w-12 h-12 rounded-full transition-all backdrop-blur-md relative z-[99999] ${className} ${
        theme === 'light'
          ? (transparent ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white text-indigo-950 shadow-lg border border-gray-200 hover:scale-110')
          : 'bg-white/10 text-white hover:bg-white/20 hover:text-yellow-300'
      }`}
      aria-label="Toggle Theme"
    >
      {theme === 'dark' ? (
        <span className="Sicon flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5" fill="white" fillOpacity="0.2"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
        </span>
      ) : (
        <span className="Micon flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="white" fillOpacity="0.2"></path>
          </svg>
        </span>
      )}
    </button>
  );
}
