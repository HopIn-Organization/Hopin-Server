import { Request, Response } from 'express';
import { ProjectService } from './project.service';
import { ProjectRole } from '../database/entities/project-user.entity';

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

  getProjectMembers = async (req: Request, res: Response): Promise<void> => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await this.projectService.getProjectById(projectId);
      if (!project) {
        res.status(404).json({ message: 'Project not found' });
        return;
      }
      const members = await this.projectService.getProjectMembers(projectId);
      res.json(members);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching project members' });
    }
  };

  addUserToProject = async (req: Request, res: Response): Promise<void> => {
    try {
      const projectId = parseInt(req.params.id);
      const { userId, role } = req.body;

      if (!userId) {
        res.status(400).json({ message: 'userId is required' });
        return;
      }

      const project = await this.projectService.getProjectById(projectId);
      if (!project) {
        res.status(404).json({ message: 'Project not found' });
        return;
      }

      const existing = await this.projectService.getMembership(projectId, userId);
      if (existing) {
        res.status(409).json({ message: 'User is already a member of this project' });
        return;
      }

      // First user added to a project automatically becomes admin
      const memberCount = await this.projectService.countProjectMembers(projectId);
      const assignedRole: ProjectRole =
        memberCount === 0 ? ProjectRole.ADMIN : (role in ProjectRole ? role : ProjectRole.TRAINEE);

      const membership = await this.projectService.addUserToProject(projectId, userId, assignedRole);
      res.status(201).json(membership);
    } catch (error) {
      res.status(500).json({ message: 'Error adding user to project' });
    }
  };

  assignRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = parseInt(req.params.userId);
      const { role } = req.body;

      if (!role || !(role in ProjectRole)) {
        res.status(400).json({ message: `role must be one of: ${Object.values(ProjectRole).join(', ')}` });
        return;
      }

      const membership = await this.projectService.assignRole(projectId, userId, role as ProjectRole);
      if (!membership) {
        res.status(404).json({ message: 'User is not a member of this project' });
        return;
      }

      res.json(membership);
    } catch (error) {
      res.status(500).json({ message: 'Error assigning role' });
    }
  };
}