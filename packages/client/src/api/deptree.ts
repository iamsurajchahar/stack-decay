import apiClient from './client';

export interface TreeNode {
  id: string;
  name: string;
  version: string;
  ecosystem: string;
  score: number | null;
  grade: string | null;
  isDev: boolean;
  isDirect: boolean;
  depth: number;
  vulnerabilityCount: number;
  children: TreeNode[];
}

export interface ManifestTree {
  manifest: string;
  ecosystem: string;
  dependencies: TreeNode[];
}

export interface DependencyTreeData {
  tree: ManifestTree[];
  stats: {
    totalDependencies: number;
    manifests: number;
    directCount: number;
    devCount: number;
  };
}

export async function getDependencyTree(repoId: string): Promise<DependencyTreeData> {
  const { data } = await apiClient.get(`/repos/${repoId}/dependency-tree`);
  return data;
}
