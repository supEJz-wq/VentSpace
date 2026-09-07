import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const THEME_KEY = 'ventspace_theme';

function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export default function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });

  // Keep in sync if another toggle changes the theme
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
    setTheme(next);
  };

  return (
    <button
      onClick={toggle}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle dark mode"
      className={`relative w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300
        bg-white/70 border border-purple-100/60 text-purple-500 hover:bg-purple-50 hover:border-purple-300
        hover:-translate-y-0.5 active:translate-y-0 shadow-glass
        dark:bg-white/10 dark:border-violet-400/20 dark:text-amber-300 dark:hover:bg-white/15 ${className}`}
    >
      {theme === 'dark'
        ? <Sun size={18} className="animate-bounce-soft" />
        : <Moon size={18} />}
    </button>
  );
}
