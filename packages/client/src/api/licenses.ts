import apiClient from './client';

export interface LicenseInfo {
  packageName: string;
  ecosystem: string;
  license: string;
  category: string;
  permissive: boolean;
  risk: string;
}

export interface LicenseSummary {
  total: number;
  permissive: number;
  copyleft: number;
  high_risk: number;
  unknown: number;
}

export async function getRepoLicenses(repoId: string): Promise<{ licenses: LicenseInfo[]; summary: LicenseSummary }> {
  try {
    const { data } = await apiClient.get(`/repos/${repoId}/licenses`);
    return data;
  } catch (err: any) {
    if (err?.response?.status === 404) return { licenses: [], summary: { total: 0, permissive: 0, copyleft: 0, high_risk: 0, unknown: 0 } };
    throw err;
  }
}
