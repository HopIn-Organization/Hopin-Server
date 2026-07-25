import { Router } from 'express';
import { requireProjectAdmin } from '../projectMember/projectMember.middleware';
import { githubController } from './github.controller';

const router = Router();

// requireProjectAdmin reads req.params.id — these routes are mounted at /projects,
// so /:id resolves to the projectId (matching the pattern in project.routes.ts)
router.get('/:id/github', requireProjectAdmin, githubController.list);
router.post(
  '/:id/github/connect',
  requireProjectAdmin,
  githubController.connect
);
router.post(
  '/:id/github/:connectionId/sync',
  requireProjectAdmin,
  githubController.sync
);
router.delete(
  '/:id/github/:connectionId',
  requireProjectAdmin,
  githubController.disconnect
);

export default router;
