import { ExternalLink, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { IVulnerability } from '@stack-decay/shared';
import { EmptyState } from '../shared/EmptyState';

interface Props {
  vulnerabilities: IVulnerability[];
}

const severityColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800',
  high: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-800',
  low: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800',
};

export function CveList({ vulnerabilities }: Props) {
  if (!vulnerabilities || vulnerabilities.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="No vulnerabilities found"
        description="This package has no known CVEs. Keep monitoring for new disclosures."
      />
    );
  }

  const sorted = [...vulnerabilities].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-md font-medium text-gray-700 dark:text-gray-300">
          Vulnerabilities ({vulnerabilities.length})
        </h3>
        <div className="flex gap-2 text-xs">
          {['critical', 'high', 'medium', 'low'].map((sev) => {
            const count = vulnerabilities.filter((v) => v.severity === sev).length;
            if (count === 0) return null;
            return (
              <span key={sev} className={`px-2 py-0.5 rounded-full border ${severityColors[sev]}`}>
                {count} {sev}
              </span>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        {sorted.map((vuln) => (
          <div key={vuln.sourceId} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow dark:border-gray-700">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-500" />
                <span className="font-mono text-sm font-medium dark:text-gray-100">{vuln.sourceId}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${severityColors[vuln.severity]}`}>
                  {vuln.severity}
                </span>
                {vuln.cvssScore && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">CVSS {vuln.cvssScore}</span>
                )}
              </div>
              {vuln.url && (
                <a
                  href={vuln.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>

            <p className="text-sm text-gray-600 mt-2 dark:text-gray-400">{vuln.summary}</p>

            <div className="flex gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
              <span>Affected: <code className="bg-gray-100 px-1 rounded dark:bg-gray-700">{vuln.affectedVersions}</code></span>
              {vuln.fixedVersion && (
                <span>Fixed in: <code className="bg-green-50 text-green-700 px-1 rounded dark:bg-green-900/30 dark:text-green-300">{vuln.fixedVersion}</code></span>
              )}
              <span>Published: {new Date(vuln.publishedAt).toLocaleDateString()}</span>
              <span className="capitalize">Source: {vuln.source.replace('_', ' ')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
