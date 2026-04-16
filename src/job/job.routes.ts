import { Router } from 'express';
import { JobController } from './job.controller';
import { authenticateAccessToken } from '../auth/auth.middleware';

const router = Router();
const jobController = new JobController();

router.get('/jobs', jobController.getAllJobs);
router.get('/jobs/:jobId', jobController.getJobById);
router.post('/jobs', authenticateAccessToken, jobController.createJob);
router.post('/jobs/:jobId/skills', authenticateAccessToken, jobController.addSkillsToJob);

export default router;