import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { Repository } from '../models/Repository';
import { Scan } from '../models/Scan';
import { runInlineScan } from '../services/inlineScan.service';
import { config } from '../config/index';
import { logger } from '../utils/logger';

const log = logger.child({ controller: 'webhook' });

/**
 * Verify GitHub webhook signature (HMAC-SHA256).
 * If GITHUB_WEBHOOK_SECRET is not configured, skip verification (dev mode).
 */
function verifyGitHubSignature(req: Request): boolean {
  const secret = config.GITHUB_WEBHOOK_SECRET;
  if (!secret) return true; // skip in dev

  const signature = req.headers['x-hub-signature-256'] as string | undefined;
  if (!signature) return false;

  const body = JSON.stringify(req.body);
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

/**
 * GitHub webhook handler — triggers a scan on push events.
 * POST /api/webhooks/github
 */
export async function githubWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const event = req.headers['x-github-event'] as string;

    if (!verifyGitHubSignature(req)) {
      res.status(401).json({ status: 'error', message: 'Invalid signature' });
      return;
    }

    // Only handle push events
    if (event !== 'push') {
      res.json({ status: 'ok', message: `Ignored event: ${event}` });
      return;
    }

    const payload = req.body;
    const githubRepoId = payload.repository?.id;
    const ref = payload.ref as string; // e.g. "refs/heads/main"
    const commitSha = payload.after as string;

    if (!githubRepoId) {
      res.status(400).json({ status: 'error', message: 'Missing repository ID in payload' });
      return;
    }

    // Find all repos tracking this GitHub repository
    const repos = await Repository.find({ githubRepoId, isActive: true });

    if (repos.length === 0) {
      res.json({ status: 'ok', message: 'No tracked repositories match this push' });
      return;
    }

    const triggered: string[] = [];

    for (const repo of repos) {
      // Only scan pushes to the default branch
      const branch = ref.replace('refs/heads/', '');
      if (branch !== repo.defaultBranch) continue;

      // Skip if a scan is already running
      const activeScan = await Scan.findOne({
        repositoryId: repo._id,
        status: { $in: ['pending', 'scanning', 'enriching', 'scoring'] },
      });

      if (activeScan) {
        const ageMs = Date.now() - new Date(activeScan.createdAt).getTime();
        if (ageMs > 5 * 60 * 1000) {
          activeScan.status = 'failed';
          activeScan.errorMessage = 'Scan timed out';
          activeScan.completedAt = new Date();
          await activeScan.save();
        } else {
          log.info({ repoId: repo._id.toString() }, 'Skipping webhook scan — scan already running');
          continue;
        }
      }

      const scan = new Scan({
        repositoryId: repo._id,
        status: 'pending',
        triggeredBy: 'webhook',
        commitSha: commitSha || undefined,
      });

      await scan.save();
      runInlineScan(scan._id.toString()).catch(() => {});
      triggered.push(repo.fullName);
    }

    log.info({ triggered, ref }, 'Webhook push processed');

    res.json({
      status: 'success',
      data: {
        triggered,
        message: triggered.length > 0
          ? `Scans triggered for: ${triggered.join(', ')}`
          : 'Push was not to default branch of any tracked repo',
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GitHub PR webhook handler — analyzes dependency changes and posts review comments.
 * POST /api/webhooks/github/pr
 */
export async function githubPRWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const event = req.headers['x-github-event'] as string;

    if (!verifyGitHubSignature(req)) {
      res.status(401).json({ status: 'error', message: 'Invalid signature' });
      return;
    }

    // Only handle pull_request events with relevant actions
    if (event !== 'pull_request') {
      res.json({ status: 'ok', message: `Ignored event: ${event}` });
      return;
    }

    const action = req.body.action;
    if (!['opened', 'synchronize', 'reopened'].includes(action)) {
      res.json({ status: 'ok', message: `Ignored PR action: ${action}` });
      return;
    }

    const payload = req.body;
    const githubRepoId = payload.repository?.id;
    const prNumber = payload.pull_request?.number;
    const prOwner = payload.repository?.owner?.login;
    const prRepoName = payload.repository?.name;

    if (!githubRepoId || !prNumber) {
      res.status(400).json({ status: 'error', message: 'Missing repository or PR info' });
      return;
    }

    // Find repo in our system
    const repo = await Repository.findOne({ githubRepoId, isActive: true }).populate('userId');
    if (!repo) {
      res.json({ status: 'ok', message: 'Repository not tracked' });
      return;
    }

    // Get the user's access token to call GitHub API
    const { User } = await import('../models/User');
    const { decrypt } = await import('../utils/encryption');
    const user = await User.findById(repo.userId);
    if (!user) {
      res.json({ status: 'ok', message: 'Repository owner not found' });
      return;
    }

    const accessToken = decrypt(user.accessToken);

    // Fetch PR files to check for manifest changes
    const manifestFiles = [
      'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
      'requirements.txt', 'Pipfile', 'Pipfile.lock', 'pyproject.toml', 'poetry.lock',
      'Gemfile', 'Gemfile.lock', 'go.mod', 'go.sum',
      'Cargo.toml', 'Cargo.lock', 'composer.json', 'composer.lock',
      'build.gradle', 'pom.xml', '*.csproj', 'packages.config',
    ];

    const prFilesRes = await fetch(
      `https://api.github.com/repos/${prOwner}/${prRepoName}/pulls/${prNumber}/files`,
      { headers: { Authorization: `token ${accessToken}`, Accept: 'application/vnd.github.v3+json' } },
    );

    if (!prFilesRes.ok) {
      log.warn({ status: prFilesRes.status }, 'Failed to fetch PR files');
      res.json({ status: 'ok', message: 'Could not fetch PR files' });
      return;
    }

    const prFiles: Array<{ filename: string; status: string }> = await prFilesRes.json();

    const changedManifests = prFiles.filter(f =>
      manifestFiles.some(pattern => {
        if (pattern.startsWith('*')) return f.filename.endsWith(pattern.slice(1));
        return f.filename.endsWith(pattern);
      }),
    );

    if (changedManifests.length === 0) {
      res.json({ status: 'ok', message: 'No dependency file changes detected' });
      return;
    }

    // Build a comment summarizing the changes
    const lastScan = await Scan.findOne({ repositoryId: repo._id, status: 'completed' }).sort({ createdAt: -1 }).lean();
    const { DependencyScore } = await import('../models/DependencyScore');
    const { Package } = await import('../models/Package');

    let commentBody = '## 📦 Stack Decay Score — Dependency Change Review\n\n';
    commentBody += `This PR modifies **${changedManifests.length}** dependency file(s):\n`;
    changedManifests.forEach(f => {
      commentBody += `- \`${f.filename}\` (${f.status})\n`;
    });

    if (lastScan) {
      const depScores = await DependencyScore.find({ scanId: lastScan._id })
        .populate('packageId')
        .sort({ compositeScore: 1 })
        .limit(5)
        .lean();

      if (depScores.length > 0) {
        commentBody += '\n### ⚠️ Current Riskiest Dependencies\n\n';
        commentBody += '| Package | Score | Grade | Issue |\n';
        commentBody += '|---------|-------|-------|-------|\n';
        for (const ds of depScores) {
          const pkg = ds.packageId as unknown as Record<string, unknown>;
          const vulns = (pkg?.vulnerabilities as unknown[] || []).length;
          const issue = vulns > 0 ? `${vulns} vulnerabilities` : ds.compositeScore < 40 ? 'Low health score' : 'Monitor';
          commentBody += `| ${pkg?.name || 'Unknown'} | ${ds.compositeScore}/100 | ${ds.grade} | ${issue} |\n`;
        }
      }

      commentBody += `\n**Current repo health:** ${repo.latestScore}/100 (Grade: ${repo.latestGrade})\n`;
    }

    commentBody += '\n---\n*🤖 Automated by Stack Decay Score*';

    // Post the comment on the PR
    const commentRes = await fetch(
      `https://api.github.com/repos/${prOwner}/${prRepoName}/issues/${prNumber}/comments`,
      {
        method: 'POST',
        headers: {
          Authorization: `token ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body: commentBody }),
      },
    );

    if (!commentRes.ok) {
      log.warn({ status: commentRes.status }, 'Failed to post PR comment');
    }

    log.info({ repo: repo.fullName, prNumber }, 'PR comment posted');

    res.json({
      status: 'success',
      data: { commented: true, manifests: changedManifests.map(f => f.filename) },
    });
  } catch (err) {
    next(err);
  }
}
