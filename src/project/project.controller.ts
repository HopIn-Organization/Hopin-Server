import { Request, Response } from 'express';
import { ProjectService } from './project.service';

export class ProjectController {
  private projectService: ProjectService;

  constructor() {
    this.projectService = new ProjectService();
  }

  getAllProjects = async (req: Request, res: Response): Promise<void> => {
    try {
      const projects = await this.projectService.getAllProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching projects' });
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
      res.status(500).json({ message: 'Error fetching project' });
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
      res.status(500).json({ message: 'Error creating project' });
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
}