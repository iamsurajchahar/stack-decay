import { User, IUserDocument } from '../models/User';
import { Repository } from '../models/Repository';
import { RepoScoreSnapshot } from '../models/RepoScoreSnapshot';
import { Scan } from '../models/Scan';
import { Package } from '../models/Package';
import { DependencyScore } from '../models/DependencyScore';
import { Notification } from '../models/Notification';
import { logger } from '../utils/logger';

const log = logger.child({ service: 'digest' });

export interface DigestData {
  user: { displayName: string; email: string };
  generatedAt: string;
  period: { from: string; to: string };
  overallStats: {
    totalRepos: number;
    avgScore: number;
    scoreChange: number;
    totalVulnerabilities: number;
    newVulnerabilities: number;
  };
  repoSummaries: Array<{
    name: string;
    fullName: string;
    currentScore: number;
    previousScore: number | null;
    scoreChange: number;
    grade: string;
    vulnerableCount: number;
    lastScannedAt: string | null;
  }>;
  topActions: Array<{
    priority: 'critical' | 'high' | 'medium' | 'low';
    message: string;
    repoName: string;
  }>;
  newVulnerabilities: Array<{
    packageName: string;
    severity: string;
    summary: string;
    repoName: string;
  }>;
}

/**
 * Generate a digest for a specific user covering the last 7 days.
 */
export async function generateUserDigest(userId: string): Promise<DigestData | null> {
  const user = await User.findById(userId);
  if (!user || !user.email) return null;

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const repos = await Repository.find({ userId: user._id, isActive: true }).lean();
  if (repos.length === 0) return null;

  const repoSummaries: DigestData['repoSummaries'] = [];
  const topActions: DigestData['topActions'] = [];
  const newVulns: DigestData['newVulnerabilities'] = [];
  let totalScore = 0;
  let scoredCount = 0;
  let totalScoreChange = 0;
  let totalVulnCount = 0;
  let newVulnCount = 0;

  for (const repo of repos) {
    // Get current and previous snapshots
    const currentSnapshot = await RepoScoreSnapshot.findOne({ repositoryId: repo._id })
      .sort({ snapshotDate: -1 }).lean();
    const previousSnapshot = await RepoScoreSnapshot.findOne({
      repositoryId: repo._id,
      snapshotDate: { $lte: weekAgo },
    }).sort({ snapshotDate: -1 }).lean();

    const currentScore = currentSnapshot?.compositeScore ?? repo.latestScore ?? 0;
    const previousScore = previousSnapshot?.compositeScore ?? null;
    const scoreChange = previousScore !== null ? currentScore - previousScore : 0;

    if (currentScore > 0) {
      totalScore += currentScore;
      scoredCount++;
      totalScoreChange += scoreChange;
    }

    const vulnCount = currentSnapshot?.vulnerableCount ?? 0;
    totalVulnCount += vulnCount;

    repoSummaries.push({
      name: repo.name,
      fullName: repo.fullName,
      currentScore,
      previousScore,
      scoreChange,
      grade: currentSnapshot?.grade ?? repo.latestGrade ?? 'N/A',
      vulnerableCount: vulnCount,
      lastScannedAt: repo.lastScannedAt?.toISOString() ?? null,
    });

    // Check for score drops
    if (scoreChange <= -10) {
      topActions.push({
        priority: scoreChange <= -20 ? 'critical' : 'high',
        message: `Score dropped by ${Math.abs(scoreChange)} points (${previousScore} → ${currentScore})`,
        repoName: repo.fullName,
      });
    }

    // Check for vulnerabilities
    if (vulnCount > 0) {
      topActions.push({
        priority: vulnCount >= 5 ? 'critical' : vulnCount >= 2 ? 'high' : 'medium',
        message: `${vulnCount} vulnerable dependencies need attention`,
        repoName: repo.fullName,
      });
    }

    // Find new vulnerabilities this week
    const latestScan = await Scan.findOne({ repositoryId: repo._id, status: 'completed' })
      .sort({ createdAt: -1 }).lean();

    if (latestScan) {
      const packageIds = new Set<string>();
      for (const m of latestScan.manifests || []) {
        for (const d of m.dependencies || []) {
          if (d.packageId) packageIds.add(d.packageId.toString());
        }
      }

      if (packageIds.size > 0) {
        const packages = await Package.find({
          _id: { $in: Array.from(packageIds) },
          'vulnerabilities.publishedAt': { $gte: weekAgo },
        }).select('name vulnerabilities').lean();

        for (const pkg of packages) {
          for (const v of pkg.vulnerabilities) {
            if (new Date(v.publishedAt) >= weekAgo) {
              newVulnCount++;
              newVulns.push({
                packageName: pkg.name,
                severity: v.severity,
                summary: v.summary,
                repoName: repo.fullName,
              });
            }
          }
        }
      }
    }
  }

  // Sort actions by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  topActions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Sort repo summaries by score change (worst first)
  repoSummaries.sort((a, b) => a.scoreChange - b.scoreChange);

  return {
    user: { displayName: user.displayName, email: user.email },
    generatedAt: now.toISOString(),
    period: { from: weekAgo.toISOString(), to: now.toISOString() },
    overallStats: {
      totalRepos: repos.length,
      avgScore: scoredCount > 0 ? Math.round(totalScore / scoredCount) : 0,
      scoreChange: scoredCount > 0 ? Math.round(totalScoreChange / scoredCount) : 0,
      totalVulnerabilities: totalVulnCount,
      newVulnerabilities: newVulnCount,
    },
    repoSummaries,
    topActions: topActions.slice(0, 10),
    newVulnerabilities: newVulns.slice(0, 20),
  };
}

