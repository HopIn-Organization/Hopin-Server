import { Router } from 'express';
import { requireProjectAdmin } from '../projectMember/projectMember.middleware';
import { githubController } from './github.controller';

const router = Router();

// requireProjectAdmin reads req.params.id — these routes are mounted at /projects,
// so /:id resolves to the projectId (matching the pattern in project.routes.ts)
router.post('/:id/github/connect', requireProjectAdmin, githubController.connect);
router.post('/:id/github/sync', requireProjectAdmin, githubController.sync);
router.get('/:id/github/status', requireProjectAdmin, githubController.status);
router.delete('/:id/github', requireProjectAdmin, githubController.disconnect);

export default router;
