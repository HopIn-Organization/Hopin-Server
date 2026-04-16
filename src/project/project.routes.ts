import { Router } from 'express';
import { ProjectController } from './project.controller';

const router = Router();
const projectController = new ProjectController();

router.get('/', projectController.getAllProjects);
router.get('/:id', projectController.getProjectById);
router.post('/', projectController.createProject);

export default router;