import { useSyncExternalStore } from 'react';
import { useThemeStore } from '../store/themeStore';

function subscribeToSystemTheme(callback: () => void) {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

function getSystemDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Resolves the effective theme (including 'system') to a boolean, reactively. */
export function useIsDark(): boolean {
  const theme = useThemeStore((s) => s.theme);
  const systemDark = useSyncExternalStore(subscribeToSystemTheme, getSystemDark);
  return theme === 'dark' || (theme === 'system' && systemDark);
}

/** Recharts styling tokens for the current theme. */
export function getChartTheme(isDark: boolean) {
  return {
    gridStroke: isDark ? '#374151' : '#e5e7eb',
    tickFill: isDark ? '#9ca3af' : '#6b7280',
    tooltipStyle: {
      borderRadius: '0.5rem',
      border: isDark ? '1px solid #374151' : '1px solid #e5e7eb',
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      color: isDark ? '#f3f4f6' : '#111827',
      fontSize: '0.875rem',
    } as React.CSSProperties,
  };
}
