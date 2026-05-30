import { Router } from 'express';
import { ProjectController } from './project.controller';
import { ProjectMemberController } from '../projectMember/projectMember.controller';
import { requireProjectAdmin } from '../projectMember/projectMember.middleware';

const router = Router();
const projectController = new ProjectController();
const projectMemberController = new ProjectMemberController();

router.get('/', projectController.getAllProjects);
router.get('/:id', projectController.getProjectById);
router.post('/', projectController.createProject);
router.put('/:id', requireProjectAdmin, projectController.updateProject);
router.delete('/:id', requireProjectAdmin, projectController.deleteProject);
router.post('/:id/members', requireProjectAdmin, projectMemberController.addMember);
router.patch('/:id/members/:memberId/role', requireProjectAdmin, projectMemberController.updateMemberRole);
router.delete('/:id/members/:memberId', requireProjectAdmin, projectMemberController.removeMember);

export default router;