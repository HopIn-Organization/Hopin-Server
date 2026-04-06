import { Router } from 'express';
import { ProjectController } from './project.controller';
import { requireProjectAdmin, requireProjectAdminOrBootstrap } from './project.middleware';

const router = Router();
const projectController = new ProjectController();

router.get('/projects', projectController.getAllProjects);
router.get('/projects/:id', projectController.getProjectById);
router.post('/projects', projectController.createProject);

// Project membership routes
router.get('/projects/:id/users', projectController.getProjectMembers);
router.post('/projects/:id/users', requireProjectAdminOrBootstrap, projectController.addUserToProject);
router.patch('/projects/:id/users/:userId/role', requireProjectAdmin, projectController.assignRole);

export default router;