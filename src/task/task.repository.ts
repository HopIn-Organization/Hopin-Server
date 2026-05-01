import { DeepPartial, Repository } from 'typeorm';
import { AppDataSource } from '../database/data-source';
import { Task } from './task.entity';

export interface UpsertTaskInput {
  id?: number;
  order?: number;
  title?: string;
  description?: string;
  estimatedDays?: number;
  isCompleted?: boolean;
  links?: string[];
  onboardingId?: number;
  parentId?: number | null;
}

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

  async deleteTask(taskId: number): Promise<boolean> {
    const result = await this.taskRepository.delete(taskId);
    return (result.affected ?? 0) > 0;
  }

  async upsertTask(data: UpsertTaskInput): Promise<Task | null> {
    const { id, onboardingId, parentId, ...rest } = data;

    const entityData: DeepPartial<Task> = { ...rest };
    if (onboardingId !== undefined) entityData.onboarding = { id: onboardingId };
    if (parentId !== undefined) entityData.parent = parentId != null ? { id: parentId } : undefined;

    if (id !== undefined) {
      await this.taskRepository.update(id, entityData);
      return this.taskRepository.findOneBy({ id });
    }

    return this.taskRepository.save(this.taskRepository.create(entityData));
  }
}