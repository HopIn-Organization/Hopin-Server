import { Router } from 'express';
import { taskController } from './task.controller';
import { requireProjectAdmin } from '../projectMember/projectMember.middleware';

const router = Router();

router.put('/', requireProjectAdmin, taskController.upsertTask);
router.delete('/:taskId', requireProjectAdmin, taskController.deleteTask);
router.patch('/:taskId/complete', taskController.completeTask);

export default router;
