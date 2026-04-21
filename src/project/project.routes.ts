import { Router } from 'express';
import { ProjectController } from './project.controller';

const router = Router();
const projectController = new ProjectController();

/*
mission - initial-connect-project-page-to-server
5. maybe take care of remove member ? (not necceary probably) 
6. remove weird things from seed - make job unique to project member
7. put email in the seed
8. maybe add job column?
9. fix the three dots
10. cjange skill folder
*/
router.get('/', projectController.getAllProjects);
router.get('/:id', projectController.getProjectById);
router.post('/', projectController.createProject);
router.patch('/:projectId/members/:memberId/role', projectController.updateMemberRole);

export default router;