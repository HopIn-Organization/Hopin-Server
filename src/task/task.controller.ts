import { NextFunction, Request, Response } from 'express';
import { TaskService } from './task.service';

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
}

export const taskController = new TaskController();
