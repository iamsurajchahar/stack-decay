import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Repository } from '../models/Repository';
import { Scan } from '../models/Scan';
import { Package } from '../models/Package';
import { DependencyScore } from '../models/DependencyScore';
import { AppError } from '../middleware/errorHandler.middleware';

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

/**
 * GET /api/repos/:repoId/dependency-tree
 * Returns the full dependency tree for the latest completed scan.
 */
export async function getDependencyTree(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const repoId = req.params.repoId as string;
    if (!Types.ObjectId.isValid(repoId)) throw new AppError('Invalid repository ID', 400, 'INVALID_REPO_ID');

    const repo = await Repository.findOne({
      _id: new Types.ObjectId(repoId),
      userId: new Types.ObjectId(req.userId!),
    });
    if (!repo) throw new AppError('Repository not found', 404, 'REPO_NOT_FOUND');

    const latestScan = await Scan.findOne({ repositoryId: repo._id, status: 'completed' })
      .sort({ createdAt: -1 }).lean();
    if (!latestScan) throw new AppError('No completed scan found', 404, 'NO_SCAN');

    // Gather all packageIds
    const packageIds = new Set<string>();
    for (const manifest of latestScan.manifests || []) {
      for (const dep of manifest.dependencies || []) {
        if (dep.packageId) packageIds.add(dep.packageId.toString());
      }
    }

    // Fetch packages and scores in bulk
    const [packages, scores] = await Promise.all([
      Package.find({ _id: { $in: Array.from(packageIds).map(id => new Types.ObjectId(id)) } })
        .select('name ecosystem latestVersion vulnerabilities')
        .lean(),
      DependencyScore.find({ scanId: latestScan._id }).lean(),
    ]);

    const pkgMap = new Map(packages.map(p => [p._id.toString(), p]));
    const scoreMap = new Map(scores.map(s => [s.packageId.toString(), s]));

    // Build tree grouped by manifest
    const tree: Array<{
      manifest: string;
      ecosystem: string;
      dependencies: TreeNode[];
    }> = [];

    for (const manifest of latestScan.manifests || []) {
      const directDeps: TreeNode[] = [];

      for (const dep of manifest.dependencies || []) {
        const pkgId = dep.packageId?.toString();
        const pkg = pkgId ? pkgMap.get(pkgId) : undefined;
        const score = pkgId ? scoreMap.get(pkgId) : undefined;

        directDeps.push({
          id: pkgId || dep.name,
          name: dep.name,
          version: dep.resolvedVersion || dep.versionConstraint,
          ecosystem: manifest.ecosystem,
          score: score?.compositeScore ?? null,
          grade: score?.grade ?? null,
          isDev: dep.isDev,
          isDirect: dep.isDirect,
          depth: dep.depth || 0,
          vulnerabilityCount: pkg?.vulnerabilities?.length ?? 0,
          children: [], // Transitive deps would go here when we parse lockfiles
        });
      }

      // Sort: direct first, then by score ascending (riskiest first)
      directDeps.sort((a, b) => {
        if (a.isDirect !== b.isDirect) return a.isDirect ? -1 : 1;
        return (a.score ?? 0) - (b.score ?? 0);
      });

      tree.push({
        manifest: manifest.filePath,
        ecosystem: manifest.ecosystem,
        dependencies: directDeps,
      });
    }

    res.json({
      status: 'success',
      data: {
        tree,
        stats: {
          totalDependencies: latestScan.dependencyCount,
          manifests: latestScan.manifestCount,
          directCount: tree.reduce((sum, m) => sum + m.dependencies.filter(d => d.isDirect).length, 0),
          devCount: tree.reduce((sum, m) => sum + m.dependencies.filter(d => d.isDev).length, 0),
        },
      },
    });
  } catch (err) {
    next(err);
  }
}
