import { Router } from 'express';
import { JobController } from './job.controller';
import { authenticateAccessToken } from '../auth/auth.middleware';
import { requireProjectAdmin } from '../projectMember/projectMember.middleware';

const router = Router();
const jobController = new JobController();

router.get('/', jobController.getAllJobs);
router.get('/:jobId', jobController.getJobById);
router.post('/', requireProjectAdmin, jobController.createJob);
router.post('/:jobId/skills', requireProjectAdmin, jobController.addSkillsToJob);

export default router;