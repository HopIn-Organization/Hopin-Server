import { Router } from 'express';
import { taskController } from './task.controller';

const router = Router();

router.patch('/:taskId/complete', taskController.completeTask);

export default router;
