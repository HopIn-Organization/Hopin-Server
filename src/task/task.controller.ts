import { NextFunction, Request, Response } from 'express';
import { TaskService } from './task.service';
import { SubtaskInput } from './task.repository';

export class TaskController {
  private taskService: TaskService;

  constructor() {
    this.taskService = new TaskService();
  }

  completeTask = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const taskId = parseInt(req.params.taskId as string);

      if (isNaN(taskId)) {
        res.status(400).json({ error: 'taskId must be a valid number' });
        return;
      }

      const task = await this.taskService.completeTask(taskId);

      if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      res.status(200).json({ task });
    } catch (error) {
      next(error);
    }
  };

  deleteTask = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const taskId = parseInt(req.params.taskId as string);
      const { projectId } = req.body;

      if (!projectId || typeof projectId !== 'number') {
        res.status(400).json({ error: 'projectId is required' });
        return;
      }

      if (isNaN(taskId)) {
        res.status(400).json({ error: 'taskId must be a valid number' });
        return;
      }

      const deleted = await this.taskService.deleteTask(taskId);

      if (!deleted) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  upsertTask = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id, order, title, description, estimatedDays, isCompleted, links, onboardingId, parentId, subtasks, projectId } = req.body;

      if (!projectId || typeof projectId !== 'number') {
        res.status(400).json({ error: 'projectId is required' });
        return;
      }

      if (id === undefined) {
        if (typeof order !== 'number' || typeof title !== 'string' || typeof description !== 'string' || typeof estimatedDays !== 'number') {
          res.status(400).json({ error: 'order (number), title (string), description (string), and estimatedDays (number) are required when creating a task' });
          return;
        }
      } else if (typeof id !== 'number') {
        res.status(400).json({ error: 'id must be a number' });
        return;
      }

      if (subtasks !== undefined) {
        if (!Array.isArray(subtasks)) {
          res.status(400).json({ error: 'subtasks must be an array' });
          return;
        }
        for (const s of subtasks as SubtaskInput[]) {
          if (s.id !== undefined && typeof s.id !== 'number') {
            res.status(400).json({ error: 'subtask id must be a number' });
            return;
          }
          if (s.id === undefined) {
            if (typeof s.title !== 'string' || typeof s.description !== 'string' || typeof s.estimatedDays !== 'number') {
              res.status(400).json({ error: 'title (string), description (string), and estimatedDays (number) are required when creating a subtask' });
              return;
            }
          }
          if (s.title !== undefined && typeof s.title !== 'string') {
            res.status(400).json({ error: 'subtask title must be a string' });
            return;
          }
          if (s.description !== undefined && typeof s.description !== 'string') {
            res.status(400).json({ error: 'subtask description must be a string' });
            return;
          }
          if (s.estimatedDays !== undefined && typeof s.estimatedDays !== 'number') {
            res.status(400).json({ error: 'subtask estimatedDays must be a number' });
            return;
          }
        }
      }

      const task = await this.taskService.upsertTask({ id, order, title, description, estimatedDays, isCompleted, links, onboardingId, parentId, subtasks });

      if (task === null) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      res.status(id === undefined ? 201 : 200).json({ task });
    } catch (error) {
      next(error);
    }
  };
}

export const taskController = new TaskController();
