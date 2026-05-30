import apiClient from './client';
import type { IRecommendation } from '@stack-decay/shared';

export async function getRecommendations(repoId: string): Promise<IRecommendation[]> {
  try {
    const { data } = await apiClient.get(`/repos/${repoId}/recommendations`);
    return data.recommendations ?? data;
  } catch (err: any) {
    if (err?.response?.status === 404) return [];
    throw err;
  }
}
