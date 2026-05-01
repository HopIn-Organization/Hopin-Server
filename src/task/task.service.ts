import { Task } from './task.entity';
import { TaskRepository, UpsertTaskInput } from './task.repository';

export class TaskService {
  private taskRepository: TaskRepository;

  constructor() {
    this.taskRepository = new TaskRepository();
  }

  async createTasks(tasksData: Partial<Task>[]): Promise<Task[]> {
    return this.taskRepository.createTasks(tasksData);
  }

  async completeTask(taskId: number): Promise<Task | null> {
    return this.taskRepository.completeTask(taskId);
  }

  async deleteTask(taskId: number): Promise<boolean> {
    return this.taskRepository.deleteTask(taskId);
  }

  async upsertTask(data: UpsertTaskInput): Promise<Task | null> {
    return this.taskRepository.upsertTask(data);
  }
}