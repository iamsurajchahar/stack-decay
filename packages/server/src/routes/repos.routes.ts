import { Router } from 'express';
import * as reposController from '../controllers/repos.controller';
import * as eolController from '../controllers/eol.controller';
import * as vulnController from '../controllers/vulnerabilities.controller';
import * as licensesController from '../controllers/licenses.controller';
import * as exportController from '../controllers/export.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, reposController.list);
router.get('/available', authenticate, reposController.listAvailable);
router.post('/', authenticate, reposController.create);
router.get('/:repoId/export/dependencies', authenticate, exportController.exportDependencies);
router.get('/:repoId/export/vulnerabilities', authenticate, exportController.exportVulnerabilities);
router.get('/:repoId/export/report', authenticate, exportController.exportFullReport);
router.get('/:repoId/export/pdf', authenticate, exportController.exportPdfReport);
router.get('/:repoId/eol', authenticate, eolController.getRepoEol);
router.get('/:repoId/vulnerabilities', authenticate, vulnController.getRepoVulnerabilities);
router.get('/:repoId/licenses', authenticate, licensesController.getRepoLicenses);
router.get('/:repoId', authenticate, reposController.getById);
router.patch('/:repoId', authenticate, reposController.update);
router.delete('/:repoId', authenticate, reposController.remove);

export default router;
