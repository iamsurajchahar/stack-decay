import { Request, Response, NextFunction } from 'express';
import { Package } from '../models/Package';
import { AppError } from '../middleware/errorHandler.middleware';

/**
 * GET /api/packages/compare?packages=react,vue&ecosystem=npm
 * Compare two or more packages side by side.
 */
export async function comparePackages(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const packageNames = (req.query.packages as string || '').split(',').map(s => s.trim()).filter(Boolean);
    const ecosystem = (req.query.ecosystem as string) || 'npm';

    if (packageNames.length < 2) {
      throw new AppError('At least two package names are required', 400, 'INSUFFICIENT_PACKAGES');
    }
    if (packageNames.length > 5) {
      throw new AppError('Maximum 5 packages can be compared at once', 400, 'TOO_MANY_PACKAGES');
    }

    const packages = await Package.find({
      name: { $in: packageNames },
      ecosystem,
    }).lean();

    // Build comparison data
    const comparison = packageNames.map(name => {
      const pkg = packages.find(p => p.name === name);
      if (!pkg) {
        return {
          name,
          ecosystem,
          found: false,
          latestVersion: null,
          license: null,
          description: null,
          health: null,
          vulnerabilities: [],
          scores: null,
        };
      }

      const health = pkg.latestHealth;

      return {
        name: pkg.name,
        ecosystem: pkg.ecosystem,
        found: true,
        latestVersion: pkg.latestVersion,
        license: pkg.license,
        description: pkg.description,
        repoUrl: pkg.repoUrl,
        homepageUrl: pkg.homepageUrl,
        health: health ? {
          maintenance: health.maintenance,
          community: health.community,
          vulnerability: health.vulnerability,
          eol: health.eol,
          license: health.license,
        } : null,
        vulnerabilities: (pkg.vulnerabilities || []).map(v => ({
          sourceId: v.sourceId,
          severity: v.severity,
          summary: v.summary,
          fixedVersion: v.fixedVersion,
        })),
        lastEnrichedAt: pkg.lastEnrichedAt,
      };
    });

    // Generate comparison highlights
    const highlights: string[] = [];
    const found = comparison.filter(c => c.found && c.health);

    if (found.length >= 2) {
      // Compare stars
      const byStars = [...found].sort((a, b) =>
        (b.health!.community.starsCount || 0) - (a.health!.community.starsCount || 0));
      if (byStars[0].health!.community.starsCount > 0) {
        highlights.push(`${byStars[0].name} has the most stars (${byStars[0].health!.community.starsCount.toLocaleString()})`);
      }

      // Compare maintenance
      const byMaintenance = [...found].sort((a, b) =>
        (a.health!.maintenance.daysSinceLastRelease || 999) - (b.health!.maintenance.daysSinceLastRelease || 999));
      if (byMaintenance[0].health!.maintenance.daysSinceLastRelease !== undefined) {
        highlights.push(`${byMaintenance[0].name} was released most recently (${byMaintenance[0].health!.maintenance.daysSinceLastRelease}d ago)`);
      }

      // Compare vulnerabilities
      const byVulns = [...found].sort((a, b) =>
        (a.health!.vulnerability.openCveCount || 0) - (b.health!.vulnerability.openCveCount || 0));
      const leastVulns = byVulns[0];
      if (found.some(f => (f.health!.vulnerability.openCveCount || 0) > 0)) {
        highlights.push(`${leastVulns.name} has the fewest open CVEs (${leastVulns.health!.vulnerability.openCveCount})`);
      }

      // Compare downloads
      const byDownloads = [...found].sort((a, b) =>
        (b.health!.community.downloadsLastWeek || 0) - (a.health!.community.downloadsLastWeek || 0));
      if (byDownloads[0].health!.community.downloadsLastWeek > 0) {
        highlights.push(`${byDownloads[0].name} has the most weekly downloads (${byDownloads[0].health!.community.downloadsLastWeek.toLocaleString()})`);
      }
    }

    res.json({
      status: 'success',
      data: {
        comparison,
        highlights,
      },
    });
  } catch (err) {
    next(err);
  }
}
