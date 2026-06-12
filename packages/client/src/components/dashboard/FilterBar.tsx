import { Search, SortAsc, SortDesc } from 'lucide-react';
import { clsx } from 'clsx';
import type { FilterState, SortOption } from '../../types';

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'score', label: 'Score' },
  { value: 'name', label: 'Name' },
  { value: 'lastScanned', label: 'Last Scanned' },
];

const gradeOptions = ['A', 'B', 'C', 'D', 'F'];

const gradeColors: Record<string, string> = {
  A: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700',
  B: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700',
  C: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700',
  D: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-700',
  F: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700',
};

export function FilterBar({ filters, onFilterChange }: FilterBarProps) {
  const update = (patch: Partial<FilterState>) =>
    onFilterChange({ ...filters, ...patch });

  const toggleGrade = (g: string) => {
    const grades = filters.grades.includes(g)
      ? filters.grades.filter((x) => x !== g)
      : [...filters.grades, g];
    update({ grades });
  };

  return (
    <div className="card flex flex-wrap items-center gap-4">
      {/* Search */}
      <div className="relative flex-1 sm:min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          placeholder="Filter repositories..."
          className="input pl-9"
        />
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2">
        <select
          value={filters.sortBy}
          onChange={(e) => update({ sortBy: e.target.value as SortOption })}
          className="input w-auto"
        >
          {sortOptions.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          onClick={() => update({ sortDir: filters.sortDir === 'asc' ? 'desc' : 'asc' })}
          className="rounded-lg border border-gray-300 p-2 text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
          title={filters.sortDir === 'asc' ? 'Ascending' : 'Descending'}
        >
          {filters.sortDir === 'asc' ? (
            <SortAsc className="h-4 w-4" />
          ) : (
            <SortDesc className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Grade filter chips */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Grade:</span>
        {gradeOptions.map((g) => (
          <button
            key={g}
            onClick={() => toggleGrade(g)}
            className={clsx(
              'rounded-md border px-2 py-1 text-xs font-bold transition-all',
              filters.grades.includes(g)
                ? gradeColors[g]
                : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-500 dark:hover:border-gray-500',
            )}
          >
            {g}
          </button>
        ))}
      </div>
    </div>
  );
}
