import { Router } from 'express';
import { ProjectController } from './project.controller';
import { authenticateAccessToken } from '../auth/auth.middleware';

const router = Router();
const projectController = new ProjectController();

router.get('/projects', projectController.getAllProjects);
router.get('/projects/:id', projectController.getProjectById);
router.post('/projects', authenticateAccessToken, projectController.createProject);

export default router;