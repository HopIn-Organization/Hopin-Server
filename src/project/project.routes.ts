import { Router } from 'express';
import { ProjectController } from './project.controller';
import { ProjectMemberController } from '../projectMember/projectMember.controller';

const router = Router();
const projectController = new ProjectController();
const projectMemberController = new ProjectMemberController();

router.get('/', projectController.getAllProjects);
router.get('/:id', projectController.getProjectById);
router.post('/', projectController.createProject);
router.patch('/:projectId/members/:memberId/role', projectMemberController.updateMemberRole);
router.delete('/members/:memberId', projectMemberController.removeMember);

export default router;