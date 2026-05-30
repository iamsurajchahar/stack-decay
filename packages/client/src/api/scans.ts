import apiClient from './client';
import type { IScan } from '@stack-decay/shared';

interface ListScansParams {
  page?: number;
  limit?: number;
  status?: string;
}

export async function triggerScan(repoId: string): Promise<IScan> {
  const { data } = await apiClient.post(`/repos/${repoId}/scans`);
  return data.scan ?? data;
}

export async function listScans(repoId: string, params?: ListScansParams): Promise<{ items: IScan[]; total: number }> {
  const { data } = await apiClient.get(`/repos/${repoId}/scans`, { params });
  const scans = data.scans ?? data.items ?? [];
  const total = data.pagination?.total ?? scans.length;
  return { items: scans, total };
}

export async function getLatestScan(repoId: string): Promise<IScan | null> {
  try {
    const { data } = await apiClient.get(`/repos/${repoId}/scans/latest`);
    return data.scan ?? data;
  } catch (err: any) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
}

export async function getScan(repoId: string, scanId: string): Promise<IScan> {
  const { data } = await apiClient.get(`/repos/${repoId}/scans/${scanId}`);
  return data.scan ?? data;
}
