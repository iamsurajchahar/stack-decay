import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Repository } from '../models/Repository';
import { Scan } from '../models/Scan';
import { Package } from '../models/Package';
import { DependencyScore } from '../models/DependencyScore';
import { AppError } from '../middleware/errorHandler.middleware';

export async function globalSearch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = (req.query.q as string || '').trim();
    if (!query || query.length < 2) {
      res.json({ status: 'success', data: { results: [] } });
      return;
    }

    // Get user's repos
    const repos = await Repository.find({ userId: new Types.ObjectId(req.userId!), isActive: true }).lean();
    if (repos.length === 0) {
      res.json({ status: 'success', data: { results: [] } });
      return;
    }

    // Search packages matching the query
    const matchingPackages = await Package.find({
      name: { $regex: query, $options: 'i' },
    }).select('_id name ecosystem license latestVersion').limit(50).lean();

    if (matchingPackages.length === 0) {
      // Also search repos by name
      const matchingRepos = repos
        .filter(r => r.fullName.toLowerCase().includes(query.toLowerCase()))
        .map(r => ({ type: 'repo' as const, id: (r._id as Types.ObjectId).toHexString(), name: r.fullName, score: r.latestScore, grade: r.latestGrade }));

      res.json({ status: 'success', data: { results: matchingRepos } });
      return;
    }

    const packageIds = matchingPackages.map(p => p._id);

    // Find which repos use these packages (via scans)
    const repoIds = repos.map(r => r._id);
    const scans = await Scan.find({
      repositoryId: { $in: repoIds },
      status: 'completed',
    }).sort({ createdAt: -1 }).lean();

    // Get latest scan per repo
    const latestScanByRepo = new Map<string, typeof scans[0]>();
    for (const scan of scans) {
      const key = scan.repositoryId.toString();
      if (!latestScanByRepo.has(key)) latestScanByRepo.set(key, scan);
    }

    // Build results: which packages in which repos
    const results: Array<{
      type: 'package';
      packageName: string;
      ecosystem: string;
      version: string;
      license: string | null;
      repos: Array<{ repoId: string; repoName: string; score?: number }>;
    }> = [];

    const pkgMap = new Map(matchingPackages.map(p => [(p._id as Types.ObjectId).toHexString(), p]));

    for (const [repoIdStr, scan] of latestScanByRepo) {
      const repo = repos.find(r => (r._id as Types.ObjectId).toHexString() === repoIdStr);
      if (!repo) continue;

      for (const manifest of scan.manifests || []) {
        for (const dep of manifest.dependencies || []) {
          if (!dep.packageId) continue;
          const depPkgId = dep.packageId.toString();
          const pkg = pkgMap.get(depPkgId);
          if (!pkg) continue;

          let existing = results.find(r => r.packageName === pkg.name && r.ecosystem === pkg.ecosystem);
          if (!existing) {
            existing = {
              type: 'package',
              packageName: pkg.name,
              ecosystem: pkg.ecosystem,
              version: pkg.latestVersion || '',
              license: pkg.license,
              repos: [],
            };
            results.push(existing);
          }
          if (!existing.repos.find(r => r.repoId === repoIdStr)) {
            existing.repos.push({
              repoId: repoIdStr,
              repoName: repo.fullName,
            });
          }
        }
      }
    }

    // Also include matching repos
    const repoResults = repos
      .filter(r => r.fullName.toLowerCase().includes(query.toLowerCase()))
      .map(r => ({ type: 'repo' as const, id: (r._id as Types.ObjectId).toHexString(), name: r.fullName, score: r.latestScore, grade: r.latestGrade }));

    res.json({
      status: 'success',
      data: { results: [...repoResults, ...results].slice(0, 30) },
    });
  } catch (err) {
    next(err);
  }
}
