import { Task } from '../../task/task.entity';

const isSubtaskObject = (value: unknown): boolean => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    typeof item.title === 'string' &&
    typeof item.description === 'string' &&
    (item.isCompleted === undefined || typeof item.isCompleted === 'boolean') &&
    typeof item.estimatedDays === 'number' &&
    (item.links === undefined ||
      (Array.isArray(item.links) &&
        (item.links as unknown[]).every(l => typeof l === 'string')))
  );
};

const isTaskObject = (value: unknown): value is Task => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const task = value as Record<string, unknown>;

  return (
    typeof task.order === 'number' &&
    typeof task.title === 'string' &&
    typeof task.description === 'string' &&
    typeof task.estimatedDays === 'number' &&
    typeof task.isCompleted === 'boolean' &&
    (task.onboarding === undefined || typeof task.onboarding === 'object') &&
    (task.parent === undefined ||
      typeof task.parent === 'object' ||
      task.parent === null) &&
    (task.subtasks === undefined ||
      (Array.isArray(task.subtasks) &&
        (task.subtasks as unknown[]).every(isSubtaskObject))) &&
    (task.links === undefined ||
      task.links === null ||
      (Array.isArray(task.links) &&
        (task.links as unknown[]).every(l => typeof l === 'string')))
  );
};

export const isTaskArray = (value: unknown): value is Task[] =>
  Array.isArray(value) && value.every(isTaskObject);
