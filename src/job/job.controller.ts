import { Request, Response } from 'express';
import { JobService } from './job.service';

export class JobController {
  private jobService: JobService;

  constructor() {
    this.jobService = new JobService();
  }

  getAllJobs = async (req: Request, res: Response): Promise<void> => {
    try {
      const jobs = await this.jobService.getAllJobs();
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching jobs' });
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
      res.status(500).json({ message: 'Error fetching job' });
    }
  };

  createJob = async (req: Request, res: Response): Promise<void> => {
    try {
      const jobData = req.body;
      if (!jobData || !jobData.title) {
        res.status(400).json({ message: 'Title is required' });
        return;
      }
      const job = await this.jobService.createJob(jobData);
      res.status(201).json(job);
    } catch (error) {
      res.status(500).json({ message: 'Error creating job' });
    }
  };

  addSkillsToJob = async (req: Request, res: Response): Promise<void> => {
    try {
      const jobId = parseInt(req.params.jobId as string);
      const { skills } = req.body;
      if (!Array.isArray(skills) || !skills.every((s) => typeof s === 'string')) {
        res.status(400).json({ message: 'Skills should be an array of strings' });
        return;
      }
      const job = await this.jobService.addSkillsToJob(jobId, skills);
      if (job) {
        res.json(job);
      } else {
        res.status(404).json({ message: 'Job not found' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Error adding skills to job' });
    }
  };
}