import { Request, Response } from 'express';
import { ProjectService } from './project.service';

export class ProjectController {
  private projectService: ProjectService;

  constructor() {
    this.projectService = new ProjectService();
  }

  getAllProjects = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const projects = await this.projectService.getProjectsByUser(userId);
      res.json(projects);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error fetching projects';
      res.status(500).json({ message });
    }
  };

  getProjectById = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id as string);
      const project = await this.projectService.getProjectById(id);
      if (project) {
        res.json(project);
      } else {
        res.status(404).json({ message: 'Project not found' });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error fetching project';
      res.status(500).json({ message });
    }
  };

  createProject = async (req: Request, res: Response): Promise<void> => {
    try {
      const projectData = req.body;

      if (!projectData || !projectData.name) {
        res.status(400).json({ message: 'Name is required' });
        return;
      }

      const project = await this.projectService.createProject(projectData);

      res.status(201).json(project);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error creating project';
      res.status(500).json({ message });
    }
  };

  updateProject = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id as string);
      const projectData = req.body;

      if (!projectData || !projectData.name) {
        res.status(400).json({ message: 'Name is required' });
        return;
      }

      const project = await this.projectService.updateProject(id, projectData);
      res.json(project);
    } catch (error: any) {
      if (error.message === 'Project not found') {
        res.status(404).json({ message: 'Project not found' });
      } else {
        res.status(500).json({ message: 'Error updating project' });
      }
    }
  };

  deleteProject = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id as string);
      await this.projectService.deleteProject(id);
      res.status(204).send();
    } catch (error: any) {
      console.error('[deleteProject] Error:', error?.message, error?.stack);
      if (error.message === 'Project not found') {
        res.status(404).json({ message: 'Project not found' });
      } else {
        res.status(500).json({ message: 'Error deleting project' });
      }
    }
  };

  getDetailedStatistics = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const id = parseInt(req.params.id as string);
      const statistics = await this.projectService.getDetailedStatistics(id);
      res.json(statistics);
    } catch (error: any) {
      if (error.message === 'Project not found') {
        res.status(404).json({ message: 'Project not found' });
      } else {
        console.error(
          '[getDetailedStatistics] Error:',
          error?.message,
          error?.stack
        );
        res.status(500).json({ message: 'Error fetching statistics' });
      }
    }
  };
}
