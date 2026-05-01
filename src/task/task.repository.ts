import { Repository } from 'typeorm';
import { AppDataSource } from '../database/data-source';
import { Task } from './task.entity';

export class TaskRepository {
  private taskRepository: Repository<Task>;

  constructor() {
    this.taskRepository = AppDataSource.getRepository(Task);
  }


  async createTasks(data: Partial<Task>[]): Promise<Task[]> {
    const tasks = this.taskRepository.create(data);
    return this.taskRepository.save(tasks);
  }

  async completeTask(taskId: number): Promise<Task | null> {
    await this.taskRepository.update(taskId, { isCompleted: true });
    return this.taskRepository.findOneBy({ id: taskId });
  }
}