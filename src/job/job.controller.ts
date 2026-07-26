import { Request, Response } from 'express';
import { JobService } from './job.service';

export class JobController {
  private jobService: JobService;

  constructor() {
    this.jobService = new JobService();
  }

  getAllJobs = async (_req: Request, res: Response): Promise<void> => {
    try {
      const jobs = await this.jobService.getAllJobs();
      res.json(jobs);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error fetching jobs';
      res.status(500).json({ message });
    }
  };

  getJobById = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.jobId as string);
      const job = await this.jobService.getJobById(id);
      if (job) {
        res.json(job);
      } else {
        res.status(404).json({ message: 'Job not found' });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error fetching job';
      res.status(500).json({ message });
    }
  };

  createJob = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId, ...jobData } = req.body;
      if (!jobData || !jobData.title) {
        res.status(400).json({ message: 'Title is required' });
        return;
      }
      if (!projectId || typeof projectId !== 'number') {
        res.status(400).json({ message: 'projectId is required' });
        return;
      }
      const job = await this.jobService.createJob({
        ...jobData,
        project: { id: projectId },
      });
      res.status(201).json(job);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error creating job';
      res.status(500).json({ message });
    }
  };

  addSkillsToJob = async (req: Request, res: Response): Promise<void> => {
    try {
      const jobId = parseInt(req.params.jobId as string);
      const { skills, projectId } = req.body;

      if (!projectId || typeof projectId !== 'number') {
        res.status(400).json({ message: 'projectId is required' });
        return;
      }

      if (!Array.isArray(skills) || !skills.every(s => typeof s === 'string')) {
        res
          .status(400)
          .json({ message: 'Skills should be an array of strings' });
        return;
      }

      const job = await this.jobService.addSkillsToJob(jobId, skills);

      if (job) {
        res.json(job);
      } else {
        res.status(404).json({ message: 'Job not found' });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error adding skills to job';
      res.status(500).json({ message });
    }
  };
}
