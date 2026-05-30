import apiClient from './client';
import type { IRepoScoreSnapshot, IDependencyScore } from '@stack-decay/shared';

interface ScoreHistoryParams {
  from?: string;
  to?: string;
  limit?: number;
}

interface DependencyScoresParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  ecosystem?: string;
  search?: string;
}

export async function getCurrentScore(repoId: string): Promise<IRepoScoreSnapshot | null> {
  try {
    const { data } = await apiClient.get(`/repos/${repoId}/scores/current`);
    return data.score ?? data;
  } catch (err: any) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
}

export async function getScoreHistory(
  repoId: string,
  params?: ScoreHistoryParams,
): Promise<IRepoScoreSnapshot[]> {
  try {
    const { data } = await apiClient.get(`/repos/${repoId}/scores/history`, { params });
    return data.snapshots ?? data;
  } catch (err: any) {
    if (err?.response?.status === 404) return [];
    throw err;
  }
}

export interface EolEntry {
  name: string;
  product: string;
  eolDate: string | null;
  isEol: boolean;
  supportEndDate: string | null;
  latestVersion: string | null;
  daysUntilEol: number | null;
}

export async function getRepoEol(repoId: string): Promise<EolEntry[]> {
  try {
    const { data } = await apiClient.get(`/repos/${repoId}/eol`);
    return data.entries ?? [];
  } catch (err: any) {
    if (err?.response?.status === 404) return [];
    throw err;
  }
}

export interface RepoVulnerability {
  id: string;
  packageName: string;
  ecosystem: string;
  source: string;
  sourceId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  cvssScore: number | null;
  summary: string;
  affectedVersions: string;
  fixedVersion: string | null;
  publishedAt: string;
  withdrawnAt: string | null;
  url: string;
}

export async function getRepoVulnerabilities(repoId: string): Promise<RepoVulnerability[]> {
  try {
    const { data } = await apiClient.get(`/repos/${repoId}/vulnerabilities`);
    return data.vulnerabilities ?? data ?? [];
  } catch (err: any) {
    if (err?.response?.status === 404) return [];
    throw err;
  }
}

export async function getDependencyScores(
  repoId: string,
  params?: DependencyScoresParams,
): Promise<{ items: any[]; total: number }> {
  try {
    const { data } = await apiClient.get(`/repos/${repoId}/scores/dependencies`, { params });
    const raw = data.scores ?? data.items ?? [];
    // Flatten populated packageId into top-level fields
    const items = raw.map((s: any) => ({
      ...s,
      id: s._id ?? s.id,
      name: s.packageId?.name ?? s.name ?? 'Unknown',
      ecosystem: s.packageId?.ecosystem ?? s.ecosystem ?? '',
      version: s.packageId?.latestVersion ?? s.version ?? '',
      packageId: s.packageId?._id ?? s.packageId,
    }));
    return { items, total: items.length };
  } catch (err: any) {
    if (err?.response?.status === 404) return { items: [], total: 0 };
    throw err;
  }
}
