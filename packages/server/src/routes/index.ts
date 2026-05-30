import { Express } from 'express';
import authRoutes from './auth.routes';
import reposRoutes from './repos.routes';
import scansRoutes from './scans.routes';
import scoresRoutes from './scores.routes';
import dependenciesRoutes from './dependencies.routes';
import alertsRoutes from './alerts.routes';
import recommendationsRoutes from './recommendations.routes';
import dashboardRoutes from './dashboard.routes';
import { globalSearch } from '../controllers/search.controller';
import { githubWebhook, githubPRWebhook } from '../controllers/webhook.controller';
import * as digestController from '../controllers/digest.controller';
import { getDependencyTree } from '../controllers/deptree.controller';
import { comparePackages } from '../controllers/compare.controller';
import { getTeamOverview } from '../controllers/team.controller';
import { authenticate } from '../middleware/auth.middleware';

export function mountRoutes(app: Express): void {
  app.get('/api/search', authenticate, globalSearch);

  app.use('/api/auth', authRoutes);
  app.use('/api/repos', reposRoutes);
  app.use('/api/repos/:repoId/scans', scansRoutes);
  app.use('/api/repos/:repoId/scores', scoresRoutes);
  app.use('/api/repos/:repoId/recommendations', recommendationsRoutes);
  app.use('/api/packages', dependenciesRoutes);
  app.use('/api/alerts', alertsRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  // Webhooks (no auth — GitHub calls these directly)
  app.post('/api/webhooks/github', githubWebhook);
  app.post('/api/webhooks/github/pr', githubPRWebhook);

  // Weekly digest
  app.get('/api/digest/preview', authenticate, digestController.previewDigest);
  app.get('/api/digest/preview/html', authenticate, digestController.previewDigestHtml);
  app.patch('/api/digest/preferences', authenticate, digestController.updatePreferences);
  app.post('/api/digest/send', authenticate, digestController.triggerDigests);

  // Dependency tree
  app.get('/api/repos/:repoId/dependency-tree', authenticate, getDependencyTree);

  // Package comparison
  app.get('/api/packages/compare', authenticate, comparePackages);

  // Team dashboard
  app.get('/api/team/overview', authenticate, getTeamOverview);

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
}
