import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

const VALID_THEMES: Theme[] = ['light', 'dark', 'system'];

export const useThemeStore = create<ThemeState>((set, get) => {
  const stored = localStorage.getItem('theme') as Theme | null;
  const saved = stored && VALID_THEMES.includes(stored) ? stored : 'system';
  // Apply on load
  applyTheme(saved);

  // Re-apply when the OS theme changes while in 'system' mode
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => {
      if (get().theme === 'system') applyTheme('system');
    });

  return {
    theme: saved,
    setTheme: (theme) => {
      localStorage.setItem('theme', theme);
      applyTheme(theme);
      set({ theme });
    },
  };
});
