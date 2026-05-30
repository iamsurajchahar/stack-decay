import apiClient from './client';

export interface TeamOverview {
  totalRepos: number;
  avgScore: number;
  bestRepo: RepoScore | null;
  worstRepo: RepoScore | null;
  gradeDistribution: Record<string, number>;
  ecosystemDistribution: Record<string, number>;
  totalDependencies: number;
  totalVulnerable: number;
  totalDeprecated: number;
  repoScores: RepoScore[];
  sharedVulnerabilities: SharedVulnerability[];
}

export interface RepoScore {
  id: string;
  name: string;
  fullName: string;
  score: number;
  grade: string;
  vulnerableCount: number;
  deprecatedCount: number;
  totalDeps: number;
  language: string;
  lastScannedAt: string | null;
}

export interface SharedVulnerability {
  packageName: string;
  severity: string;
  summary: string;
  affectedRepos: string[];
  sourceId: string;
}

export async function getTeamOverview(): Promise<TeamOverview> {
  const { data } = await apiClient.get('/team/overview');
  return data.overview ?? data;
}
