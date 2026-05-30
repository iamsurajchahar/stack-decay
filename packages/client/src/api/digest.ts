import apiClient from './client';

export interface DigestPreferences {
  digestEnabled: boolean;
  digestDay: string;
}

export interface DigestData {
  user: { displayName: string; email: string };
  generatedAt: string;
  period: { from: string; to: string };
  overallStats: {
    totalRepos: number;
    avgScore: number;
    scoreChange: number;
    totalVulnerabilities: number;
    newVulnerabilities: number;
  };
  repoSummaries: Array<{
    name: string;
    fullName: string;
    currentScore: number;
    previousScore: number | null;
    scoreChange: number;
    grade: string;
    vulnerableCount: number;
    lastScannedAt: string | null;
  }>;
  topActions: Array<{
    priority: 'critical' | 'high' | 'medium' | 'low';
    message: string;
    repoName: string;
  }>;
  newVulnerabilities: Array<{
    packageName: string;
    severity: string;
    summary: string;
    repoName: string;
  }>;
}

export async function getDigestPreview(): Promise<DigestData> {
  const { data } = await apiClient.get('/digest/preview');
  return data.digest ?? data;
}

export async function updateDigestPreferences(prefs: Partial<DigestPreferences>): Promise<DigestPreferences> {
  const { data } = await apiClient.patch('/digest/preferences', prefs);
  return data;
}

export async function sendDigests(): Promise<{ sent: number; errors: number }> {
  const { data } = await apiClient.post('/digest/send');
  return data;
}
