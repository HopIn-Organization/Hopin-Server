import { DeepPartial, Repository } from 'typeorm';
import { AppDataSource } from '../database/data-source';
import { Task } from './task.entity';

export interface SubtaskInput {
  id?: number;
  order?: number;
  title?: string;
  description?: string;
  estimatedDays?: number;
  isCompleted?: boolean;
  links?: string[];
}

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
  subtasks?: SubtaskInput[];
}

export class TaskRepository {
  private taskRepository: Repository<Task>;

  constructor() {
    this.taskRepository = AppDataSource.getRepository(Task);
  }

  async createTasks(data: DeepPartial<Task>[]): Promise<Task[]> {
    const tasks = this.taskRepository.create(data);
    return this.taskRepository.save(tasks);
  }

  async completeTask(taskId: number): Promise<Task | null> {
    await this.taskRepository.update(taskId, { isCompleted: true });
    return this.taskRepository.findOne({ where: { id: taskId }, relations: { subtasks: true } });
  }

  async deleteTask(taskId: number): Promise<boolean> {
    const result = await this.taskRepository.delete(taskId);
    return (result.affected ?? 0) > 0;
  }

  async upsertTask(data: UpsertTaskInput): Promise<Task | null> {
    return AppDataSource.transaction(async (manager) => {
      const { id, onboardingId, parentId, subtasks, ...rest } = data;
      const taskRepo = manager.getRepository(Task);

      const entityData: DeepPartial<Task> = { ...rest };
      if (onboardingId !== undefined) entityData.onboarding = { id: onboardingId };
      if (parentId !== undefined) entityData.parent = parentId != null ? { id: parentId } : undefined;

      let taskId: number;
      if (id !== undefined) {
        await taskRepo.update(id, entityData);
        const exists = await taskRepo.findOneBy({ id });
        if (!exists) return null;
        taskId = id;
      } else {
        const created = await taskRepo.save(taskRepo.create(entityData));
        taskId = created.id;
      }

      if (subtasks !== undefined) {
        const existing = await taskRepo.find({ where: { parent: { id: taskId } }, select: ['id'] });
        const existingIds = existing.map(s => s.id);
        const incomingIds = new Set(subtasks.filter(s => s.id !== undefined).map(s => s.id!));

        const toDelete = existingIds.filter(sid => !incomingIds.has(sid));
        if (toDelete.length > 0) {
          await taskRepo.delete(toDelete);
        }

        for (const sub of subtasks) {
          const subData: DeepPartial<Task> = { ...sub, parent: { id: taskId } };
          if (sub.id !== undefined) {
            await taskRepo.update(sub.id, subData);
          } else {
            await taskRepo.save(taskRepo.create(subData));
          }
        }
      }

      return taskRepo.findOne({ where: { id: taskId }, relations: { subtasks: true } });
    });
  }
}