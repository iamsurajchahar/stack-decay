import { clsx } from 'clsx';

interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface TabNavProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

export function TabNav({ tabs, activeTab, onTabChange }: TabNavProps) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <nav className="-mb-px flex gap-6 overflow-x-auto" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={clsx(
              'whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-200',
            )}
          >
            {tab.label}
            {tab.count != null && (
              <span
                className={clsx(
                  'ml-2 rounded-full px-2 py-0.5 text-xs',
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
