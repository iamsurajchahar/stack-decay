import apiClient from './client';

export interface DashboardSummary {
  totalRepos: number;
  scoredRepos: number;
  averageScore: number | null;
  totalScans: number;
  activeScans: number;
  scoreDistribution: Record<string, number>;
  recentScans: Array<any>;
}

export interface TrendData {
  repositoryId: string;
  name: string;
  fullName: string;
  snapshots: Array<{ date: string; score: number; grade: string }>;
  scoreChange: number | null;
}

export async function getSummary(): Promise<DashboardSummary> {
  const { data } = await apiClient.get('/dashboard/summary');
  return data.summary ?? data;
}

export async function getTrends(): Promise<TrendData[]> {
  try {
    const { data } = await apiClient.get('/dashboard/trends');
    return data.trends ?? data;
  } catch (err: any) {
    if (err?.response?.status === 404) return [];
    throw err;
  }
}
