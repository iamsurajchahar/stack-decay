import { Request, Response, NextFunction } from 'express';
import { Repository } from '../models/Repository';
import { RepoScoreSnapshot } from '../models/RepoScoreSnapshot';
import { Scan } from '../models/Scan';
import { DependencyScore } from '../models/DependencyScore';
import { Package } from '../models/Package';
import { Types } from 'mongoose';

/**
 * GET /api/team/overview
 * Aggregate dashboard across all repos for the current user.
 */
export async function getTeamOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = new Types.ObjectId(req.userId!);
    const repos = await Repository.find({ userId, isActive: true }).lean();

    if (repos.length === 0) {
      res.json({
        status: 'success',
        data: {
          overview: {
            totalRepos: 0, avgScore: 0, bestRepo: null, worstRepo: null,
            gradeDistribution: {}, ecosystemDistribution: {},
            totalDependencies: 0, totalVulnerable: 0, totalDeprecated: 0,
            repoScores: [], sharedVulnerabilities: [],
          },
        },
      });
      return;
    }

    // Gather latest snapshots
    const repoScores: Array<{
      id: string; name: string; fullName: string; score: number; grade: string;
      vulnerableCount: number; deprecatedCount: number; totalDeps: number;
      language: string; lastScannedAt: string | null;
    }> = [];

    const gradeDistribution: Record<string, number> = {};
    const ecosystemDistribution: Record<string, number> = {};
    let totalDeps = 0;
    let totalVulnerable = 0;
    let totalDeprecated = 0;

    for (const repo of repos) {
      const snapshot = await RepoScoreSnapshot.findOne({ repositoryId: repo._id })
        .sort({ snapshotDate: -1 }).lean();

      const score = snapshot?.compositeScore ?? repo.latestScore ?? 0;
      const grade = snapshot?.grade ?? repo.latestGrade ?? 'N/A';

      gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;
      if (repo.language) {
        ecosystemDistribution[repo.language] = (ecosystemDistribution[repo.language] || 0) + 1;
      }

      const vulnCount = snapshot?.vulnerableCount ?? 0;
      const deprecatedCount = snapshot?.deprecatedCount ?? 0;
      const deps = snapshot?.totalDependencies ?? 0;

      totalDeps += deps;
      totalVulnerable += vulnCount;
      totalDeprecated += deprecatedCount;

      repoScores.push({
        id: repo._id.toString(),
        name: repo.name,
        fullName: repo.fullName,
        score,
        grade,
        vulnerableCount: vulnCount,
        deprecatedCount,
        totalDeps: deps,
        language: repo.language,
        lastScannedAt: repo.lastScannedAt?.toISOString() ?? null,
      });
    }

    repoScores.sort((a, b) => a.score - b.score);

    const avgScore = repoScores.length > 0
      ? Math.round(repoScores.reduce((sum, r) => sum + r.score, 0) / repoScores.length)
      : 0;

    // Find shared vulnerabilities across repos
    const sharedVulnerabilities: Array<{
      packageName: string; severity: string; summary: string;
      affectedRepos: string[]; sourceId: string;
    }> = [];

    // Collect package IDs per repo
    const vulnPackageMap = new Map<string, Set<string>>();

    for (const repo of repos) {
      const scan = await Scan.findOne({ repositoryId: repo._id, status: 'completed' })
        .sort({ createdAt: -1 }).lean();
      if (!scan) continue;

      for (const m of scan.manifests || []) {
        for (const d of m.dependencies || []) {
          if (d.packageId) {
            const pkgId = d.packageId.toString();
            if (!vulnPackageMap.has(pkgId)) vulnPackageMap.set(pkgId, new Set());
            vulnPackageMap.get(pkgId)!.add(repo.fullName);
          }
        }
      }
    }

    // Find packages with vulnerabilities used by multiple repos
    if (vulnPackageMap.size > 0) {
      const multiRepoPackages = Array.from(vulnPackageMap.entries())
        .filter(([, repos]) => repos.size > 1)
        .map(([pkgId]) => pkgId);

      if (multiRepoPackages.length > 0) {
        const vulnPackages = await Package.find({
          _id: { $in: multiRepoPackages.map(id => new Types.ObjectId(id)) },
          'vulnerabilities.0': { $exists: true },
        }).select('name vulnerabilities').lean();

        for (const pkg of vulnPackages) {
          for (const v of pkg.vulnerabilities.slice(0, 3)) {
            sharedVulnerabilities.push({
              packageName: pkg.name,
              severity: v.severity,
              summary: v.summary,
              affectedRepos: Array.from(vulnPackageMap.get(pkg._id.toString()) || []),
              sourceId: v.sourceId,
            });
          }
        }

        sharedVulnerabilities.sort((a, b) => {
          const order = { critical: 0, high: 1, medium: 2, low: 3 };
          return (order[a.severity as keyof typeof order] ?? 4) - (order[b.severity as keyof typeof order] ?? 4);
        });
      }
    }

    res.json({
      status: 'success',
      data: {
        overview: {
          totalRepos: repos.length,
          avgScore,
          bestRepo: repoScores[repoScores.length - 1] || null,
          worstRepo: repoScores[0] || null,
          gradeDistribution,
          ecosystemDistribution,
          totalDependencies: totalDeps,
          totalVulnerable,
          totalDeprecated,
          repoScores,
          sharedVulnerabilities: sharedVulnerabilities.slice(0, 10),
        },
      },
    });
  } catch (err) {
    next(err);
  }
}
