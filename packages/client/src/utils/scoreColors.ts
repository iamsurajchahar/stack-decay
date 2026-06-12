import { getGrade } from '@stack-decay/shared';

export function getScoreColor(score: number): string {
  const grade = getGrade(score);
  return getGradeColorClass(grade);
}

export function getGradeColorClass(grade: string): string {
  switch (grade) {
    case 'A':
      return 'text-green-500';
    case 'B':
      return 'text-blue-500';
    case 'C':
      return 'text-yellow-500';
    case 'D':
      return 'text-orange-500';
    case 'F':
      return 'text-red-500';
    default:
      return 'text-gray-500';
  }
}

export function getScoreBgColor(score: number): string {
  const grade = getGrade(score);
  return getGradeBgColor(grade);
}

export function getGradeBgColor(grade: string): string {
  switch (grade) {
    case 'A':
      return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
    case 'B':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
    case 'C':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300';
    case 'D':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300';
    case 'F':
      return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
}

export function getScoreRingColor(score: number): string {
  const grade = getGrade(score);
  switch (grade) {
    case 'A':
      return '#22c55e';
    case 'B':
      return '#3b82f6';
    case 'C':
      return '#eab308';
    case 'D':
      return '#f97316';
    case 'F':
      return '#ef4444';
    default:
      return '#6b7280';
  }
}

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
    case 'high':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300';
    case 'low':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'critical':
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800';
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-800';
    case 'low':
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
  }
}
