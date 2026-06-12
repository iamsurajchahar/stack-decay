import { clsx } from 'clsx';

interface ScoreBadgeProps {
  grade: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-xl',
};

const gradeStyles: Record<string, string> = {
  A: 'bg-green-100 text-green-700 ring-green-300 dark:bg-green-900/40 dark:text-green-300 dark:ring-green-700',
  B: 'bg-blue-100 text-blue-700 ring-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:ring-blue-700',
  C: 'bg-yellow-100 text-yellow-700 ring-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300 dark:ring-yellow-700',
  D: 'bg-orange-100 text-orange-700 ring-orange-300 dark:bg-orange-900/40 dark:text-orange-300 dark:ring-orange-700',
  F: 'bg-red-100 text-red-700 ring-red-300 dark:bg-red-900/40 dark:text-red-300 dark:ring-red-700',
};

export function ScoreBadge({ grade, size = 'md' }: ScoreBadgeProps) {
  return (
    <div
      className={clsx(
        'flex items-center justify-center rounded-full font-bold ring-2',
        sizeStyles[size],
        gradeStyles[grade] || 'bg-gray-100 text-gray-500 ring-gray-300 dark:bg-gray-700 dark:text-gray-400 dark:ring-gray-600',
      )}
    >
      {grade}
    </div>
  );
}
