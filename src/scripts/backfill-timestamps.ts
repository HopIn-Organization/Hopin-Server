import 'reflect-metadata';
import { AppDataSource } from '../database/data-source';
import { OnBoarding } from '../onboarding/onBoarding.entity';
import { Task } from '../task/task.entity';

// Backfills `onboarding.created_at` and `task.completed_at` for existing data.

async function backfill() {
  await AppDataSource.initialize();

  const onboardingRepo = AppDataSource.getRepository(OnBoarding);
  const taskRepo = AppDataSource.getRepository(Task);

  const onboardings = await onboardingRepo.find({
    relations: { tasks: { subtasks: true } },
    order: { tasks: { order: 'ASC', subtasks: { order: 'ASC' } } },
  });

  console.log(`Found ${onboardings.length} onboarding(s) to backfill.`);

  for (const ob of onboardings) {
    const rootTasks = (ob.tasks ?? [])
      .filter(t => !t.parent)
      .sort((a, b) => a.order - b.order);

    const totalEstimatedDays = rootTasks.reduce(
      (sum, t) => sum + (t.estimatedDays ?? 0),
      0
    );

    const bufferDays = 3;
    const daysAgo = totalEstimatedDays + bufferDays;
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);

    await onboardingRepo.update(ob.id, { createdAt });

    let cursor = new Date(createdAt);
    for (const task of rootTasks) {
      cursor = new Date(
        cursor.getTime() + (task.estimatedDays ?? 0) * 24 * 60 * 60 * 1000
      );

      if (task.isCompleted) {
        await taskRepo.update(task.id, { completedAt: cursor });
        console.log(
          `    Task #${task.id} "${task.title}": completedAt = ${cursor.toISOString()}`
        );

        const subtasks = (task.subtasks ?? []).filter(st => st.isCompleted);
        for (const st of subtasks) {
          await taskRepo.update(st.id, { completedAt: cursor });
        }
      } else {
        break;
      }
    }
  }

  console.log('\nBackfill complete.');
  await AppDataSource.destroy();
}

backfill().catch(err => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
