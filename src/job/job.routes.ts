import { Router } from 'express';
import { JobController } from './job.controller';

const router = Router();
const jobController = new JobController();

router.get('/', jobController.getAllJobs);
router.get('/:jobId', jobController.getJobById);
router.post('/', jobController.createJob);
router.post('/:jobId/skills', jobController.addSkillsToJob);

export default router;