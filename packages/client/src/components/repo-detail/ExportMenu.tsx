import { useState } from 'react';
import { Download, FileText, FileSpreadsheet, ChevronDown, FileDown } from 'lucide-react';
import apiClient from '../../api/client';

interface ExportMenuProps {
  repoId: string;
}

export function ExportMenu({ repoId }: ExportMenuProps) {
  const [open, setOpen] = useState(false);

  const exports = [
    { label: 'Full Report (PDF)', icon: FileDown, path: `/repos/${repoId}/export/pdf`, fallback: 'report.pdf' },
    { label: 'Dependencies (CSV)', icon: FileSpreadsheet, path: `/repos/${repoId}/export/dependencies`, fallback: 'dependencies.csv' },
    { label: 'Vulnerabilities (CSV)', icon: FileSpreadsheet, path: `/repos/${repoId}/export/vulnerabilities`, fallback: 'vulnerabilities.csv' },
    { label: 'Full Report (TXT)', icon: FileText, path: `/repos/${repoId}/export/report`, fallback: 'report.txt' },
  ];

  const handleExport = async (path: string, fallback: string) => {
    setOpen(false);
    try {
      // apiClient applies the API base URL and auth header
      const res = await apiClient.get(path, { responseType: 'blob' });
      const disposition = res.headers['content-disposition'] as string | undefined;
      const filename = disposition?.match(/filename="(.+)"/)?.[1] || fallback;
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="btn-secondary gap-1.5"
      >
        <Download className="h-4 w-4" />
        Export
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            {exports.map(({ label, icon: Icon, path, fallback }) => (
              <button
                key={path}
                onClick={() => handleExport(path, fallback)}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <Icon className="h-4 w-4 text-gray-400" />
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
