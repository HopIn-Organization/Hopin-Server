import { Task } from './task.entity';
import { TaskRepository } from './task.repository';

export class TaskService {
  private taskRepository: TaskRepository;

  constructor() {
    this.taskRepository = new TaskRepository();
  }

  async createTasks(tasksData: Partial<Task>[]): Promise<Task[]> {
    return this.taskRepository.createTasks(tasksData);
  }
}