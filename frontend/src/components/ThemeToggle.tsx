import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../services/theme';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`btn btn-ghost px-2.5 py-1.5 rounded-lg border border-transparent hover:border-[var(--border-default)] transition-all flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] ${className}`}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {isDark ? (
          <Sun size={15} className="text-amber-400 hover:rotate-45 transition-transform duration-300" />
        ) : (
          <Moon size={15} className="text-sky-600 hover:-rotate-12 transition-transform duration-300" />
        )}
      </div>
      {showLabel && (
        <span className="font-semibold text-xs capitalize hidden sm:inline">
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </span>
      )}
    </button>
  );
}
