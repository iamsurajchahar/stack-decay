import apiClient from './client';

export interface PackageComparison {
  name: string;
  ecosystem: string;
  found: boolean;
  latestVersion: string | null;
  license: string | null;
  description: string | null;
  repoUrl?: string;
  homepageUrl?: string;
  health: {
    maintenance: {
      commitsLast90d: number;
      releasesLastYear: number;
      daysSinceLastRelease: number;
      openIssuesCount: number;
      closedIssuesLast90d: number;
      openPrCount: number;
      avgIssueCloseDays: number;
    };
    community: {
      starsCount: number;
      starsGrowth30d: number;
      forksCount: number;
      contributorCount: number;
      dependentReposCount: number;
      downloadsLastWeek: number;
    };
    vulnerability: {
      openCveCount: number;
      totalCveCount: number;
      criticalCveCount: number;
      highCveCount: number;
      avgFixTimeDays: number;
    };
    eol: {
      isDeprecated: boolean;
      isArchived: boolean;
    };
    license: {
      spdx: string;
      riskTier: string;
    };
  } | null;
  vulnerabilities: Array<{
    sourceId: string;
    severity: string;
    summary: string;
    fixedVersion: string | null;
  }>;
  lastEnrichedAt: string | null;
}

export interface CompareResult {
  comparison: PackageComparison[];
  highlights: string[];
}

export async function comparePackages(packages: string[], ecosystem: string = 'npm'): Promise<CompareResult> {
  const { data } = await apiClient.get('/packages/compare', {
    params: { packages: packages.join(','), ecosystem },
  });
  return data;
}
