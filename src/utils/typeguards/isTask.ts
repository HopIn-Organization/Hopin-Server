import { Task } from '../../task/task.entity';

const isTaskObject = (value: unknown): value is Task => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const task = value as Record<string, unknown>;

  return (
    typeof task.onboardingId === 'number' &&
    typeof task.order === 'number' &&
    typeof task.title === 'string' &&
    typeof task.description === 'string' &&
    typeof task.estimatedDays === 'number' &&
    typeof task.isCompleted === 'boolean' &&
    (task.onboarding === undefined || typeof task.onboarding === 'object') &&
    (task.parent === undefined ||
      typeof task.parent === 'object' ||
      task.parent === null) &&
    (task.subtasks === undefined || Array.isArray(task.subtasks)) &&
    (task.links === undefined ||
      task.links === null ||
      (Array.isArray(task.links) &&
        (task.links as unknown[]).every((l) => typeof l === 'string')))
  );
};

export const isTaskArray = (value: unknown): value is Task[] =>
  Array.isArray(value) && value.every(isTaskObject);