/**
 * Format a digest into an HTML email body.
 */
export function formatDigestEmail(digest: DigestData): { subject: string; html: string } {
  const subject = `Stack Decay Weekly: ${digest.overallStats.avgScore}/100 avg score — ${digest.overallStats.totalRepos} repos`;

  const scoreChangeIcon = (change: number) =>
    change > 0 ? '📈' : change < 0 ? '📉' : '➡️';

  const priorityBadge = (p: string) => {
    const colors: Record<string, string> = {
      critical: '#dc2626', high: '#ea580c', medium: '#ca8a04', low: '#16a34a',
    };
    return `<span style="background:${colors[p] || '#6b7280'};color:#fff;padding:2px 6px;border-radius:3px;font-size:11px;font-weight:600;">${p.toUpperCase()}</span>`;
  };

  let html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1f2937;">
      <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:24px;border-radius:12px 12px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:22px;">📊 Weekly Digest</h1>
        <p style="color:#e0e7ff;margin:4px 0 0;font-size:14px;">
          ${new Date(digest.period.from).toLocaleDateString()} – ${new Date(digest.period.to).toLocaleDateString()}
        </p>
      </div>

      <div style="background:#f9fafb;padding:20px;border:1px solid #e5e7eb;border-top:none;">
        <div style="display:flex;gap:16px;text-align:center;">
          <div style="flex:1;background:#fff;padding:12px;border-radius:8px;border:1px solid #e5e7eb;">
            <div style="font-size:28px;font-weight:700;color:#6366f1;">${digest.overallStats.avgScore}</div>
            <div style="font-size:12px;color:#6b7280;">Avg Score</div>
          </div>
          <div style="flex:1;background:#fff;padding:12px;border-radius:8px;border:1px solid #e5e7eb;">
            <div style="font-size:28px;font-weight:700;color:#6b7280;">${digest.overallStats.totalRepos}</div>
            <div style="font-size:12px;color:#6b7280;">Repos</div>
          </div>
          <div style="flex:1;background:#fff;padding:12px;border-radius:8px;border:1px solid #e5e7eb;">
            <div style="font-size:28px;font-weight:700;color:${digest.overallStats.newVulnerabilities > 0 ? '#dc2626' : '#16a34a'};">${digest.overallStats.newVulnerabilities}</div>
            <div style="font-size:12px;color:#6b7280;">New Vulns</div>
          </div>
        </div>
      </div>`;

  // Action items
  if (digest.topActions.length > 0) {
    html += `
      <div style="padding:20px;border:1px solid #e5e7eb;border-top:none;">
        <h2 style="font-size:16px;margin:0 0 12px;">🎯 Action Items</h2>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">`;
    for (const action of digest.topActions) {
      html += `
          <tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:8px 4px;">${priorityBadge(action.priority)}</td>
            <td style="padding:8px 4px;">${action.repoName}</td>
            <td style="padding:8px 4px;">${action.message}</td>
          </tr>`;
    }
    html += `</table></div>`;
  }

  // Repo summary table
  html += `
      <div style="padding:20px;border:1px solid #e5e7eb;border-top:none;">
        <h2 style="font-size:16px;margin:0 0 12px;">📦 Repository Scores</h2>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="border-bottom:2px solid #e5e7eb;text-align:left;">
              <th style="padding:6px 4px;">Repository</th>
              <th style="padding:6px 4px;">Score</th>
              <th style="padding:6px 4px;">Change</th>
              <th style="padding:6px 4px;">Grade</th>
            </tr>
          </thead>
          <tbody>`;
  for (const repo of digest.repoSummaries) {
    html += `
            <tr style="border-bottom:1px solid #f3f4f6;">
              <td style="padding:6px 4px;font-weight:500;">${repo.fullName}</td>
              <td style="padding:6px 4px;">${repo.currentScore}/100</td>
              <td style="padding:6px 4px;">${scoreChangeIcon(repo.scoreChange)} ${repo.scoreChange > 0 ? '+' : ''}${repo.scoreChange}</td>
              <td style="padding:6px 4px;"><strong>${repo.grade}</strong></td>
            </tr>`;
  }
  html += `</tbody></table></div>`;

  // New vulnerabilities
  if (digest.newVulnerabilities.length > 0) {
    html += `
      <div style="padding:20px;border:1px solid #e5e7eb;border-top:none;">
        <h2 style="font-size:16px;margin:0 0 12px;">🛡️ New Vulnerabilities</h2>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">`;
    for (const v of digest.newVulnerabilities) {
      const sevColor = v.severity === 'critical' ? '#dc2626' : v.severity === 'high' ? '#ea580c' : '#ca8a04';
      html += `
          <tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:6px 4px;"><span style="color:${sevColor};font-weight:600;">${v.severity.toUpperCase()}</span></td>
            <td style="padding:6px 4px;font-weight:500;">${v.packageName}</td>
            <td style="padding:6px 4px;">${v.summary}</td>
          </tr>`;
    }
    html += `</table></div>`;
  }

  html += `
      <div style="padding:16px 20px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;background:#f9fafb;text-align:center;">
        <p style="margin:0;font-size:12px;color:#9ca3af;">
          Stack Decay Score — Automated weekly digest
        </p>
      </div>
    </div>`;

  return { subject, html };
}

/**
 * Generate and send weekly digests for all users who have opted in.
 */
export async function sendWeeklyDigests(): Promise<{ sent: number; errors: number }> {
  const users = await User.find({ digestEnabled: { $ne: false } }).lean();
  let sent = 0;
  let errors = 0;

  for (const user of users) {
    try {
      const digest = await generateUserDigest(user._id.toString());
      if (!digest) continue;

      const { subject, html } = formatDigestEmail(digest);

      // Store as notification record
      await Notification.create({
        userId: user._id,
        channel: 'email',
        subject,
        body: html,
        status: 'pending',
      });

      sent++;
      log.info({ userId: user._id.toString() }, 'Weekly digest generated');
    } catch (err: any) {
      errors++;
      log.error({ err: err.message, userId: user._id.toString() }, 'Failed to generate digest');
    }
  }

  return { sent, errors };
}
